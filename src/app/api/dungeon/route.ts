import { NextRequest, NextResponse } from 'next/server'

// Exact parameters adapted to align with CLI bot
const MAX_ROUNDS = 50
// Default iteration budget; we apply adaptive iterations per state later
const DEFAULT_MCTS_ITERATIONS = 25000
const LOOT_SIM_ITERATIONS = 100

// No hardcoded token - use token from Authorization header
// const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwidXNlciI6eyJfaWQiOiI2N2I5MjE1YTEwOGFlZGRiNDA5YTdlNzMiLCJ3YWxsZXRBZGRyZXNzIjoiMHhiMGQ5MGQ1MmM3Mzg5ODI0ZDRiMjJjMDZiY2RjY2Q3MzRlMzE2MmI3IiwidXNlcm5hbWUiOiIweGIwZDkwRDUyQzczODk4MjRENEIyMmMwNmJjZGNDRDczNEUzMTYyYjciLCJjYXNlU2Vuc2l0aXZlQWRkcmVzcyI6IjB4YjBkOTBENTJDNzM4OTgyNEQ0QjIyYzA2YmNkY0NENzM0RTMxNjJiNyIsIl9fdiI6MH0sImdhbWVBY2NvdW50Ijp7Im5vb2IiOnsiX2lkIjoiNjdiOTIxNzRlM2MzOWRjYTZmZGFkZjA5IiwiZG9jSWQiOiIyMTQyNCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiTEFTVF9UUkFOU0ZFUl9USU1FX0NJRCI6MTc0MDE4NTk2NCwiY3JlYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMi45NDZaIiwidXBkYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMy4xNjVaIiwiTEVWRUxfQ0lEIjoxLCJJU19OT09CX0NJRCI6dHJ1ZSwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJPV05FUl9DSUQiOiIweGIwZDkwZDUyYzczODk4MjRkNGIyMmMwNmJjZGNjZDczNGUzMTYyYjcifSwiYWxsb3dlZFRvQ3JlYXRlQWNjb3VudCI6dHJ1ZSwiY2FuRW50ZXJHYW1lIjp0cnVlLCJub29iUGFzc0JhbGFuY2UiOjAsImxhc3ROb29iSWQiOjczODg0LCJtYXhOb29iSWQiOjEwMDAwfSwiZXhwIjoxNzUwMTE2NDMxfQ.M26R6pDnFSSIbMXHa6kOhT_Hrjn3U7nkm_sGv0rY0uY"

const API_URL = "https://gigaverse.io/api/game/dungeon/action"
const STATE_URL = "https://gigaverse.io/api/game/dungeon/state"
const DEFAULT_ACTION_DATA = { "consumables": [], "itemId": 0, "index": 0, "isJuiced": false, "gearInstanceIds": [] }

// Floor and room tracking (matching CLI bot logic)
const ENEMIES_PER_FLOOR = 4
let currentFloor = 1
let currentRoom = 1
let enemyCount = 0

// Game state interface
interface GameState {
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
  player_charges: { [key: string]: number }
  enemy_charges: { [key: string]: number }
  player_move_stats: { [key: string]: { damage: number, shield: number } }
  enemy_move_stats: { [key: string]: { damage: number, shield: number } }
}

// MCTS Node class
class MCTSNode {
  state: GameState
  parent: MCTSNode | null
  move: string | null
  children: MCTSNode[]
  wins: number
  visits: number

  constructor(state: GameState, parent: MCTSNode | null = null, move: string | null = null) {
    this.state = JSON.parse(JSON.stringify(state)) // Deep clone
    this.parent = parent
    this.move = move
    this.children = []
    this.wins = 0
    this.visits = 0
  }

  isFullyExpanded(): boolean {
    const possibleMoves = getAvailableMoves(this.state.player_charges)
    return this.children.length === possibleMoves.length
  }
}

// Utility functions (exact from CLI bot)
function determineOutcome(playerMove: string, enemyMove: string): string {
  if (playerMove === enemyMove) return "tie"
  if ((playerMove === "rock" && enemyMove === "scissor") ||
      (playerMove === "scissor" && enemyMove === "paper") ||
      (playerMove === "paper" && enemyMove === "rock")) {
    return "player"
  }
  return "enemy"
}

function updateCharges(charges: { [key: string]: number }, chosenMove: string): { [key: string]: number } {
  const newCharges = { ...charges }
  if (newCharges[chosenMove] !== undefined) {
    newCharges[chosenMove] -= 1
  }
  
  for (const move in newCharges) {
    if (move !== chosenMove) {
      newCharges[move] = Math.min(newCharges[move] + 1, 3)
    }
  }
  
  return newCharges
}

function getAvailableMoves(charges: { [key: string]: number }): string[] {
  return Object.keys(charges).filter(move => charges[move] > 0)
}

function getEnemyStrongestAttack(enemyMoveStats: { [key: string]: { damage: number, shield: number } }): [string, number] {
  let strongestMove = "rock"
  let strongestDamage = 0
  
  for (const [move, stats] of Object.entries(enemyMoveStats)) {
    if (stats.damage > strongestDamage) {
      strongestDamage = stats.damage
      strongestMove = move
    }
  }
  
  return [strongestMove, strongestDamage]
}

function getEnemyStrongestAvailableAttack(
  enemyMoveStats: { [key: string]: { damage: number, shield: number } },
  enemyCharges: { [key: string]: number }
): [string, number] {
  let strongestMove: string | null = null
  let strongestDamage = -Infinity
  for (const [move, stats] of Object.entries(enemyMoveStats)) {
    const charge = enemyCharges?.[move] ?? 3
    if (charge > 0 && stats.damage > strongestDamage) {
      strongestDamage = stats.damage
      strongestMove = move
    }
  }
  if (strongestMove === null) {
    return getEnemyStrongestAttack(enemyMoveStats)
  }
  return [strongestMove, strongestDamage]
}

