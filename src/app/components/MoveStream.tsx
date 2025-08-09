"use client"

import React, { useEffect, useState } from 'react'
import DungeonBattle, { GameState } from './DungeonBattle'
import ItemIcon from './ItemIcon'
import { itemMetadataService } from '@/app/services/itemMetadata'

export interface StreamSnapshot {
  index: number
  gameState?: GameState | null
  lastMove?: string
  type?: 'round' | 'upgrade' | 'item' | 'separator'
  roundNumber?: number
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
}

const MoveStream: React.FC<{ snapshots: StreamSnapshot[] }> = ({ snapshots }) => {
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
        {itemId ? <ItemIcon itemId={itemId} size="small" showRarity /> : <div className="w-8 h-8 bg-gray-700 rounded" />}
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

  return (
    <div className="bg-black/30 border border-cyan-400/30 p-4 rounded h-full">
      <h4 className="text-cyan-300 font-mono font-semibold mb-3">MOVE STREAM</h4>
      <div className="space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {snapshots.length === 0 ? (
          <div className="text-center text-sm text-white/40 py-8">No moves yet</div>
        ) : (
          snapshots.slice(-50).reverse().map((s) => (
            <div key={s.index} className="">
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
              ) : (
                s.gameState ? (
                  <div>
                    {s.type === 'round' && (
                      <div className="mb-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/70 text-xs font-mono">ROUND {s.roundNumber ?? ''}</span>
                        {s.lastMove && (
                          <span className="text-cyan-300 text-xs font-mono">Move: {s.lastMove}</span>
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


