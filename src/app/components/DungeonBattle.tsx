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

export interface RoundResult {
  playerMove: string
  enemyMove: string
  outcome: string
  result: string
}

interface PotionMeta {
  itemId: number
  name: string
  type: 'health' | 'charge' | 'damage' | 'defense' | 'special' | string
  heal?: number
  balance?: number
}

interface Props {
  gameState: GameState
  lastMove: string
  isCalculating: boolean
  roundHistory: RoundResult[]
  selectedPotions: number[]
  availablePotions: PotionMeta[]
}

const clampPercent = (cur: number, max: number) => Math.max(0, Math.min(100, (cur / Math.max(max, 1)) * 100))

const MovePill: React.FC<{ label: string; dmg: number; def: number; charge: number }> = ({ label, dmg, def, charge }) => {
  const colorMap: Record<string, string> = {
    rock: 'from-rose-500/30 to-rose-400/10 text-rose-300',
    paper: 'from-cyan-500/30 to-cyan-400/10 text-cyan-300',
    scissor: 'from-amber-500/30 to-amber-400/10 text-amber-300',
  }
  const dots = [1, 2, 3].map((i) => (
    <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= charge ? 'bg-current' : 'bg-white/10'}`} />
  ))
  return (
    <div className={`rounded-md border border-white/10 bg-gradient-to-br ${colorMap[label] || 'from-white/10 to-white/5 text-white/70'} px-3 py-2 flex items-center justify-between` }>
      <div className="flex items-center gap-2 uppercase tracking-wide text-xs">
        <span>{label}</span>
        <div className="flex gap-1">{dots}</div>
      </div>
      <div className="text-[10px] opacity-80">
        <span className="mr-3">DMG: {dmg}</span>
        <span>DEF: {def}</span>
      </div>
    </div>
  )
}

const StatBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => {
  const pct = clampPercent(value, max)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-white/60">
        <span>{label}</span>
        <span className="text-white/80">{value}/{max}</span>
      </div>
      <div className="h-2 rounded-md bg-white/5 overflow-hidden">
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

const DungeonBattle: React.FC<Props> = ({ gameState, lastMove, isCalculating, roundHistory, selectedPotions, availablePotions }) => {
  const getPotionById = (id: number) => availablePotions.find(p => p.itemId === id)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Primary panel */}
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-white/10 bg-black/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MiniTag tone="cyan">FLOOR {gameState.current_floor}</MiniTag>
              <MiniTag tone="yellow">ROOM {gameState.current_room}</MiniTag>
            </div>
            <MiniTag tone={isCalculating ? 'yellow' : 'green'}>{isCalculating ? 'Analyzing…' : 'Live'}</MiniTag>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Player */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-emerald-300 font-semibold tracking-wide">PLAYER</span>
                <MiniTag tone="green">HERO</MiniTag>
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
                <span className="text-rose-300 font-semibold tracking-wide">ENEMY</span>
                <MiniTag tone="red">MONSTER</MiniTag>
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

        {/* Analysis banner */}
        {(isCalculating || lastMove) && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-3 flex items-center justify-between">
            <div className="text-amber-300 text-sm font-mono">MCTS {isCalculating ? 'analyzing optimal move…' : 'selected move'}</div>
            {!isCalculating && lastMove && (
              <MiniTag tone="yellow">{lastMove.toUpperCase()}</MiniTag>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Combat history */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-cyan-300 font-semibold">COMBAT HISTORY</span>
            <MiniTag tone="cyan">Last {Math.min(10, roundHistory.length)}</MiniTag>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {roundHistory.length === 0 && (
              <div className="text-white/40 text-sm text-center py-6">No combats yet</div>
            )}
            {roundHistory.slice(-10).reverse().map((r, i) => (
              <div key={i} className="text-xs flex items-center justify-between rounded border border-white/5 bg-white/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-white/40">R{roundHistory.length - i}</span>
                  <span className="uppercase text-white/70">{r.playerMove}</span>
                  <span className="text-white/30">vs</span>
                  <span className="uppercase text-white/50">{r.enemyMove}</span>
                </div>
                <span className={
                  r.result === 'VICTORY' ? 'text-emerald-300' : r.result === 'DEFEAT' ? 'text-rose-300' : 'text-amber-300'
                }>
                  {r.result}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Potion quick view */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-violet-300 font-semibold">POTION BELT</span>
            <MiniTag tone="violet" >{selectedPotions.filter(p=>p!==0).length}/3</MiniTag>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {selectedPotions.map((id, idx) => {
              const p = id ? getPotionById(id) : undefined
              return (
                <div key={idx} className={`rounded-md border px-2 py-2 ${p ? 'border-violet-400/30 text-violet-200 bg-violet-500/5' : 'border-white/10 text-white/40 bg-white/5'}`}>
                  <div className="text-[10px] opacity-70">Slot {idx+1}</div>
                  <div className="truncate">{p ? p.name : 'Empty'}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DungeonBattle