function getCounterMove(move: string): string {
  if (move === "rock") return "paper"
  if (move === "paper") return "scissor"
  if (move === "scissor") return "rock"
  return "rock"
}

// Apply round logic (exact from CLI bot)
function applyRound(state: GameState, playerMove: string, enemyMove: string): GameState {
  const newState = JSON.parse(JSON.stringify(state))
  
  // Update charges
  newState.player_charges = updateCharges(newState.player_charges, playerMove)
  newState.enemy_charges = updateCharges(newState.enemy_charges, enemyMove)
  
  const outcome = determineOutcome(playerMove, enemyMove)
  
  const pDamage = newState.player_move_stats[playerMove].damage
  const pShieldBonus = newState.player_move_stats[playerMove].shield
  const eDamage = newState.enemy_move_stats[enemyMove].damage
  const eShieldBonus = newState.enemy_move_stats[enemyMove].shield
  
  if (outcome === "player") {
    newState.player_shield = Math.min(newState.player_shield + pShieldBonus, newState.player_max_shield)
    if (newState.enemy_shield >= pDamage) {
      newState.enemy_shield -= pDamage
    } else {
      const remaining = pDamage - newState.enemy_shield
      newState.enemy_shield = 0
      newState.enemy_health = Math.max(newState.enemy_health - remaining, 0)
    }
  } else if (outcome === "enemy") {
    newState.enemy_shield = Math.min(newState.enemy_shield + eShieldBonus, newState.enemy_max_shield)
    if (newState.player_shield >= eDamage) {
      newState.player_shield -= eDamage
    } else {
      const remaining = eDamage - newState.player_shield
      newState.player_shield = 0
      newState.player_health = Math.max(newState.player_health - remaining, 0)
    }
  } else { // tie
    newState.player_shield = Math.min(newState.player_shield + pShieldBonus, newState.player_max_shield)
    newState.enemy_shield = Math.min(newState.enemy_shield + eShieldBonus, newState.enemy_max_shield)
    
    // Both attacks land
    if (newState.enemy_shield >= pDamage) {
      newState.enemy_shield -= pDamage
    } else {
      const remaining = pDamage - newState.enemy_shield
      newState.enemy_shield = 0
      newState.enemy_health = Math.max(newState.enemy_health - remaining, 0)
    }
    
    if (newState.player_shield >= eDamage) {
      newState.player_shield -= eDamage
    } else {
      const remaining = eDamage - newState.player_shield
      newState.player_shield = 0
      newState.player_health = Math.max(newState.player_health - remaining, 0)
    }
  }
  
  if (!isTerminal(newState)) {
    newState.round_number += 1
  }
  
  return newState
}

function isTerminal(state: GameState): boolean {
  return state.player_health <= 0 || state.enemy_health <= 0 || state.round_number >= MAX_ROUNDS
}

// MCTS implementation (exact parameters from CLI bot)
function selectBestChild(node: MCTSNode, explorationWeight: number = 1.4): MCTSNode {
  let bestScore = -Infinity
  let bestChild: MCTSNode | null = null
  
  const [strongestEnemyMove, strongestDamage] = getEnemyStrongestAvailableAttack(
    node.state.enemy_move_stats,
    node.state.enemy_charges
  )
  const counterToStrongest = getCounterMove(strongestEnemyMove)
  
  for (const child of node.children) {
    if (child.visits === 0) {
      return child
    }
    
    const winRate = child.wins / child.visits
    const exploration = Math.sqrt(Math.log(node.visits) / child.visits)
    
    // Heuristics aligned with CLI bot (charge-aware and threat scaled)
    let bonus = 0
    
    // Counter bonus scaled by threat level
    if (child.move === counterToStrongest) {
      const playerHealthRatio = node.state.player_health / node.state.player_max_health
      const effectiveHp = node.state.player_health + node.state.player_shield
      let threatLevel = effectiveHp > 0 ? (strongestDamage / effectiveHp) : 1.0
      if (strongestDamage < 5) threatLevel *= 0.5
      
      if (playerHealthRatio < 0.3) {
        bonus += 0.08 * Math.min(threatLevel, 1.0)
      } else {
        bonus += 0.04 * Math.min(threatLevel, 1.0)
      }
    }
    
    // Charge pressure penalty (stronger)
    const charge = node.state.player_charges[child.move!]
    if (charge === 1) {
      bonus -= 0.8 // Very high penalty for last charge (avoid depleting to -1)
    } else if (charge === 2) {
      bonus -= 0.3 // Significant penalty when dropping to 0
    }
    
    const score = winRate + explorationWeight * exploration + bonus
    
    if (score > bestScore) {
      bestScore = score
      bestChild = child
    }
  }
  
  return bestChild!
}

