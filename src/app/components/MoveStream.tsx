"use client"

import React from 'react'
import DungeonBattle, { GameState } from './DungeonBattle'

export interface StreamSnapshot {
  index: number
  gameState: GameState
  lastMove?: string
}

const MoveStream: React.FC<{ snapshots: StreamSnapshot[] }> = ({ snapshots }) => {
  return (
    <div className="bg-black/30 border border-cyan-400/30 p-4 rounded h-full">
      <h4 className="text-cyan-300 font-mono font-semibold mb-3">MOVE STREAM</h4>
      <div className="space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {snapshots.length === 0 ? (
          <div className="text-center text-sm text-white/40 py-8">No moves yet</div>
        ) : (
          snapshots.slice(-20).reverse().map((s) => (
            <div key={s.index} className="">
              <DungeonBattle gameState={s.gameState} lastMove={s.lastMove || ''} isCalculating={false} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default MoveStream


