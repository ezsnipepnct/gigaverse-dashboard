"use client"

import React from 'react'
import DungeonBattle, { GameState } from './DungeonBattle'

export interface StreamSnapshot {
  index: number
  gameState?: GameState | null
  lastMove?: string
  type?: 'round' | 'loot'
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

  return (
    <div className="bg-black/30 border border-cyan-400/30 p-4 rounded h-full">
      <h4 className="text-cyan-300 font-mono font-semibold mb-3">MOVE STREAM</h4>
      <div className="space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {snapshots.length === 0 ? (
          <div className="text-center text-sm text-white/40 py-8">No moves yet</div>
        ) : (
          snapshots.slice(-50).reverse().map((s) => (
            <div key={s.index} className="">
              {s.type === 'loot' || s.loot ? (
                <div className="flex items-start gap-3 px-3 py-2 rounded border border-emerald-400/30 bg-emerald-500/10">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1" />
                  <div className="flex-1">
                    <div className="text-emerald-300 font-mono text-xs mb-1">LOOT ACQUIRED</div>
                    <div className="text-white/90 font-mono text-sm">
                      {s.lootDescription || getLootDescription(s.loot)}
                    </div>
                  </div>
                </div>
              ) : (
                s.gameState ? (
                  <DungeonBattle gameState={s.gameState} lastMove={s.lastMove || ''} isCalculating={false} />
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