function expand(node: MCTSNode): MCTSNode {
  const tried = new Set(node.children.map(c => c.move))
  const possible = getAvailableMoves(node.state.player_charges)
  const untried = possible.filter(m => !tried.has(m))
  const candidateMoves = untried.length > 0 ? untried : possible

  // Identify killing moves that do not deplete to -1
  const killingMoves: string[] = []
  for (const m of candidateMoves) {
    const dmg = node.state.player_move_stats[m].damage
    if (dmg > node.state.enemy_shield + node.state.enemy_health && node.state.player_charges[m] > 1) {
      killingMoves.push(m)
    }
  }

  const [strongestEnemyMove, strongestDamage] = getEnemyStrongestAvailableAttack(
    node.state.enemy_move_stats,
    node.state.enemy_charges
  )
  const counterToStrongest = getCounterMove(strongestEnemyMove)

  const enemyHealthRatio = node.state.enemy_health / node.state.enemy_max_health
  const playerHealthRatio = node.state.player_health / node.state.player_max_health

  const highChargeMoves = candidateMoves.filter(m => node.state.player_charges[m] > 1)
  let move: string

  if (killingMoves.length > 0) {
    move = killingMoves[Math.floor(Math.random() * killingMoves.length)]
  } else if (highChargeMoves.length === 0) {
    const safe = candidateMoves.length > 0 ? candidateMoves : possible
    move = safe[Math.floor(Math.random() * safe.length)]
  } else if (enemyHealthRatio < 0.3) {
    const sorted = [...highChargeMoves].sort((a, b) => node.state.player_move_stats[b].damage - node.state.player_move_stats[a].damage)
    move = sorted[0] ?? highChargeMoves[0]
  } else if (playerHealthRatio < 0.3 && highChargeMoves.includes(counterToStrongest)) {
    move = counterToStrongest
  } else if (strongestDamage < 5) {
    const sorted = [...highChargeMoves].sort((a, b) => node.state.player_move_stats[b].damage - node.state.player_move_stats[a].damage)
    move = sorted[0] ?? highChargeMoves[0]
  } else if (highChargeMoves.includes(counterToStrongest)) {
    move = counterToStrongest
  } else {
    move = highChargeMoves[Math.floor(Math.random() * highChargeMoves.length)]
  }

  const enemyMoves = getAvailableMoves(node.state.enemy_charges)
  const enemyMove = enemyMoves[Math.floor(Math.random() * enemyMoves.length)] || 'rock'
  const newState = applyRound(node.state, move, enemyMove)
  const child = new MCTSNode(newState, node, move)
  node.children.push(child)
  return child
}

function simulate(state: GameState): number {
  const sim = JSON.parse(JSON.stringify(state)) as GameState
  while (!isTerminal(sim)) {
    const playerMoves = getAvailableMoves(sim.player_charges)
    const enemyMoves = getAvailableMoves(sim.enemy_charges)
    if (playerMoves.length === 0 || enemyMoves.length === 0) break

    let playerMove: string
    if (Math.random() < 0.8) {
      // smart policy
      const highChargeMoves = playerMoves.filter(m => sim.player_charges[m] > 1)
      const safeMoves = highChargeMoves.length > 0 ? highChargeMoves : playerMoves

      // killing moves without depleting
      const killing = safeMoves.filter(m => sim.player_move_stats[m].damage > sim.enemy_shield + sim.enemy_health)
      if (killing.length > 0) {
        playerMove = killing[Math.floor(Math.random() * killing.length)]
      } else {
        const [strongestEnemy, strongestDamage] = getEnemyStrongestAvailableAttack(sim.enemy_move_stats, sim.enemy_charges)
        const counter = getCounterMove(strongestEnemy)
        const enemyHealthRatio = sim.enemy_health / sim.enemy_max_health
        const playerHealthRatio = sim.player_health / sim.player_max_health
        if (enemyHealthRatio < 0.3) {
          const sorted = [...safeMoves].sort((a, b) => sim.player_move_stats[b].damage - sim.player_move_stats[a].damage)
          playerMove = sorted[0] ?? safeMoves[0]
        } else if (playerHealthRatio < 0.3) {
          if (safeMoves.includes(counter) && strongestDamage > 3) {
            playerMove = counter
          } else {
            playerMove = safeMoves.sort((a, b) => sim.player_move_stats[b].shield - sim.player_move_stats[a].shield)[0] ?? safeMoves[0]
          }
        } else if (strongestDamage < 5) {
          const sorted = [...safeMoves].sort((a, b) => sim.player_move_stats[b].damage - sim.player_move_stats[a].damage)
          playerMove = sorted[0] ?? safeMoves[0]
        } else {
          playerMove = safeMoves.includes(counter) ? counter : safeMoves[Math.floor(Math.random() * safeMoves.length)]
        }
      }
    } else {
      const highChargeMoves = playerMoves.filter(m => sim.player_charges[m] > 1)
      playerMove = (highChargeMoves.length > 0 ? highChargeMoves : playerMoves)[Math.floor(Math.random() * (highChargeMoves.length > 0 ? highChargeMoves.length : playerMoves.length))]
    }

    const enemyMove = enemyMoves[Math.floor(Math.random() * enemyMoves.length)]
    const ns = applyRound(sim, playerMove, enemyMove)
    Object.assign(sim, ns)
  }
  if (sim.enemy_health <= 0 && sim.player_health > 0) return 1
  if (sim.player_health <= 0) return 0
  const pr = sim.player_health / sim.player_max_health
  const er = sim.enemy_health / sim.enemy_max_health
  return pr > er ? 1 : 0
}

function backpropagate(node: MCTSNode, result: number): void {
  let current: MCTSNode | null = node
  while (current !== null) {
    current.visits += 1
    current.wins += result
    current = current.parent
  }
}

