"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import DungeonBattle, { GameState } from './DungeonBattle'
import ItemIcon from './ItemIcon'
import { itemMetadataService } from '@/app/services/itemMetadata'
import { Heart, Shield, Sword, Scissors } from 'lucide-react'

export interface StreamSnapshot {
  index: number
  gameState?: GameState | null
  lastMove?: string
  type?: 'round' | 'upgrade' | 'item' | 'separator' | 'loot_options' | 'mcts'
  roundNumber?: number
  floor?: number
  room?: number
  // Round metadata
  enemyMove?: string
  result?: 'win' | 'lose' | 'tie' | string
  pre?: {
    player_health: number; player_shield: number; enemy_health: number; enemy_shield: number
  }
  post?: {
    player_health: number; player_shield: number; enemy_health: number; enemy_shield: number
  }
  loot?: {
    id?: number
    amount?: number
    rarity?: number
    gearInstanceId?: string
    boonTypeString?: string
    selectedVal1?: number
    selectedVal2?: number
    name?: string
  }
  lootDescription?: string
  lootOptions?: Array<any>
  selectedIndex?: number
  // For MCTS decision snapshots
  engine?: 'python' | 'node'
  analysis?: {
    timeMs?: number
    strongestEnemyMove?: string
    strongestEnemyDamage?: number
    counterToStrongest?: string
    threatLevel?: number
    charges?: { rock: number; paper: number; scissor: number }
    stats?: { [k: string]: { damage: number; shield: number } }
    killMoves?: { [k: string]: boolean }
    offenseOrder?: string[]
    defenseOrder?: string[]
  }
}

