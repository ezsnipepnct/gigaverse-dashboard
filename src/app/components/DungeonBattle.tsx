"use client"

import React from 'react'

type Charges = { rock: number; paper: number; scissor: number }

export interface GameState {
  player_health: number
  player_shield: number
  enemy_health: number
  enemy_shield: number
  player_max_health: number
  player_max_shield: number
  enemy_max_health: number
  enemy_max_shield: number
  round_number: number
  current_floor: number
  current_room: number
  player_charges: Charges
  enemy_charges: Charges
  player_move_stats: { [key: string]: { damage: number; shield: number } }
  enemy_move_stats: { [key: string]: { damage: number; shield: number } }
}

interface Props {
  gameState: GameState
  lastMove: string
  isCalculating: boolean
}

const clampPercent = (cur: number, max: number) => Math.max(0, Math.min(100, (cur / Math.max(max, 1)) * 100))

const MovePill: React.FC<{ label: string; dmg: number; def: number; charge: number }> = ({ label, dmg, def, charge }) => {
  const colorMap: Record<string, string> = {
    rock: 'from-rose-500/30 to-rose-400/10 text-rose-300',
    paper: 'from-cyan-500/30 to-cyan-400/10 text-cyan-300',
    scissor: 'from-amber-500/30 to-amber-400/10 text-amber-300',
  }
  const segments = [1, 2, 3].map((i) => (
    <span key={i} className={`h-1.5 w-4 rounded-sm ${i <= charge ? 'bg-current/90' : 'bg-white/10'}`} />
  ))
  return (
    <div className={`w-full overflow-hidden rounded-md border border-white/10 bg-gradient-to-br ${colorMap[label] || 'from-white/10 to-white/5 text-white/70'} px-3 py-2 whitespace-nowrap leading-none space-y-1` }>
      <div className="flex items-center justify-between">
        <span className="uppercase tracking-wide text-[11px]">{label}</span>
        <div className="flex gap-1 shrink-0">{segments}</div>
      </div>
      <div className="text-[10px] text-white/80">
        <span className="mr-3">DMG {dmg}</span>
        <span>DEF {def}</span>
      </div>
    </div>
  )
}

const StatBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => {
  const pct = clampPercent(value, max)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span>{label}</span>
        <span className="text-white/70">{value}/{max}</span>
      </div>
      <div className="h-1.5 rounded bg-white/5 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const MiniTag: React.FC<{ children: React.ReactNode; tone?: 'green' | 'yellow' | 'red' | 'cyan' }>=({ children, tone='cyan' }) => {
  const toneMap: Record<string,string> = {
    green: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30',
    yellow:'text-amber-300 bg-amber-500/10 border-amber-400/30',
    red:   'text-rose-300 bg-rose-500/10 border-rose-400/30',
    cyan:  'text-cyan-300 bg-cyan-500/10 border-cyan-400/30',
  }
  return <span className={`px-2 py-0.5 rounded border text-[10px] ${toneMap[tone]}`}>{children}</span>
}

const DungeonBattle: React.FC<Props> = ({ gameState, lastMove, isCalculating }) => {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-white/10 bg-black/30 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MiniTag tone="cyan">FLOOR {gameState.current_floor}</MiniTag>
            <MiniTag tone="yellow">ROOM {gameState.current_room}</MiniTag>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isCalculating ? 'bg-amber-300' : 'bg-emerald-300'}`} />
            <span className="text-[11px] text-white/60 font-mono">{isCalculating ? 'Analyzing' : 'Live'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Player */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-emerald-300 tracking-wide text-xs uppercase">Player</span>
              <MiniTag tone="green">Hero</MiniTag>
            </div>
            <StatBar label="Health" value={gameState.player_health} max={gameState.player_max_health} color="bg-gradient-to-r from-emerald-500 to-emerald-300" />
            <StatBar label="Shield" value={gameState.player_shield} max={gameState.player_max_shield} color="bg-gradient-to-r from-cyan-500 to-cyan-300" />
            <div className="grid grid-cols-3 gap-2">
              {(['rock','paper','scissor'] as const).map(key => (
                <MovePill key={key} label={key} dmg={gameState.player_move_stats[key].damage} def={gameState.player_move_stats[key].shield} charge={gameState.player_charges[key]} />
              ))}
            </div>
          </div>

          {/* Enemy */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-rose-300 tracking-wide text-xs uppercase">Enemy</span>
              <MiniTag tone="red">Monster</MiniTag>
            </div>
            <StatBar label="Health" value={gameState.enemy_health} max={gameState.enemy_max_health} color="bg-gradient-to-r from-rose-500 to-rose-300" />
            <StatBar label="Shield" value={gameState.enemy_shield} max={gameState.enemy_max_shield} color="bg-gradient-to-r from-fuchsia-500 to-fuchsia-300" />
            <div className="grid grid-cols-3 gap-2">
              {(['rock','paper','scissor'] as const).map(key => (
                <MovePill key={key} label={key} dmg={gameState.enemy_move_stats[key].damage} def={gameState.enemy_move_stats[key].shield} charge={gameState.enemy_charges[key]} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {(isCalculating || lastMove) && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-2 flex items-center justify-between">
          <div className="text-amber-300 text-xs font-mono">MCTS {isCalculating ? 'analyzing optimal move…' : 'selected move'}</div>
          {!isCalculating && lastMove && (
            <MiniTag tone="yellow">{lastMove.toUpperCase()}</MiniTag>
          )}
        </div>
      )}
    </div>
  )
}

export default DungeonBattle