function mcts(rootState: GameState, iterations: number): string {
  const rootNode = new MCTSNode(rootState)
  
  for (let i = 0; i < iterations; i++) {
    // Selection
    let node = rootNode
    while (!isTerminal(node.state) && node.isFullyExpanded()) {
      node = selectBestChild(node)
    }
    
    // Expansion
    if (!isTerminal(node.state) && !node.isFullyExpanded()) {
      node = expand(node)
    }
    
    // Simulation
    const result = simulate(node.state)
    
    // Backpropagation
    backpropagate(node, result)
  }
  
  // Final selection with charge-aware and threat-scaled heuristics
  const [strongestEnemyMove, strongestDamage] = getEnemyStrongestAvailableAttack(
    rootState.enemy_move_stats,
    rootState.enemy_charges
  )
  const counterToStrongest = getCounterMove(strongestEnemyMove)
  
  // Check for killing moves
  const killingMoves = rootNode.children.filter(child => {
    if (child.visits === 0) return false
    const damage = rootState.player_move_stats[child.move!].damage
    return damage > rootState.enemy_shield + rootState.enemy_health && 
           rootState.player_charges[child.move!] > 1
  })
  
  if (killingMoves.length > 0) {
    const viableKillingMoves = killingMoves.filter(child => 
      child.visits > 0 && (child.wins / child.visits) > 0.5
    )
    if (viableKillingMoves.length > 0) {
      return viableKillingMoves.reduce((best, current) => 
        (current.wins / current.visits) > (best.wins / best.visits) ? current : best
      ).move!
    }
  }
  
  // Regular selection with exact penalties from CLI bot
  let bestChild: MCTSNode | null = null
  let bestScore = -Infinity
  
  const enemyHealthRatio = rootState.enemy_health / rootState.enemy_max_health
  const playerHealthRatio = rootState.player_health / rootState.player_max_health
  const effectiveHp = rootState.player_health + rootState.player_shield
  let threatLevel = effectiveHp > 0 ? strongestDamage / effectiveHp : 1.0
  if (strongestDamage < 5) threatLevel *= 0.5
  
  for (const child of rootNode.children) {
    if (child.visits === 0) continue
    
    const winRate = child.wins / child.visits
    
    // Exact charge penalty from CLI bot
    let chargePenalty = 0
    if (rootState.player_charges[child.move!] === 1) {
      chargePenalty = 0.5 // Very high penalty
    } else if (rootState.player_charges[child.move!] === 2) {
      chargePenalty = 0.15 // Moderate penalty
    }
    
    // Exact strategy bonuses from CLI bot
    let strategyBonus = 0
    
    // Offensive bonus
    const moveDamage = rootState.player_move_stats[child.move!].damage
    const highestDamage = Math.max(...Object.values(rootState.player_move_stats).map(s => s.damage))
    if (moveDamage > 0 && highestDamage > 0) {
      const damageRatio = moveDamage / highestDamage
      if (enemyHealthRatio < 0.3) {
        strategyBonus += 0.1 * damageRatio
      } else {
        strategyBonus += 0.05 * damageRatio
      }
    }
    
    // Counter bonus
    if (child.move === counterToStrongest) {
      if (playerHealthRatio < 0.3) {
        strategyBonus += 0.08 * Math.min(threatLevel, 1.0)
      } else {
        strategyBonus += 0.04 * Math.min(threatLevel, 1.0)
      }
    }
    
    // Shield bonus when weak
    if (playerHealthRatio < 0.3) {
      const shieldValue = rootState.player_move_stats[child.move!].shield
      const maxShield = Math.max(...Object.values(rootState.player_move_stats).map(s => s.shield))
      if (maxShield > 0) {
        const shieldRatio = shieldValue / maxShield
        strategyBonus += 0.06 * shieldRatio
      }
    }
    
    const score = winRate + strategyBonus - chargePenalty
    
    if (score > bestScore) {
      bestScore = score
      bestChild = child
    }
  }
  
  return bestChild?.move || "rock"
}

// Extract game state from API response (exact logic from CLI bot)
function getLootDescription(boonType: string, val1: number, val2: number): string {
  switch (boonType) {
    case 'Heal': return `Heal +${val1} HP`
    case 'AddMaxHealth': return `Max Health +${val1}`
    case 'AddMaxArmor': return `Max Shield +${val1}`
    case 'UpgradeRock': return `Rock: +${val1} DMG, +${val2} Shield`
    case 'UpgradePaper': return `Paper: +${val1} DMG, +${val2} Shield`
    case 'UpgradeScissor': return `Scissor: +${val1} DMG, +${val2} Shield`
    default: return `${boonType}: ${val1}, ${val2}`
  }
}

function getBaseScore(boonType: string, val1: number, val2: number): number {
  switch (boonType) {
    case 'UpgradeRock': return val1 * 3 + val2 * 2 // Damage + Shield
    case 'UpgradePaper': return val1 * 2 + val2 * 3 // Shield more valuable for paper
    case 'UpgradeScissor': return val1 * 2.5 + val2 * 2.5 // Balanced
    case 'AddMaxArmor': return val1 * 4 // Shield is valuable
    case 'AddMaxHealth': return val1 * 3 // Health is valuable
    case 'Heal': return val1 * 2 // Immediate healing
    default: return val1 + val2 // Default scoring
  }
}

function deriveFloorRoom(runData: any, entityData?: any): { floor: number; room: number } {
  // Prefer entity ROOM_NUM_CID if present
  let absoluteRoom: number | null = null
  if (entityData && typeof entityData.ROOM_NUM_CID !== 'undefined') {
    const n = Number(entityData.ROOM_NUM_CID)
    if (!Number.isNaN(n) && n > 0) absoluteRoom = n
  }
  // Fallback: parse from enemy id like "Enemy Room 15"
  if (absoluteRoom === null) {
    const enemyId: string | undefined = runData?.players?.[1]?.id
    const m = typeof enemyId === 'string' ? enemyId.match(/(\d{1,2})$/) : null
    if (m && m[1]) {
      absoluteRoom = Number(m[1])
    }
  }
  // Last fallback: use ENEMY_CID if it looks like a room counter
  if (absoluteRoom === null && entityData && typeof entityData.ENEMY_CID !== 'undefined') {
    const n = Number(entityData.ENEMY_CID)
    if (!Number.isNaN(n) && n > 0) absoluteRoom = n
  }
  // If still unknown, keep previous globals
  if (absoluteRoom === null) {
    return { floor: currentFloor, room: currentRoom }
  }
  const floor = Math.floor((absoluteRoom - 1) / ENEMIES_PER_FLOOR) + 1
  const room = ((absoluteRoom - 1) % ENEMIES_PER_FLOOR) + 1
  currentFloor = floor
  currentRoom = room
  return { floor, room }
}

