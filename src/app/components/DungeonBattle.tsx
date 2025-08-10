"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Sword, Shield, Wand2 } from 'lucide-react'

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

const MovePill: React.FC<{ label: 'rock' | 'paper' | 'scissor'; dmg: number; def: number; charge: number; isCounter?: boolean }>
= ({ label, dmg, def, charge, isCounter = false }) => {
  // Unified color for all move pills to reduce visual noise
  const colorMap: Record<string, string> = {
    rock: 'from-cyan-500/20 to-cyan-400/10 text-cyan-300',
    paper: 'from-cyan-500/20 to-cyan-400/10 text-cyan-300',
    scissor: 'from-cyan-500/20 to-cyan-400/10 text-cyan-300',
  }
  const Icon = label === 'rock' ? Sword : label === 'paper' ? Shield : Wand2
  const segments = [1, 2, 3].map((i) => (
    <span key={i} className={`h-1.5 w-4 rounded-sm ${i <= charge ? 'bg-current/90' : 'bg-white/10'}`} />
  ))
  return (
    <div className={`w-full overflow-hidden rounded-md border ${isCounter ? 'border-emerald-400/50' : 'border-white/10'} bg-gradient-to-br ${colorMap[label] || 'from-white/10 to-white/5 text-white/70'} px-3 py-2 whitespace-nowrap leading-none space-y-1` }>
      <div className="flex items-center justify-between">
        <span className="uppercase tracking-wide text-[11px] flex items-center gap-2">
          <Icon className="w-4 h-4" /> {label}
          {isCounter && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-[10px]">COUNTERS</span>
          )}
        </span>
        <div className="flex gap-1 shrink-0">{segments}</div>
      </div>
      <div className="text-white/90 font-mono">
        <span className="mr-4 text-[12px] tracking-wide">DMG <span className="text-lg font-semibold">{dmg}</span></span>
        <span className="text-[12px] tracking-wide">DEF <span className="text-lg font-semibold">{def}</span></span>
      </div>
    </div>
  )
}

const StatBar: React.FC<{ label: string; value: number; max: number; color: string; delta?: number }>
= ({ label, value, max, color, delta = 0 }) => {
  const pct = clampPercent(value, max)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span>{label}</span>
        <span className="text-white/70 flex items-center gap-2">
          {value}/{max}
          {delta !== 0 && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${delta > 0 ? 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30' : 'text-rose-300 bg-rose-500/10 border-rose-400/30'}`}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
        </span>
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

function getCounterMove(move: 'rock' | 'paper' | 'scissor'): 'rock' | 'paper' | 'scissor' {
  if (move === 'rock') return 'paper'
  if (move === 'paper') return 'scissor'
  return 'rock'
}

function getStrongestAvailable(stats: Record<string,{damage:number;shield:number}>, charges: Charges): 'rock' | 'paper' | 'scissor' {
  const available: Array<'rock'|'paper'|'scissor'> = ['rock','paper','scissor'].filter(m => (charges as any)[m] > 0) as any
  let best: 'rock'|'paper'|'scissor' = available[0] || 'rock'
  let bestDmg = -Infinity
  for (const m of available) {
    const dmg = (stats as any)[m]?.damage ?? 0
    if (dmg > bestDmg) { bestDmg = dmg; best = m }
  }
  return best
}

const DungeonBattle: React.FC<Props> = ({ gameState, lastMove, isCalculating }) => {
  // Track previous values for delta badges (per component instance)
  const prevRef = useRef<{ pHp:number; pSh:number; eHp:number; eSh:number } | null>(null)
  const [deltas, setDeltas] = useState({ pHp: 0, pSh: 0, eHp: 0, eSh: 0 })

  useEffect(() => {
    const prev = prevRef.current
    if (prev) {
      setDeltas({
        pHp: gameState.player_health - prev.pHp,
        pSh: gameState.player_shield - prev.pSh,
        eHp: gameState.enemy_health - prev.eHp,
        eSh: gameState.enemy_shield - prev.eSh,
      })
    }
    prevRef.current = {
      pHp: gameState.player_health,
      pSh: gameState.player_shield,
      eHp: gameState.enemy_health,
      eSh: gameState.enemy_shield,
    }
  }, [gameState.player_health, gameState.player_shield, gameState.enemy_health, gameState.enemy_shield])

  // Counter hint: highlight the player move that counters the enemy strongest available move
  const enemyStrongest = useMemo(() => getStrongestAvailable(gameState.enemy_move_stats, gameState.enemy_charges), [gameState.enemy_move_stats, gameState.enemy_charges])
  const counterToEnemy = useMemo(() => getCounterMove(enemyStrongest), [enemyStrongest])

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
            <StatBar label="Health" value={gameState.player_health} max={gameState.player_max_health} color="bg-gradient-to-r from-emerald-500 to-emerald-300" delta={deltas.pHp} />
            <StatBar label="Shield" value={gameState.player_shield} max={gameState.player_max_shield} color="bg-gradient-to-r from-cyan-500 to-cyan-300" delta={deltas.pSh} />
            <div className="grid grid-cols-3 gap-2">
              {(['rock','paper','scissor'] as const).map(key => (
                <MovePill
                  key={key}
                  label={key}
                  dmg={gameState.player_move_stats[key].damage}
                  def={gameState.player_move_stats[key].shield}
                  charge={gameState.player_charges[key]}
                  isCounter={key === counterToEnemy}
                />
              ))}
            </div>
          </div>

          {/* Enemy */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-rose-300 tracking-wide text-xs uppercase">Enemy</span>
              <MiniTag tone="red">Monster</MiniTag>
            </div>
            <StatBar label="Health" value={gameState.enemy_health} max={gameState.enemy_max_health} color="bg-gradient-to-r from-emerald-500 to-emerald-300" delta={deltas.eHp} />
            <StatBar label="Shield" value={gameState.enemy_shield} max={gameState.enemy_max_shield} color="bg-gradient-to-r from-cyan-500 to-cyan-300" delta={deltas.eSh} />
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