const MoveStream: React.FC<{ snapshots: StreamSnapshot[]; onSelectSnapshot?: (snap: StreamSnapshot) => void }> = ({ snapshots, onSelectSnapshot }) => {
  const [filter, setFilter] = useState<'all' | 'round' | 'upgrade' | 'item' | 'loot' | 'decision'>('all')
  const [reviewOpen, setReviewOpen] = useState<'upgrades' | 'heals' | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrolledUp, setScrolledUp] = useState(false)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
      setScrolledUp(!nearBottom)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
  const filtered = snapshots.filter(s => {
    if (filter === 'all') return true
    if (filter === 'round') return s.type === 'round'
    if (filter === 'upgrade') return s.type === 'upgrade'
    if (filter === 'item') return s.type === 'item'
    if (filter === 'loot') return s.type === 'loot_options'
    if (filter === 'decision') return s.type === 'mcts'
    return true
  })
  const getLootDescription = (loot: any): string => {
    if (!loot) return 'Unknown loot'
    const boonType = loot.boonTypeString || 'Unknown'
    const val1 = loot.selectedVal1 || 0
    const val2 = loot.selectedVal2 || 0
    switch (boonType) {
      case 'UpgradeRock': return `Rock +${val1 + val2} ATK/DEF`
      case 'UpgradePaper': return `Paper +${val1 + val2} ATK/DEF`
      case 'UpgradeScissor': return `Scissor +${val1 + val2} ATK/DEF`
      case 'AddMaxHealth': return `+${val1} Max Health`
      case 'AddMaxShield':
      case 'AddMaxArmor': return `+${val1} Max Shield`
      case 'Heal': return `Heal ${val1} HP`
      case 'Shield': return `+${val1} Shield`
      default: return boonType
    }
  }

  const ItemRow: React.FC<{ itemId?: number; amount?: number }> = ({ itemId, amount }) => {
    const [name, setName] = useState<string>(itemId ? `Item ${itemId}` : 'Unknown')
    const [rarityColor, setRarityColor] = useState<string>('gray')

    useEffect(() => {
      let mounted = true
      if (!itemId) return
      itemMetadataService.getItem(itemId).then(meta => {
        if (!mounted || !meta) return
        setName(meta.name || `Item ${itemId}`)
        setRarityColor(meta.rarityColor || 'gray')
      }).catch(() => {})
      return () => { mounted = false }
    }, [itemId])

    return (
      <div className="flex items-center gap-3">
        {itemId ? <ItemIcon itemId={itemId} size="small" showRarity hideSoulboundLock /> : <div className="w-8 h-8 bg-gray-700 rounded" />}
        <div className="font-mono text-sm">
          <span className="text-white/90">{name}</span>
          {typeof amount === 'number' && (
            <span className="text-cyan-300 ml-2">x{amount}</span>
          )}
        </div>
        <div className={`ml-auto text-xs rounded px-2 py-0.5 border border-white/10 text-white/70`}>
          {rarityColor}
        </div>
      </div>
    )
  }

  // Aggregates for summary bar
  const aggregates = useMemo(() => {
    let totalItems = 0
    const itemTotals: Record<number, number> = {}
    const upgradeTotals: Record<string, {v1:number; v2:number}> = {}
    let heals = 0
    let maxHp = 0
    let maxShield = 0
    for (const s of snapshots) {
      if (s.type === 'item' && s.loot?.id && typeof s.loot.amount === 'number') {
        totalItems += s.loot.amount
        itemTotals[s.loot.id] = (itemTotals[s.loot.id] || 0) + s.loot.amount
      } else if (s.type === 'upgrade') {
        let boon = s.loot?.boonTypeString
        let v1 = s.loot?.selectedVal1 || 0
        let v2 = s.loot?.selectedVal2 || 0
        // Fallback: parse from text if data missing
        if (!boon && s.lootDescription) {
          const text = s.lootDescription
          const healMatch = text.match(/heal\s*\+?(\d+)/i)
          const hpMatch = text.match(/max\s*health|max\s*hp/i) && text.match(/\+(\d+)/)
          const shMatch = text.match(/max\s*shield|max\s*armor/i) && text.match(/\+(\d+)/)
          const rockMatch = text.match(/rock[^\d]*\+(\d+)/i)
          const paperMatch = text.match(/paper[^\d]*\+(\d+)/i)
          const scissorMatch = text.match(/scissor[^\d]*\+(\d+)/i)
          if (healMatch) { boon = 'Heal'; v1 = parseInt(healMatch[1] || '0', 10) }
          else if (hpMatch) { boon = 'AddMaxHealth'; v1 = parseInt((hpMatch as any)[1] || '0', 10) }
          else if (shMatch) { boon = 'AddMaxShield'; v1 = parseInt((shMatch as any)[1] || '0', 10) }
          else if (rockMatch) { boon = 'UpgradeRock'; v1 = parseInt(rockMatch[1] || '0', 10) }
          else if (paperMatch) { boon = 'UpgradePaper'; v1 = parseInt(paperMatch[1] || '0', 10) }
          else if (scissorMatch) { boon = 'UpgradeScissor'; v1 = parseInt(scissorMatch[1] || '0', 10) }
        }
        if (boon === 'Heal') heals += v1
        else if (boon === 'AddMaxHealth') maxHp += v1
        else if (boon === 'AddMaxShield' || boon === 'AddMaxArmor') maxShield += v1
        else if (boon) {
          const key = boon
          upgradeTotals[key] = upgradeTotals[key] || { v1:0, v2:0 }
          upgradeTotals[key].v1 += v1
          upgradeTotals[key].v2 += v2
        }
      } else if (s.type === 'loot_options' && typeof s.selectedIndex === 'number' && Array.isArray(s.lootOptions)) {
        const opt = s.lootOptions[s.selectedIndex]
        if (opt) {
          let boon: string | undefined = opt.boonTypeString
          const v1 = opt.selectedVal1 || 0
          const v2 = opt.selectedVal2 || 0
          if (boon === 'Heal') heals += v1
          else if (boon === 'AddMaxHealth') maxHp += v1
          else if (boon === 'AddMaxShield' || boon === 'AddMaxArmor') maxShield += v1
          else if (boon) {
            const key = boon
            upgradeTotals[key] = upgradeTotals[key] || { v1:0, v2:0 }
            upgradeTotals[key].v1 += v1
            upgradeTotals[key].v2 += v2
          }
        }
      }
    }
    return { totalItems, itemTotals, upgradeTotals, heals, maxHp, maxShield }
  }, [snapshots])

  return (
    <div className="bg-black/30 border border-cyan-400/30 p-4 rounded h-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-cyan-300 font-mono font-semibold">MOVE STREAM</h4>
        <div className="flex gap-1">
          {[
            {k:'all', label:'All'},
            {k:'round', label:'Rounds'},
            {k:'upgrade', label:'Upgrades'},
            {k:'item', label:'Items'},
            {k:'loot', label:'Loot'},
            {k:'decision', label:'Decisions'}
          ].map((f: any) => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`px-2 py-0.5 rounded border text-[11px] font-mono ${filter===f.k ? 'border-cyan-400/60 text-cyan-300' : 'border-white/10 text-white/60 hover:text-white/80'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2 sticky top-0 z-10 bg-black/60 backdrop-blur-sm border-b border-white/10 pt-2 pb-3">
        <div className="px-3 py-2 rounded border border-white/15 bg-black/30 font-mono text-xs text-white/80 cursor-pointer" onClick={() => setFilter('item')} title="Filter: Items">
          <div className="text-white/70 mb-1">ITEMS</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(aggregates.itemTotals)
              .sort((a,b)=> (b[1] as number) - (a[1] as number))
              .slice(0,10)
              .map(([id, qty]) => (
                <div key={id} className="flex items-center gap-2 px-2 py-1 rounded border border-white/10 bg-black/20">
                  <ItemIcon itemId={parseInt(id)} size="small" showRarity hideSoulboundLock />
                  <span className="text-white/80">x{qty as number}</span>
                </div>
              ))}
            {Object.keys(aggregates.itemTotals).length === 0 && <span className="text-white/60">None</span>}
          </div>
        </div>
        <div className="px-3 py-2 rounded border border-white/15 bg-black/30 font-mono text-xs text-white/80 cursor-pointer" onClick={() => { setFilter('upgrade'); setReviewOpen('upgrades') }} title="Click to review loot choices">
          <div className="text-white/70 mb-1">UPGRADES</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(aggregates.upgradeTotals).map(([k, v]) => (
              <span key={k} className="px-2 py-0.5 rounded border border-white/10 text-white/80">
                {k.replace('Upgrade','')}: +{(v as any).v1}/+{(v as any).v2}
              </span>
            ))}
            {Object.keys(aggregates.upgradeTotals).length === 0 && <span className="text-white/60">None</span>}
          </div>
        </div>
        <div className="px-3 py-2 rounded border border-white/15 bg-black/30 font-mono text-xs text-white/80 cursor-pointer" onClick={() => { setFilter('loot'); setReviewOpen('heals') }} title="Click to review loot choices">
          <div className="text-white/70 mb-1">HEALS & MAX</div>
          <div className="flex gap-3">
            <span>Heal <span className="text-white/90">+{aggregates.heals}</span></span>
            <span>MaxHP <span className="text-white/90">+{aggregates.maxHp}</span></span>
            <span>MaxSH <span className="text-white/90">+{aggregates.maxShield}</span></span>
          </div>
        </div>
      </div>

      {/* Review Drawer */}
      {reviewOpen && (
        <div className="mb-3 p-3 rounded border border-white/12 bg-black/60">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white/90 font-mono text-sm tracking-wide">{reviewOpen === 'upgrades' ? 'UPGRADE PICKS' : 'HEAL/MAX PICKS'}</div>
            <button className="text-white/70 text-xs font-mono border border-white/20 px-2 py-0.5 rounded hover:bg-white/5" onClick={() => setReviewOpen(null)}>CLOSE</button>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {snapshots
              .filter(s => s.type === 'loot_options' && Array.isArray(s.lootOptions))
              .sort((a, b) => (a.index || 0) - (b.index || 0))
              .map((s, idx) => (
              <div key={`${s.index}-${idx}`} className="p-2.5 rounded border border-white/10 bg-black/50">
                <div className="text-sm text-white/85 font-mono font-semibold mb-2">Floor {(s as any).floor ?? ''} • Room {(s as any).room ?? ''}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(s.lootOptions || []).map((opt: any, i: number) => {
                    const boon = opt.boonTypeString
                    const v1 = opt.selectedVal1 || 0
                    const v2 = opt.selectedVal2 || 0
                    const label = boon === 'Heal' ? `Heal +${v1}` : boon === 'AddMaxHealth' ? `MaxHP +${v1}` : (boon === 'AddMaxArmor' || boon === 'AddMaxShield') ? `MaxSH +${v1}` : `${(boon||'').replace('Upgrade','')} +${v1}/+${v2}`
                    const chosen = s.selectedIndex === i
                    const isUpgrade = !!boon && boon.startsWith('Upgrade')
                    const isHealMax = !!boon && ['Heal','AddMaxHealth','AddMaxArmor','AddMaxShield'].includes(boon)
                    // Show all three options always; dim the ones that don't match the current review
                    const dim = reviewOpen === 'upgrades' ? !isUpgrade : !isHealMax
                    const IconEl = (() => {
                      if (boon === 'Heal') return <Heart className="w-4 h-4 text-rose-300" />
                      if (boon === 'AddMaxHealth') return <Heart className="w-4 h-4 text-violet-300" />
                      if (boon === 'AddMaxShield' || boon === 'AddMaxArmor') return <Shield className="w-4 h-4 text-cyan-300" />
                      if (boon === 'UpgradeRock') return <Sword className="w-4 h-4 text-white/80" />
                      if (boon === 'UpgradePaper') return <Shield className="w-4 h-4 text-white/80" />
                      if (boon === 'UpgradeScissor') return <Scissors className="w-4 h-4 text-white/80" />
                      return <Sword className="w-4 h-4 text-white/60" />
                    })()
                    return (
                      <div
                        key={i}
                        className={`group px-2.5 py-1.5 rounded-md border text-[12px] font-mono flex items-center gap-2 transition-colors ${chosen ? 'border-emerald-400/70 bg-emerald-500/10 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.4),0_0_8px_rgba(16,185,129,0.15)] text-emerald-200' : 'border-white/12 bg-black/40 text-white/85 hover:border-white/20'} ${dim ? 'opacity-50' : ''}`}
                      >
                        <span className="shrink-0">{IconEl}</span>
                        <span className="truncate leading-5">{label}</span>
                        {chosen && (
                          <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] border border-emerald-400/60 bg-emerald-500/10 text-emerald-200">PICKED</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div ref={scrollRef} className="relative space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {scrolledUp && (
          <button
            onClick={() => { const el = scrollRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }) }}
            className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-mono border border-cyan-400/40 text-cyan-300 bg-black/60 backdrop-blur hover:bg-black/70"
          >Jump to latest</button>
        )}
        {filtered.length === 0 ? (
          <div className="text-center text-sm text-white/40 py-8">No moves yet</div>
        ) : (
          filtered.slice(-100).reverse().map((s) => (
            <div key={s.index} className="relative pl-3" onClick={() => onSelectSnapshot && onSelectSnapshot(s)}>
              {/* Left rail */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded ${
                s.type === 'round' ? 'bg-white/30' :
                s.type === 'item' ? 'bg-cyan-400/40' :
                s.type === 'upgrade' ? 'bg-emerald-400/40' :
                s.type === 'loot_options' ? 'bg-purple-400/40' :
                s.type === 'mcts' ? 'bg-amber-400/40' : 'bg-white/10'
              }`} />
              {s.type === 'upgrade' ? (
                <div className="flex items-start gap-3 px-3 py-2 rounded border border-emerald-400/30 bg-emerald-500/10">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1" />
                  <div className="flex-1">
                    <div className="text-emerald-300 font-mono text-xs mb-1">UPGRADE APPLIED</div>
                    <div className="text-white/90 font-mono text-sm">
                      {s.lootDescription || getLootDescription(s.loot)}
                    </div>
                  </div>
                </div>
              ) : s.type === 'item' ? (
                <div className="flex items-start gap-3 px-3 py-2 rounded border border-cyan-400/30 bg-cyan-500/10">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1" />
                  <div className="flex-1">
                    <div className="text-cyan-300 font-mono text-xs mb-1">ITEM ACQUIRED</div>
                    <ItemRow itemId={s.loot?.id} amount={s.loot?.amount} />
                  </div>
                </div>
              ) : s.type === 'separator' ? (
                <div className="relative px-2 py-1 my-2">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="absolute inset-x-0 -top-2 flex justify-center">
                    <span className="px-2 text-xs font-mono text-white/60 bg-black/80">{s.lootDescription || '—'}</span>
                  </div>
                </div>
              ) : s.type === 'loot_options' ? (
                <div className="px-3 py-2 rounded border border-purple-400/30 bg-purple-500/10">
                  <div className="text-purple-300 font-mono text-xs mb-2">LOOT OPTIONS</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {(s.lootOptions || []).map((opt: any, i: number) => (
                      <div
                        key={i}
                        className={`p-2 rounded border text-xs font-mono transition-colors ${s.selectedIndex === i ? 'border-emerald-400/70 bg-emerald-500/10' : 'border-white/15 bg-black/30'}`}
                      >
                        <div className="text-white/80">{getLootDescription(opt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : s.type === 'mcts' ? (
                <div className="px-3 py-2 rounded border border-amber-400/30 bg-amber-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-amber-300 font-mono text-xs">MOVE DECISION</div>
                    <div className="flex items-center gap-2">
                      {s.engine && (
                        <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/70 text-[10px] font-mono">{s.engine.toUpperCase()}</span>
                      )}
                      {s.analysis?.timeMs ? (
                        <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/60 text-[10px] font-mono">{s.analysis.timeMs} ms</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="font-mono text-sm text-white/90 mb-2">
                    Selected: <span className="text-amber-300 uppercase">{s.lastMove}</span>
                  </div>
                  {s.analysis && (
                    <div className="space-y-2">
                      <div className="text-[11px] text-white/70 font-mono">
                        Enemy threat: <span className="text-white/90 uppercase">{s.analysis.strongestEnemyMove}</span> ({s.analysis.strongestEnemyDamage}) • Counter: <span className="text-white/90 uppercase">{s.analysis.counterToStrongest}</span> • Threat lvl: {(s.analysis.threatLevel || 0).toFixed(2)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {(['rock','paper','scissor'] as const).map((mv) => (
                          <div key={mv} className={`p-2 rounded border text-xs font-mono ${s.lastMove === mv ? 'border-amber-400/70 bg-amber-500/10' : 'border-white/15 bg-black/20'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white/80 uppercase">{mv}</span>
                              <span className="text-white/60">CHG {s.analysis?.charges?.[mv] ?? '-'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/80">
                              <span>DMG {s.analysis?.stats?.[mv]?.damage ?? '-'}</span>
                              <span>DEF {s.analysis?.stats?.[mv]?.shield ?? '-'}</span>
                              {s.analysis?.killMoves?.[mv] && (
                                <span className="ml-auto px-1.5 py-0.5 rounded border border-rose-400/40 text-rose-300">KILL</span>
                              )}
                              {s.analysis?.counterToStrongest === mv && (
                                <span className="ml-auto px-1.5 py-0.5 rounded border border-emerald-400/40 text-emerald-300">COUNTER</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                s.gameState ? (
                  <div>
                    {s.type === 'round' && (
                      <div className="mb-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/70 text-xs font-mono">ROUND {s.roundNumber ?? ''}</span>
                        {s.lastMove && (
                          <span className="text-cyan-300 text-xs font-mono">You: {s.lastMove.toUpperCase()}</span>
                        )}
                        {s.enemyMove && (
                          <span className="text-rose-300 text-xs font-mono">Enemy: {s.enemyMove.toUpperCase()}</span>
                        )}
                        {s.result && (
                          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${s.result==='win' ? 'border-emerald-400/50 text-emerald-300' : s.result==='lose' ? 'border-rose-400/50 text-rose-300' : 'border-yellow-400/50 text-yellow-300'}`}>{String(s.result).toUpperCase()}</span>
                        )}
                        {(s.pre && s.post) && (
                          <span className="text-[11px] text-white/70 font-mono ml-2">
                            HP Δ {s.post.player_health - s.pre.player_health} / {s.post.enemy_health - s.pre.enemy_health} • SH Δ {s.post.player_shield - s.pre.player_shield} / {s.post.enemy_shield - s.pre.enemy_shield}
                          </span>
                        )}
                      </div>
                    )}
                    <DungeonBattle gameState={s.gameState} lastMove={s.lastMove || ''} isCalculating={false} />
                  </div>
                ) : null
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default MoveStream