function extractGameState(runData: any, entityData?: any): GameState {
  console.log('Extracting game state from run data:', runData)
  
  const player = runData.players[0]
  const enemy = runData.players[1]
  
  console.log('Player data:', player)
  console.log('Enemy data:', enemy)
  
  // Get correct max shield and health values (exact from CLI bot)
  const playerMaxShield = player.shield?.currentMax || player.shield?.startingMax || 0
  const playerMaxHealth = player.health?.currentMax || player.health?.startingMax || 0
  
  const { floor, room } = deriveFloorRoom(runData, entityData)

  const gameState = {
    player_health: player.health?.current || 0,
    player_shield: player.shield?.current || 0,
    enemy_health: enemy.health?.current || 0,
    enemy_shield: enemy.shield?.current || 0,
    player_max_health: playerMaxHealth,
    player_max_shield: playerMaxShield,
    enemy_max_health: enemy.health?.starting || 0,
    enemy_max_shield: enemy.shield?.starting || 0,
    round_number: 1,
    current_floor: floor,
    current_room: room,
    player_charges: {
      rock: player.rock?.currentCharges || 3,
      paper: player.paper?.currentCharges || 3,
      scissor: player.scissor?.currentCharges || 3
    },
    enemy_charges: {
      rock: enemy.rock?.currentCharges || 3,
      paper: enemy.paper?.currentCharges || 3,
      scissor: enemy.scissor?.currentCharges || 3
    },
    player_move_stats: {
      rock: { damage: player.rock?.currentATK || 0, shield: player.rock?.currentDEF || 0 },
      paper: { damage: player.paper?.currentATK || 0, shield: player.paper?.currentDEF || 0 },
      scissor: { damage: player.scissor?.currentATK || 0, shield: player.scissor?.currentDEF || 0 }
    },
    enemy_move_stats: {
      rock: { damage: enemy.rock?.currentATK || 0, shield: enemy.rock?.currentDEF || 0 },
      paper: { damage: enemy.paper?.currentATK || 0, shield: enemy.paper?.currentDEF || 0 },
      scissor: { damage: enemy.scissor?.currentATK || 0, shield: enemy.scissor?.currentDEF || 0 }
    }
  }
  
  console.log('Extracted game state:', gameState)
  return gameState
}

// API call function (return error payloads instead of throwing to enable recovery)
async function sendAction(action: string, actionToken: string, dungeonId: number, jwtToken: string, data: any = DEFAULT_ACTION_DATA) {
  const payload = {
    action,
    actionToken,
    dungeonId,
    data
  }
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'authorization': `Bearer ${jwtToken}`,
      'content-type': 'application/json',
      'origin': 'https://gigaverse.io',
      'referer': 'https://gigaverse.io/play',
      'priority': 'u=1, i',
      'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    },
    body: JSON.stringify(payload)
  })
  
  const text = await response.text()
  let parsed: any
  try { parsed = text ? JSON.parse(text) : {} } catch { parsed = { success: false, message: 'Non-JSON response', raw: text } }
  if (!response.ok) {
    console.error(`API call failed: ${response.status}`, text)
    return parsed || { success: false, message: `HTTP ${response.status}` }
  }
  return parsed
}

