import { NextRequest, NextResponse } from 'next/server'

// Exact parameters from CLI bot
const MAX_ROUNDS = 20
const MCTS_ITERATIONS = 100000  // Matching CLI bot exactly
const LOOT_SIM_ITERATIONS = 100

// No hardcoded token - use token from Authorization header
// const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwidXNlciI6eyJfaWQiOiI2N2I5MjE1YTEwOGFlZGRiNDA5YTdlNzMiLCJ3YWxsZXRBZGRyZXNzIjoiMHhiMGQ5MGQ1MmM3Mzg5ODI0ZDRiMjJjMDZiY2RjY2Q3MzRlMzE2MmI3IiwidXNlcm5hbWUiOiIweGIwZDkwRDUyQzczODk4MjRENEIyMmMwNmJjZGNDRDczNEUzMTYyYjciLCJjYXNlU2Vuc2l0aXZlQWRkcmVzcyI6IjB4YjBkOTBENTJDNzM4OTgyNEQ0QjIyYzA2YmNkY0NENzM0RTMxNjJiNyIsIl9fdiI6MH0sImdhbWVBY2NvdW50Ijp7Im5vb2IiOnsiX2lkIjoiNjdiOTIxNzRlM2MzOWRjYTZmZGFkZjA5IiwiZG9jSWQiOiIyMTQyNCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiTEFTVF9UUkFOU0ZFUl9USU1FX0NJRCI6MTc0MDE4NTk2NCwiY3JlYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMi45NDZaIiwidXBkYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMy4xNjVaIiwiTEVWRUxfQ0lEIjoxLCJJU19OT09CX0NJRCI6dHJ1ZSwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJPV05FUl9DSUQiOiIweGIwZDkwZDUyYzczODk4MjRkNGIyMmMwNmJjZGNjZDczNGUzMTYyYjcifSwiYWxsb3dlZFRvQ3JlYXRlQWNjb3VudCI6dHJ1ZSwiY2FuRW50ZXJHYW1lIjp0cnVlLCJub29iUGFzc0JhbGFuY2UiOjAsImxhc3ROb29iSWQiOjczODg0LCJtYXhOb29iSWQiOjEwMDAwfSwiZXhwIjoxNzUwMTE2NDMxfQ.M26R6pDnFSSIbMXHa6kOhT_Hrjn3U7nkm_sGv0rY0uY"

const API_URL = "https://gigaverse.io/api/game/dungeon/action"
const DEFAULT_ACTION_DATA = { "consumables": [], "itemId": 0, "index": 0 }

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
  player_charges: { rock: number, paper: number, scissor: number }
  enemy_charges: { rock: number, paper: number, scissor: number }
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
  newCharges[chosenMove] -= 1
  
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
  
  const [strongestEnemyMove, strongestDamage] = getEnemyStrongestAttack(node.state.enemy_move_stats)
  const counterToStrongest = getCounterMove(strongestEnemyMove)
  
  for (const child of node.children) {
    if (child.visits === 0) {
      return child
    }
    
    const winRate = child.wins / child.visits
    const exploration = Math.sqrt(Math.log(node.visits) / child.visits)
    
    // Exact bonuses from CLI bot
    let bonus = 0
    
    // Counter bonus (exact values)
    if (child.move === counterToStrongest) {
      const playerHealthRatio = node.state.player_health / node.state.player_max_health
      const threatLevel = strongestDamage / (node.state.player_health + node.state.player_shield)
      
      if (playerHealthRatio < 0.3) {
        bonus += 0.08 * Math.min(threatLevel, 1.0)
      } else {
        bonus += 0.04 * Math.min(threatLevel, 1.0)
      }
    }
    
    // Charge bonus/penalty (exact values)
    const charge = node.state.player_charges[child.move!]
    if (charge === 1) {
      bonus -= 0.3 // High penalty for last charge
    } else if (charge === 2) {
      bonus -= 0.1 // Moderate penalty
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
  const possibleMoves = getAvailableMoves(node.state.player_charges)
  const existingMoves = new Set(node.children.map(child => child.move))
  
  for (const move of possibleMoves) {
    if (!existingMoves.has(move)) {
      // Create a new state by simulating one round with a random enemy move
      const enemyMoves = getAvailableMoves(node.state.enemy_charges)
      const randomEnemyMove = enemyMoves[Math.floor(Math.random() * enemyMoves.length)]
      
      const newState = applyRound(node.state, move, randomEnemyMove)
      const newChild = new MCTSNode(newState, node, move)
      node.children.push(newChild)
      return newChild
    }
  }
  
  return node.children[0]
}

function simulate(state: GameState): number {
  const simState = JSON.parse(JSON.stringify(state))
  
  while (!isTerminal(simState)) {
    const playerMoves = getAvailableMoves(simState.player_charges)
    const enemyMoves = getAvailableMoves(simState.enemy_charges)
    
    if (playerMoves.length === 0 || enemyMoves.length === 0) break
    
    const playerMove = playerMoves[Math.floor(Math.random() * playerMoves.length)]
    const enemyMove = enemyMoves[Math.floor(Math.random() * enemyMoves.length)]
    
    const newState = applyRound(simState, playerMove, enemyMove)
    Object.assign(simState, newState)
  }
  
  // Return 1 if player wins, 0 if enemy wins
  if (simState.enemy_health <= 0 && simState.player_health > 0) {
    return 1
  } else if (simState.player_health <= 0) {
    return 0
  } else {
    // Timeout - judge by health ratio
    const playerRatio = simState.player_health / simState.player_max_health
    const enemyRatio = simState.enemy_health / simState.enemy_max_health
    return playerRatio > enemyRatio ? 1 : 0
  }
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
  
  // Select best move (exact logic from CLI bot)
  const [strongestEnemyMove, strongestDamage] = getEnemyStrongestAttack(rootState.enemy_move_stats)
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
  const threatLevel = strongestDamage / (rootState.player_health + rootState.player_shield)
  
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

function extractGameState(runData: any): GameState {
  console.log('Extracting game state from run data:', runData)
  
  const player = runData.players[0]
  const enemy = runData.players[1]
  
  console.log('Player data:', player)
  console.log('Enemy data:', enemy)
  
  // Get correct max shield and health values (exact from CLI bot)
  const playerMaxShield = player.shield?.currentMax || player.shield?.startingMax || 0
  const playerMaxHealth = player.health?.currentMax || player.health?.startingMax || 0
  
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
    current_floor: currentFloor,
    current_room: currentRoom,
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

// API call function
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
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    },
    body: JSON.stringify(payload)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`API call failed: ${response.status}`, errorText)
    throw new Error(`API call failed: ${response.status} - ${errorText}`)
  }
  
  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode = 'normal', runs = 1 } = body
    
    // Get JWT token from Authorization header
    const authorization = request.headers.get('Authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No valid authorization token provided' }, { status: 401 })
    }
    
    const jwtToken = authorization.substring(7) // Remove 'Bearer ' prefix
    
    console.log(`Starting ${runs} dungeon runs in ${mode} mode`)
    
    // Mock dungeon run logic
    const results = []
    for (let i = 0; i < runs; i++) {
      results.push({
        run: i + 1,
        mode,
        success: Math.random() > 0.3, // 70% success rate
        loot: Math.floor(Math.random() * 100) + 50,
        experience: Math.floor(Math.random() * 50) + 25
      })
    }
    
    return NextResponse.json({
      success: true,
      runs: results,
      totalRuns: runs,
      mode
    })
  } catch (error) {
    console.error('Dungeon API error:', error)
    return NextResponse.json({ error: 'Failed to run dungeon' }, { status: 500 })
  }
} 