async function getDungeonState(jwtToken: string) {
  try {
    const res = await fetch(STATE_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Accept': '*/*',
        'content-type': 'application/json'
      }
    })
    const txt = await res.text()
    try { return JSON.parse(txt) } catch { return { success: false, message: 'Non-JSON state response', raw: txt } }
  } catch (e: any) {
    return { success: false, message: e?.message || 'State fetch failed' }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body ONCE and reuse for all branches to avoid "Body is unusable"
    const body = await request.json()
    const {
      action,
      mode = 'normal',
      gameState,
      move,
      actionToken,
      lootOptions,
      selectedLoot,
      // Optional fields used by specific actions
      selectedPotions = [0, 0, 0],
      potionSlot,
      potionItemId
    } = body
    
    // Get JWT token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }
    
    const jwtToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
    
    // Determine dungeon ID based on mode
    const dungeonId = mode === 'gigus' ? 2 : mode === 'underhaul' ? 3 : 1
    
    console.log(`🎯 Dungeon API - Action: ${action}, Mode: ${mode}, DungeonID: ${dungeonId}`)
    
    if (action === 'start_run') {
      // Start a new dungeon run
      try {
        let response
        
        // Start with potions if any are selected
        if (selectedPotions.some((p: number) => p !== 0)) {
          console.log('🧪 Starting run with potions:', selectedPotions)
          // Filter out zeros as CLI does
          const consumables = selectedPotions.filter((p: number) => p !== 0)
          response = await sendAction('start_run', '', dungeonId, jwtToken, {
            consumables,
            itemId: 0,
            index: 0,
            isJuiced: false,
            gearInstanceIds: []
          })
        } else {
          console.log('🏃 Starting run without potions')
          response = await sendAction('start_run', '', dungeonId, jwtToken, DEFAULT_ACTION_DATA)
        }
        
        console.log('✅ Start run response:', response)
        
        if (response && response.success) {
          // Prefer token at top-level, then nested in data
          const startActionToken = (response as any).actionToken || (response as any)?.data?.actionToken || ''
          const gameState = extractGameState(response.data.run, response.data.entity)
          
          // Check if we started in loot phase
          const lootPhase = response.data.run.lootPhase
          const lootOptions = response.data.run.lootOptions
          
          return NextResponse.json({
            success: true,
            actionToken: startActionToken,
            gameState,
            lootPhase,
            lootOptions,
            entityData: response.data.entity,
            mode,
            dungeonId,
            selectedPotions
          })
        }

        // Attempt recovery: check current dungeon state; treat active run as success
        const state = await getDungeonState(jwtToken)
        if (state && state.success && state.data && state.data.run && !state.data.run.COMPLETE_CID) {
          const recoveredGameState = extractGameState(state.data.run)
          return NextResponse.json({
            success: true,
            actionToken: state.data.actionToken || '',
            gameState: recoveredGameState,
            lootPhase: state.data.run.lootPhase,
            lootOptions: state.data.run.lootOptions,
            entityData: state.data.entity,
            mode,
            dungeonId,
            selectedPotions
          })
        }

        return NextResponse.json({ success: false, error: (response && response.message) || 'Failed to start dungeon run' })
        
      } catch (error) {
        console.error('Start run error:', error)
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to start dungeon run' 
        })
      }
    }
    
    if (action === 'calculate_move') {
      // Calculate best move using MCTS
      if (!gameState) {
        return NextResponse.json({ success: false, error: 'No game state provided' })
      }
      
      try {
        const startedAt = Date.now()
        // Try local Python service first
        try {
          const resp = await fetch('http://127.0.0.1:8765/mcts/move', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ gameState, iterations: DEFAULT_MCTS_ITERATIONS })
          })
          if (resp.ok) {
            const json = await resp.json()
            if (json?.success && json?.move) {
              console.log(`🧠 PyMCTS best move: ${json.move} in ${Date.now() - startedAt}ms`)
              return NextResponse.json({ success: true, bestMove: json.move, engine: 'python' })
            }
          }
        } catch (e) {
          console.warn('⚠️ Python MCTS service unavailable, falling back to Node MCTS')
        }

        // Fallback to Node MCTS
        const enemyRatio = gameState.enemy_health / Math.max(1, gameState.enemy_max_health)
        const playerRatio = gameState.player_health / Math.max(1, gameState.player_max_health)
        const lowChargeMoves = Object.values(gameState.player_charges as Record<string, number>).filter((c: number) => c <= 1).length
        let iterations = DEFAULT_MCTS_ITERATIONS
        if (enemyRatio < 0.2) iterations = Math.floor(DEFAULT_MCTS_ITERATIONS / 2)
        else if (playerRatio > 0.8 && enemyRatio > 0.8) iterations = Math.floor(DEFAULT_MCTS_ITERATIONS / 2)
        else if (playerRatio < 0.3 || lowChargeMoves >= 2) iterations = DEFAULT_MCTS_ITERATIONS
        else iterations = Math.floor((DEFAULT_MCTS_ITERATIONS * 3) / 4)

        const bestMove = mcts(gameState, iterations)
        console.log(`🧠 Node MCTS best move: ${bestMove} in ${Date.now() - startedAt}ms for ${iterations} iterations`)

        return NextResponse.json({ success: true, bestMove, engine: 'node' })
      } catch (error) {
        console.error('MCTS calculation error:', error)
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to calculate move' 
        })
      }
    }
    
    if (action === 'execute_move') {
      // Execute a move. The first move can be sent with an empty actionToken (CLI-compatible)
      if (!move) {
        return NextResponse.json({ success: false, error: 'Missing move' })
      }
      
      try {
        // Map UI move names to API action names expected by CLI
        const moveAction = move
        // After the run starts, subsequent actions should use dungeonId 0 (matches CLI)
        const response = await sendAction(moveAction, actionToken || '', 0, jwtToken, DEFAULT_ACTION_DATA)
        console.log(`⚔️ Move execution response:`, response)
        
        if (response.success) {
           const gameState = extractGameState(response.data.run, response.data.entity)
          
          // Check if we entered loot phase
          const lootPhase = response.data.run.lootPhase
          const lootOptions = response.data.run.lootOptions
          
          return NextResponse.json({
            success: true,
            gameState,
            actionToken: (response as any)?.data?.actionToken || (response as any)?.actionToken || '',
            lootPhase,
            lootOptions,
            entityData: response.data.entity, // Include entity data for potion analysis
            itemChanges: (response as any)?.gameItemBalanceChanges || (response as any)?.data?.gameItemBalanceChanges || [],
            roundResult: {
              playerMove: move,
              enemyMove: response.data.run.enemyMove || 'unknown',
              outcome: response.data.run.outcome || 'unknown',
              result: response.data.run.result || 'unknown'
            }
          })
        } else {
          // If token-related error, attempt to recover by fetching current state
          if ((response?.message || '').toLowerCase().includes('token')) {
            // Try to parse expected token from error like: "Invalid action token X != Y"
            const match = String(response.message || '').match(/!=\s*(\d{6,})/)
            if (match && match[1]) {
              const expectedToken = match[1]
              const retry = await sendAction(moveAction, expectedToken, 0, jwtToken, DEFAULT_ACTION_DATA)
              if (retry?.success) {
                const gameState = extractGameState(retry.data.run, retry.data.entity)
                return NextResponse.json({
                  success: true,
                  gameState,
                  actionToken: (retry as any)?.data?.actionToken || (retry as any)?.actionToken || expectedToken,
                  lootPhase: retry.data.run.lootPhase,
                  lootOptions: retry.data.run.lootOptions,
                  entityData: retry.data.entity,
                  itemChanges: (retry as any)?.gameItemBalanceChanges || (retry as any)?.data?.gameItemBalanceChanges || [],
                  roundResult: {
                    playerMove: move,
                    enemyMove: retry.data.run.enemyMove || 'unknown',
                    outcome: retry.data.run.outcome || 'unknown',
                    result: retry.data.run.result || 'unknown'
                  }
                })
              }
            }
            const state = await getDungeonState(jwtToken)
            if (state?.success && state.data?.run) {
              const recovered = extractGameState(state.data.run, state.data.entity)
              return NextResponse.json({ success: true, gameState: recovered, actionToken: state.data.actionToken || '' })
            }
          }
          return NextResponse.json({ success: false, error: response.message || 'Failed to execute move' })
        }
      } catch (error) {
        console.error('Move execution error:', error)
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to execute move' 
        })
      }
    }
    
    if (action === 'analyze_potion_usage') {
      // Analyze whether to use a potion
      if (!gameState) {
        return NextResponse.json({ success: false, error: 'No game state provided' })
      }
      
      try {
        // Call the potion analysis API
        const potionResponse = await fetch('/api/potions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({
            action: 'analyze_usage',
            gameState,
            entityData: gameState.entityData
          })
        })
        
        const potionData = await potionResponse.json()
        
        if (potionData.success) {
          console.log('🧪 Potion analysis result:', potionData.analysis)
          return NextResponse.json({
            success: true,
            analysis: potionData.analysis
          })
        } else {
          return NextResponse.json({ 
            success: false, 
            error: potionData.error || 'Failed to analyze potion usage' 
          })
        }
      } catch (error) {
        console.error('Potion analysis error:', error)
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to analyze potion usage' 
        })
      }
    }
    
    if (action === 'use_potion') {
      // Use a potion
      if (!actionToken) {
        return NextResponse.json({ success: false, error: 'No action token provided' })
      }
      
      try {
        const response = await sendAction('use_item', actionToken, 0, jwtToken, {
          consumables: [],
          itemId: potionItemId,
          index: potionSlot,
          isJuiced: false,
          gearInstanceIds: []
        })
        
        console.log(`🧪 Potion usage response:`, response)
        
        if (response.success) {
          const gameState = extractGameState(response.data.run, response.data.entity)
          
          return NextResponse.json({
            success: true,
            gameState,
            actionToken: (response as any)?.data?.actionToken || (response as any)?.actionToken || '',
            entityData: response.data.entity,
            potionUsed: {
              slot: potionSlot,
              itemId: potionItemId
            }
          })
        } else {
          return NextResponse.json({ 
            success: false, 
            error: response.message || 'Failed to use potion' 
          })
        }
      } catch (error) {
        console.error('Potion usage error:', error)
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to use potion' 
        })
      }
    }
    
    if (action === 'auto_select_loot') {
      // Auto-select best loot option
      if (!lootOptions || !Array.isArray(lootOptions)) {
        return NextResponse.json({ success: false, error: 'No loot options provided' })
      }
      
      try {
        // Prefer local Python loot chooser if available
        try {
          const resp = await fetch('http://127.0.0.1:8765/loot/choose', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ gameState, lootOptions, simIterations: LOOT_SIM_ITERATIONS })
          })
          if (resp.ok) {
            const json = await resp.json()
            if (json?.success && typeof json?.index === 'number') {
              // Assign actions by index
              lootOptions.forEach((opt: any, i: number) => { opt.action = i === 0 ? 'loot_one' : i === 1 ? 'loot_two' : 'loot_three' })
              const bestLoot = lootOptions[json.index] || lootOptions[0]
              const lootAction = bestLoot.action
              let response = await sendAction(lootAction, actionToken || '', 0, jwtToken, DEFAULT_ACTION_DATA)
              if (response.success) {
                const gameState = extractGameState(response.data.run, response.data.entity)
                return NextResponse.json({
                  success: true,
                  gameState,
                  actionToken: (response as any)?.data?.actionToken || (response as any)?.actionToken || '',
                  selectedLoot: bestLoot,
                })
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ Python loot service unavailable, using Node sim')
        }

        // Assign actions by index to mirror CLI expectation
        lootOptions.forEach((opt: any, i: number) => {
          opt.action = i === 0 ? 'loot_one' : i === 1 ? 'loot_two' : 'loot_three'
        })

        // Simulation-driven loot evaluation (similar to CLI LootManager)
        const fs = await import('fs/promises')
        const path = await import('path')

        // Determine enemy stats file (default to normal/gigus stats)
        // If mode is provided in body use underhaul file for 'underhaul'
        const statsFile = (body?.mode === 'underhaul')
          ? path.join(process.cwd(), 'gigaverse-backend', 'underhaul_enemy_stats.json')
          : path.join(process.cwd(), 'gigaverse-backend', 'enemy_stats.json')

        let enemyData: any = {}
        try {
          const raw = await fs.readFile(statsFile, 'utf-8')
          enemyData = JSON.parse(raw)?.enemies || {}
        } catch (e) {
          console.warn('⚠️ Could not load enemy stats file:', e)
        }

        function getFutureEnemies(current_floor: number, current_room: number) {
          const list: Array<{floor:number;room:number;stats:any}> = []
          for (let f = 1; f <= 4; f++) {
            const floorKey = `floor_${f}`
            if (!enemyData[floorKey]) continue
            for (let r = 1; r <= 4; r++) {
              if (f < current_floor) continue
              if (f === current_floor && r <= current_room) continue
              const roomKey = `room_${r}`
              if (enemyData[floorKey][roomKey]) {
                list.push({ floor: f, room: r, stats: enemyData[floorKey][roomKey] })
              }
            }
          }
          return list
        }

        function applyLootToState(loot: any, baseState: any, playerStats: any) {
          const ns = { ...baseState }
          const newStats: any = {
            rock: { ...playerStats.rock },
            paper: { ...playerStats.paper },
            scissor: { ...playerStats.scissor }
          }
          const boon = loot.boonTypeString
          const v1 = loot.selectedVal1 || 0
          const v2 = loot.selectedVal2 || 0
          if (boon === 'UpgradeRock') {
            newStats.rock.damage += v1; newStats.rock.shield += v2
          } else if (boon === 'UpgradePaper') {
            newStats.paper.damage += v1; newStats.paper.shield += v2
          } else if (boon === 'UpgradeScissor') {
            newStats.scissor.damage += v1; newStats.scissor.shield += v2
          } else if (boon === 'AddMaxHealth') {
            ns.player_max_health += v1; ns.player_health = Math.min(ns.player_health + v1, ns.player_max_health)
          } else if (boon === 'AddMaxArmor' || boon === 'AddMaxShield') {
            ns.player_max_shield += v1; ns.player_shield = Math.min(ns.player_shield + v1, ns.player_max_shield)
          } else if (boon === 'Heal') {
            ns.player_health = Math.min(ns.player_health + v1, ns.player_max_health)
          }
          return { state: ns, stats: newStats }
        }

        function evaluateLootAgainstFuture(loot: any, baseState: any) {
          const futures = getFutureEnemies(baseState.current_floor, baseState.current_room)
          if (!futures || futures.length === 0) return 0.5
          // Penalize wasted heal if near full
          if (loot.boonTypeString === 'Heal') {
            const healVal = loot.selectedVal1 || 0
            const maxUsable = baseState.player_max_health - baseState.player_health
            if (maxUsable < healVal * 0.5) {
              // large waste → reduce expected value a bit
            }
          }
          let total = 0
          let wsum = 0
          for (const fe of futures) {
            const dist = ((fe.floor - baseState.current_floor) * 4) + (fe.room - baseState.current_room)
            const weight = Math.max(0.5, 4.0 - dist * 0.5)
            const { state: st, stats: pstats } = applyLootToState(loot, baseState, baseState.player_move_stats)
            // Build enemy stats for this future enemy
            const enemyStats = {
              rock: { damage: fe.stats.moves.rock.damage, shield: fe.stats.moves.rock.shield },
              paper: { damage: fe.stats.moves.paper.damage, shield: fe.stats.moves.paper.shield },
              scissor: { damage: fe.stats.moves.scissor.damage, shield: fe.stats.moves.scissor.shield }
            }
            const evalState: GameState = {
              player_health: st.player_health,
              player_shield: st.player_shield,
              enemy_health: fe.stats.health,
              enemy_shield: fe.stats.shield,
              player_max_health: st.player_max_health,
              player_max_shield: st.player_max_shield,
              enemy_max_health: fe.stats.health,
              enemy_max_shield: fe.stats.shield,
              round_number: st.round_number,
              current_floor: st.current_floor,
              current_room: st.current_room,
              player_charges: { ...baseState.player_charges },
              enemy_charges: { rock: 3, paper: 3, scissor: 3 },
              player_move_stats: pstats,
              enemy_move_stats: enemyStats
            }
            // Run short simulations
            let wins = 0
            for (let i = 0; i < Math.max(25, Math.floor(LOOT_SIM_ITERATIONS / 4)); i++) {
              wins += simulate(evalState)
            }
            const rate = wins / Math.max(25, Math.floor(LOOT_SIM_ITERATIONS / 4))
            total += rate * weight
            wsum += weight
          }
          return wsum > 0 ? total / wsum : 0
        }

        let bestLoot: any = null
        let bestRate = -Infinity
        for (const loot of lootOptions) {
          const rate = evaluateLootAgainstFuture(loot, gameState || {})
          if (rate > bestRate) { bestRate = rate; bestLoot = loot }
        }

        if (!bestLoot) bestLoot = lootOptions[0]

        console.log('🎁 Auto-selected loot (simulated):', bestLoot)

        // Execute loot selection
        const lootAction = bestLoot.action || 'loot_two'
        // Attempt with provided token (can be empty). Backend often returns the next token on failure
        let response = await sendAction(lootAction, actionToken || '', 0, jwtToken, DEFAULT_ACTION_DATA)
        
        if (response.success) {
          const gameState = extractGameState(response.data.run, response.data.entity)
          
          return NextResponse.json({
            success: true,
            gameState,
            actionToken: (response as any)?.data?.actionToken || (response as any)?.actionToken || '',
            selectedLoot: bestLoot,
            lootDescription: getLootDescription(
              bestLoot.boonTypeString || 'unknown',
              bestLoot.selectedVal1 || 0,
              bestLoot.selectedVal2 || 0
            )
          })
        } else {
          // Retry once if backend reveals the expected token in the error message
          if ((response?.message || '').toLowerCase().includes('token')) {
            const match = String(response.message || '').match(/!=\s*(\d{6,})/)
            if (match && match[1]) {
              const expectedToken = match[1]
              const retry = await sendAction(lootAction, expectedToken, 0, jwtToken, DEFAULT_ACTION_DATA)
              if (retry?.success) {
                const gameState = extractGameState(retry.data.run, retry.data.entity)
                return NextResponse.json({
                  success: true,
                  gameState,
                  actionToken: (retry as any)?.data?.actionToken || (retry as any)?.actionToken || expectedToken,
                  selectedLoot: bestLoot,
                  lootDescription: getLootDescription(
                    bestLoot.boonTypeString || 'unknown',
                    bestLoot.selectedVal1 || 0,
                    bestLoot.selectedVal2 || 0
                  )
                })
              }
            } else {
              // Try to recover from state and then re-send with that token
              const state = await getDungeonState(jwtToken)
              const recoveredToken = state?.data?.actionToken || ''
              if (recoveredToken) {
                const retry = await sendAction(lootAction, recoveredToken, 0, jwtToken, DEFAULT_ACTION_DATA)
                if (retry?.success) {
                  const gameState = extractGameState(retry.data.run)
                  return NextResponse.json({
                    success: true,
                    gameState,
                    actionToken: (retry as any)?.data?.actionToken || (retry as any)?.actionToken || recoveredToken,
                    selectedLoot: bestLoot,
                    lootDescription: getLootDescription(
                      bestLoot.boonTypeString || 'unknown',
                      bestLoot.selectedVal1 || 0,
                      bestLoot.selectedVal2 || 0
                    )
                  })
                }
              }
            }
          }
          return NextResponse.json({ success: false, error: response.message || 'Failed to select loot' })
        }
      } catch (error) {
        console.error('Loot selection error:', error)
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to select loot' 
        })
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: `Unknown action: ${action}` 
    })
    
  } catch (error) {
    console.error('Dungeon API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
} 