'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DungeonBattle from './DungeonBattle'
import MoveStream from './MoveStream'
// Removed MoveStream section to replace with inline timeline
import { 
  Sword, 
  Shield, 
  Heart, 
  Zap, 
  X, 
  Play, 
  Pause, 
  RotateCcw,
  Target,
  Flame,
  Snowflake,
  Scissors,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Brain,
  Crosshair,
  BarChart3,
  Crown,
  Settings,
  ChevronRight
} from 'lucide-react'
import { agwAuthService } from '@/lib/agw-auth'

interface DungeonRunnerProps {
  isOpen: boolean
  onClose: () => void
}

// Dungeon Mode Configurations
const DUNGEON_MODES = {
  normal: {
    id: 1,
    name: 'Dungetron 5000',
    displayName: 'Normal Mode',
    energyCost: 40,
    maxRuns: 12,
    description: 'Standard dungeon with balanced difficulty',
    icon: Sword,
    color: 'cyan',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/50',
    textColor: 'text-cyan-400',
    checkpointFloor: -1
  },
  gigus: {
    id: 2,
    name: 'Gigus Dungeon',
    displayName: 'Gigus Mode',
    energyCost: 200,
    maxRuns: 30,
    description: 'Elite dungeon with enhanced rewards',
    icon: Crown,
    color: 'yellow',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/50',
    textColor: 'text-yellow-400',
    checkpointFloor: -1
  },
  underhaul: {
    id: 3,
    name: 'Dungetron Underhaul',
    displayName: 'Underhaul Mode',
    energyCost: 40,
    maxRuns: 9,
    description: 'Challenging underworld dungeon',
    icon: Flame,
    color: 'red',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/50',
    textColor: 'text-red-400',
    checkpointFloor: 2
  }
} as const

type DungeonMode = keyof typeof DUNGEON_MODES

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

interface RoundResult {
  playerMove: string
  enemyMove: string
  outcome: string
  result: string
}

const DungeonRunner: React.FC<DungeonRunnerProps> = ({ isOpen, onClose }) => {
  // JWT Token management
  const getJWTToken = () => {
    return agwAuthService.getJWT() || ''
  }

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [actionToken, setActionToken] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentMode, setCurrentMode] = useState<DungeonMode>('normal')
  const [multiRunMode, setMultiRunMode] = useState(false)
  const [runCount, setRunCount] = useState(5)
  const [currentRunNumber, setCurrentRunNumber] = useState(0)
  const [sessionStats, setSessionStats] = useState<any[]>([])
  const [isClaimingEnergy, setIsClaimingEnergy] = useState(false)
  const [roundHistory, setRoundHistory] = useState<RoundResult[]>([])
  const [moveSnapshots, setMoveSnapshots] = useState<any[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [isCalculating, setIsCalculating] = useState(false)
  const [lastMove, setLastMove] = useState<string>('')
  const [winRate, setWinRate] = useState<number>(0)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [runStats, setRunStats] = useState({
    wins: 0,
    losses: 0,
    totalRounds: 0,
    averageRounds: 0
  })
  const [playerEnergy, setPlayerEnergy] = useState<number>(0)
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [selectedPotions, setSelectedPotions] = useState<number[]>([0, 0, 0])
  const [availablePotions, setAvailablePotions] = useState<any[]>([])
  const [showPotionSelector, setShowPotionSelector] = useState(false)
  const [potionAnalysis, setPotionAnalysis] = useState<any>(null)

  // Load player energy and potions on component mount
  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        const token = getJWTToken()
        if (!token) return

        // Load energy
        const energyResponse = await fetch('/api/player/energy', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (energyResponse.ok) {
          const energyData = await energyResponse.json()
          setPlayerEnergy(energyData.energy || 0)
        }

        // Load available potions
        const potionsResponse = await fetch('/api/potions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (potionsResponse.ok) {
          const potionsData = await potionsResponse.json()
          setAvailablePotions(potionsData.potions || [])
        }
      } catch (error) {
        console.error('Failed to load player data:', error)
      }
    }

    if (isOpen) {
      loadPlayerData()
    }
  }, [isOpen])

  // Helper function to get current mode config
  const getCurrentModeConfig = () => DUNGEON_MODES[currentMode]

  // Check if player has enough energy for selected mode
  const hasEnoughEnergy = () => {
    const modeConfig = getCurrentModeConfig()
    return playerEnergy >= modeConfig.energyCost
  }

  // Potion management functions
  const getPotionIcon = (potionType: string) => {
    switch (potionType) {
      case 'health': return Heart
      case 'charge': return Zap
      case 'damage': return Sword
      case 'defense': return Shield
      case 'special': return Target
      default: return Target
    }
  }

  const getPotionColor = (potionType: string) => {
    switch (potionType) {
      case 'health': return 'text-red-400 border-red-400 bg-red-400/10'
      case 'charge': return 'text-yellow-400 border-yellow-400 bg-yellow-400/10'
      case 'damage': return 'text-orange-400 border-orange-400 bg-orange-400/10'
      case 'defense': return 'text-blue-400 border-blue-400 bg-blue-400/10'
      case 'special': return 'text-purple-400 border-purple-400 bg-purple-400/10'
      default: return 'text-gray-400 border-gray-400 bg-gray-400/10'
    }
  }

  const selectPotionForSlot = (slotIndex: number, potionId: number) => {
    const newSelection = [...selectedPotions]
    newSelection[slotIndex] = potionId
    setSelectedPotions(newSelection)
  }

  const getPotionById = (potionId: number) => {
    return availablePotions.find(p => p.itemId === potionId)
  }

  const canAffordPotion = (potionId: number) => {
    const selectedCount = selectedPotions.filter(p => p === potionId).length
    const potion = getPotionById(potionId)
    return potion && selectedCount < potion.balance
  }

  // Auto-run logic (disabled - now using runSingleGame for all automated runs)
  useEffect(() => {
    console.log('Auto-run effect triggered:', { isRunning, isPaused, hasGameState: !!gameState, hasActionToken: !!actionToken, multiRunMode })
    
    // Disable auto-run effect - we now use runSingleGame for all automated runs
    if (false && isRunning && !isPaused && gameState && actionToken) {
      console.log('Starting auto-run with game state:', gameState)
      
      const runNextMove = async () => {
        try {
          setIsCalculating(true)
          console.log('Running next move...')
          
          // Calculate best move using MCTS
          const moveResponse = await fetch('/api/dungeon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'calculate_move',
              gameState
            })
          })
          
          const moveData = await moveResponse.json()
          if (!moveData.success) {
            throw new Error(moveData.error)
          }
          
          const bestMove = moveData.bestMove
          setLastMove(bestMove)
          setIsCalculating(false)
          
          // Small delay to show the calculated move
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Execute the move
          const executeResponse = await fetch('/api/dungeon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'execute_move',
              move: bestMove,
              actionToken
            })
          })
          
          const executeData = await executeResponse.json()
          if (!executeData.success) {
            throw new Error(executeData.error)
          }
          
          // Check if we entered loot phase
          if (executeData.lootPhase && executeData.lootOptions) {
            console.log('Entered loot phase, auto-selecting best loot...')
            setLastMove('Selecting loot...')
            
            // Auto-select best loot option immediately
            const lootResponse = await fetch('/api/dungeon', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'auto_select_loot',
                lootOptions: executeData.lootOptions,
                actionToken: executeData.actionToken,
                gameState: executeData.gameState
              })
            })
            
            const lootData = await lootResponse.json()
            if (!lootData.success) {
              throw new Error(lootData.error)
            }
            
            // Update with post-loot state
            if (lootData.gameState) {
              setGameState(lootData.gameState)
              setActionToken(lootData.actionToken)
              setSuccess(`🎁 Selected loot: ${getLootDescription(lootData.selectedLoot)}`)
            } else {
              // Still in loot phase, continue
              setActionToken(lootData.actionToken)
            }
            
            return
          }
          
          // Update game state
          const newGameState = executeData.gameState
          setGameState(newGameState)
          setActionToken(executeData.actionToken)
          setCurrentRound(prev => prev + 1)
          
          // Add to round history and snapshot stream
          if (executeData.roundResult) {
            setRoundHistory(prev => [...prev, executeData.roundResult])
            setMoveSnapshots(prev => [
              ...prev,
              {
                index: (prev.at(-1)?.index || 0) + 1,
                playerMove: executeData.roundResult.playerMove,
                enemyMove: executeData.roundResult.enemyMove,
                result: executeData.roundResult.result,
                pre: {
                  player_health: (gameState as any)?.player_health ?? 0,
                  player_shield: (gameState as any)?.player_shield ?? 0,
                  enemy_health: (gameState as any)?.enemy_health ?? 0,
                  enemy_shield: (gameState as any)?.enemy_shield ?? 0,
                  player_max_health: (gameState as any)?.player_max_health ?? 0,
                  player_max_shield: (gameState as any)?.player_max_shield ?? 0,
                  enemy_max_health: (gameState as any)?.enemy_max_health ?? 0,
                  enemy_max_shield: (gameState as any)?.enemy_max_shield ?? 0,
                  current_floor: (gameState as any)?.current_floor ?? 1,
                  current_room: (gameState as any)?.current_room ?? 1,
                },
                post: {
                  player_health: newGameState.player_health,
                  player_shield: newGameState.player_shield,
                  enemy_health: newGameState.enemy_health,
                  enemy_shield: newGameState.enemy_shield,
                  player_max_health: newGameState.player_max_health,
                  player_max_shield: newGameState.player_max_shield,
                  enemy_max_health: newGameState.enemy_max_health,
                  enemy_max_shield: newGameState.enemy_max_shield,
                  current_floor: newGameState.current_floor,
                  current_room: newGameState.current_room,
                }
              }
            ])
          }
          
          // Check if game is over AFTER executing the move
          if (newGameState.player_health <= 0 || newGameState.enemy_health <= 0) {
            console.log('Game over detected after move:', { playerHealth: newGameState.player_health, enemyHealth: newGameState.enemy_health })
            setIsRunning(false)
            const won = newGameState.enemy_health <= 0 && newGameState.player_health > 0
            
            setRunStats(prev => ({
              wins: prev.wins + (won ? 1 : 0),
              losses: prev.losses + (won ? 0 : 1),
              totalRounds: prev.totalRounds + currentRound + 1,
              averageRounds: (prev.totalRounds + currentRound + 1) / (prev.wins + prev.losses + 1)
            }))
            
            setSuccess(won ? `🎉 Victory! Reached Floor ${newGameState.current_floor}, Room ${newGameState.current_room}` : `💀 Defeat on Floor ${newGameState.current_floor}, Room ${newGameState.current_room}`)
            return
          }
          
        } catch (error) {
          console.error('Auto-run error:', error)
          setError(error instanceof Error ? error.message : 'Unknown error')
          setIsRunning(false)
          setIsCalculating(false)
        }
      }
      
      const timeout = setTimeout(runNextMove, 2000) // 2 second delay between moves
      return () => clearTimeout(timeout)
    }
  }, [isRunning, isPaused, gameState, actionToken, currentRound])

  const claimEnergy = async (threshold: number = 200) => {
    try {
      setIsClaimingEnergy(true)
      console.log('🔋 Claiming energy from ROMs...')
      
      const jwtToken = getJWTToken()
      const response = await fetch('/api/energy/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ threshold })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.energy.total > 0) {
          console.log(`✅ Successfully claimed ${result.energy.total} energy from ${result.energy.claimed_roms.length} ROMs`)
          return { success: true, claimed: result.energy.total }
        } else {
          console.log('ℹ️ No energy was claimed. This might be fine if you already have sufficient energy.')
          return { success: true, claimed: 0 }
        }
      } else {
        console.error('❌ Energy claiming failed:', response.status)
        return { success: false, error: `HTTP ${response.status}` }
      }
    } catch (error) {
      console.error('❌ Error during energy claiming:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    } finally {
      setIsClaimingEnergy(false)
    }
  }

  const startMultipleRuns = async () => {
    console.log(`🔄 Starting ${currentMode.toUpperCase()} Mode for ${runCount} runs...`)
    
    // Set energy threshold based on mode (matching CLI bot logic)
    const energyThreshold = currentMode === 'gigus' ? 240 : 50
    
    const runStats: any[] = []
    let successfulRuns = 0
    let runAttempt = 1
    let continueRunning = true
    
    // Reset session stats
    setSessionStats([])
    
    while (continueRunning && runAttempt <= runCount) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`🏃 STARTING RUN ${runAttempt}/${runCount} 🏃`)
      console.log(`${'='.repeat(60)}\n`)
      
      setCurrentRunNumber(runAttempt)
      
      // Skip energy claiming on first run, try on subsequent runs (but don't get stuck)
      if (runAttempt > 1) {
        console.log('🔋 Attempting to claim energy before starting next run...')
        try {
          // Set a timeout for energy claiming to prevent getting stuck
          const claimPromise = claimEnergy(energyThreshold)
          const timeoutPromise = new Promise((resolve) => 
            setTimeout(() => resolve({ success: false, error: 'Timeout' }), 10000) // 10 second timeout
          )
          
          const claimResult = await Promise.race([claimPromise, timeoutPromise]) as any
          
          if (claimResult.success && claimResult.claimed > 0) {
            console.log(`✅ Successfully claimed ${claimResult.claimed} energy.`)
            // Wait 2 seconds after successful claiming
            await new Promise(resolve => setTimeout(resolve, 2000))
          } else {
            console.log(`⚠️ Energy claiming failed or timed out: ${claimResult.error}. Continuing anyway...`)
          }
        } catch (error) {
          console.log(`⚠️ Energy claiming error: ${error}. Continuing anyway...`)
        }
      } else {
        console.log('🏁 First run - skipping energy claiming to start immediately')
      }
      
      // Try to start a run
      const runResult = await tryStartSingleRun()
      
      if (runResult.success) {
        // Run was started successfully, now run the game loop
        const gameStats = await runSingleGame(runResult.actionToken, runResult.gameState)
        runStats.push(gameStats)
        successfulRuns++
        
        // Check if we should continue
        if (runAttempt >= runCount) {
          continueRunning = false
        }
      } else {
        // Run failed to start - try to claim energy on failure (with timeout)
        console.log(`❌ Failed to start run. Error: ${runResult.error}`)
        
        // Check if the error suggests insufficient energy
        const errorSuggestsEnergyIssue = runResult.error.toLowerCase().includes('energy') || 
                                        runResult.error.toLowerCase().includes('insufficient')
        
        if (errorSuggestsEnergyIssue) {
          console.log('⚠️ Error suggests energy issue. Attempting to claim energy...')
          
          try {
            // Set a timeout for energy claiming to prevent getting stuck
            const claimPromise = claimEnergy(energyThreshold)
            const timeoutPromise = new Promise((resolve) => 
              setTimeout(() => resolve({ success: false, error: 'Timeout' }), 10000) // 10 second timeout
            )
            
            const claimResult = await Promise.race([claimPromise, timeoutPromise]) as any
            
            if (claimResult.success && claimResult.claimed > 0) {
              console.log(`✅ Successfully claimed ${claimResult.claimed} energy. Retrying run...`)
              
              // Wait 2 seconds after claiming
              await new Promise(resolve => setTimeout(resolve, 2000))
              
              // Try one more time
              const retryResult = await tryStartSingleRun()
              
              if (retryResult.success) {
                const gameStats = await runSingleGame(retryResult.actionToken, retryResult.gameState)
                runStats.push(gameStats)
                successfulRuns++
                
                // Check if we should continue after this successful retry
                if (runAttempt >= runCount) {
                  continueRunning = false
                }
              } else {
                console.log(`❌ Failed to start run even after claiming energy. Error: ${retryResult.error}`)
                continueRunning = false
              }
            } else {
              console.log('❌ Could not claim sufficient energy. Stopping runs.')
              continueRunning = false
            }
          } catch (error) {
            console.log(`❌ Energy claiming failed: ${error}. Stopping runs.`)
            continueRunning = false
          }
        } else {
          console.log('❌ Error does not appear to be energy-related. Stopping runs.')
          continueRunning = false
        }
      }
      
      runAttempt++
      
      if (continueRunning && runAttempt <= runCount) {
        // Add delay between runs
        console.log('\n⏳ Waiting for 5 seconds before starting the next run...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
    
    // Display session summary when all runs complete
    setSessionStats(runStats)
    displaySessionSummary(runStats, successfulRuns, runAttempt - 1)
    
    // Reset current run number
    setCurrentRunNumber(0)
    setIsRunning(false)
  }

  const tryStartSingleRun = async () => {
    try {
      console.log(`🎯 Attempting to start ${currentMode} mode run...`)
      
      const jwtToken = getJWTToken()
      const response = await fetch('/api/dungeon', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          action: 'start_run',
          mode: currentMode
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ HTTP error ${response.status}:`, errorText)
        return { success: false, error: `HTTP ${response.status}: ${errorText}` }
      }
      
      const data = await response.json()
      console.log('📊 Start run response:', data)
      
      if (!data.success) {
        console.error('❌ Start run failed:', data.error || data.message)
        return { success: false, error: data.error || data.message || 'Unknown error' }
      }
      
      console.log('✅ Successfully started run!')
      return {
        success: true,
        actionToken: data.actionToken,
        gameState: data.gameState
      }
    } catch (error) {
      console.error('❌ Exception during start run:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  const runSingleGame = async (actionToken: string, initialGameState: any) => {
    console.log('🎮 Starting automated game loop with action token:', actionToken)
    
    // Reset game state for this run
    setGameState(null)
    setRoundHistory([])
    setMoveSnapshots([])
    setCurrentRound(0)
    
    // Set initial game state from the start run response
    if (initialGameState) {
      setGameState(initialGameState)
      console.log('Initial game state set:', initialGameState)
    }
    
    // Start the automated game loop with the provided action token
    let currentActionToken = actionToken
    let currentGameState = initialGameState
    let gameRunning = true
    let roundCount = 0
    let enemiesDefeated = 0
    let finalFloor = initialGameState?.current_floor || 1
    let finalRoom = initialGameState?.current_room || 1
    let lootHistory: string[] = []
    
    while (gameRunning && !isPaused) {
      try {
        console.log(`🎯 Round ${roundCount + 1}: Player HP=${currentGameState?.player_health}, Enemy HP=${currentGameState?.enemy_health}`)
        
        // Check if game is already over
        if (!currentGameState || currentGameState.player_health <= 0 || currentGameState.enemy_health <= 0) {
          console.log('Game over detected:', { 
            playerHealth: currentGameState?.player_health, 
            enemyHealth: currentGameState?.enemy_health 
          })
          break
        }
        
        // Step 1: Calculate best move using MCTS
        console.log('🧠 Calculating best move...')
        const jwtToken = getJWTToken()
        const moveResponse = await fetch('/api/dungeon', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({
            action: 'calculate_move',
            gameState: currentGameState
          })
        })
        
        if (!moveResponse.ok) {
          const txt = await moveResponse.text()
          console.error('Failed to calculate move:', moveResponse.status, txt)
          // If MCTS is heavy, retry once with fewer iterations via hint
          await new Promise(r => setTimeout(r, 200))
          continue
        }
        
        const moveData = await moveResponse.json()
        if (!moveData.success) {
          console.error('Move calculation failed:', moveData.error)
          break
        }
        
        const bestMove = moveData.bestMove
        console.log(`🎯 MCTS selected move: ${bestMove}`)
        setLastMove(bestMove)
        
        // Small delay to show the calculated move
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Step 2: Execute the move
        console.log('⚔️ Executing move...')
        // Capture pre-state snapshot before executing the move
        const preState = currentGameState ? { ...currentGameState } : null
        const executeResponse = await fetch('/api/dungeon', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({
            action: 'execute_move',
            move: bestMove,
            actionToken: currentActionToken
          })
        })
        
        if (!executeResponse.ok) {
          const txt = await executeResponse.text()
          console.error('Failed to execute move:', executeResponse.status, txt)
          await new Promise(r => setTimeout(r, 200))
          continue
        }
        
        const executeData = await executeResponse.json()
        if (!executeData.success) {
          console.error('Move execution failed:', executeData.error)
          break
        }
        
        // Update action token and game state
        currentActionToken = executeData.actionToken
        const newGameState = executeData.gameState
        currentGameState = newGameState
        
        // Update UI state
        if (currentGameState) {
          setGameState(currentGameState)
          finalFloor = currentGameState.current_floor || finalFloor
          finalRoom = currentGameState.current_room || finalRoom
        }
        
        // Add to round history and move snapshots
        if (executeData.roundResult) {
          setRoundHistory(prev => [...prev, executeData.roundResult])
          console.log(`Round result: ${executeData.roundResult.playerMove} vs ${executeData.roundResult.enemyMove} = ${executeData.roundResult.result}`)
          setMoveSnapshots(prev => ([
            ...prev,
            {
              index: (prev.at(-1)?.index || 0) + 1,
              gameState: preState || currentGameState,
              lastMove: executeData.roundResult.playerMove
            }
          ]))
        }
        
        roundCount++
        setCurrentRound(roundCount)
        
        // Step 3: Handle loot selection if we entered loot phase
        if (executeData.lootPhase && executeData.lootOptions) {
          console.log('🎁 Entered loot phase, auto-selecting best loot...')
          enemiesDefeated++
          setLastMove('Selecting loot...')
          
          // Auto-select best loot option
          const lootResponse = await fetch('/api/dungeon', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
              action: 'auto_select_loot',
              lootOptions: executeData.lootOptions,
              // Always pass the latest token; backend may return the next token on loot
              actionToken: currentActionToken || undefined,
              gameState: currentGameState
            })
          })
          
          if (!lootResponse.ok) {
            console.error('Failed to select loot:', lootResponse.status)
            break
          }
          
          const lootData = await lootResponse.json()
          if (!lootData.success) {
            console.error('Loot selection failed:', lootData.error)
            break
          }
          
          // Update with post-loot state
          if (lootData.actionToken) {
            currentActionToken = lootData.actionToken
          }
          if (lootData.gameState) {
            currentGameState = lootData.gameState
            setGameState(currentGameState)
          }
          
          // Log loot selection
          if (lootData.selectedLoot) {
            const lootDesc = getLootDescription(lootData.selectedLoot)
            lootHistory.push(lootDesc)
            console.log(`🎁 Selected loot: ${lootDesc}`)
            setSuccess(`🎁 Selected loot: ${lootDesc}`)
          }
          
          // Small delay after loot selection
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        // Check if enemy was defeated (for stats tracking)
        if (currentGameState && currentGameState.enemy_health <= 0 && !executeData.lootPhase) {
          enemiesDefeated++
        }
        
        // Add a small delay between rounds to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        console.error('Error in automated game loop:', error)
        break
      }
    }
    
    console.log(`🏁 Game completed! Enemies defeated: ${enemiesDefeated}, Rounds: ${roundCount}`)
    
    // Return game statistics
    return {
      mode: currentMode,
      enemies_defeated: enemiesDefeated,
      final_floor: finalFloor,
      final_room: finalRoom,
      rounds: roundCount,
      loot_history: lootHistory
    }
  }

  const displaySessionSummary = (runStats: any[], successfulRuns: number, attemptedRuns: number) => {
    if (!runStats || runStats.length === 0) {
      console.log('\n❌ No successful runs to summarize.')
      return
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('🎮 MULTI-RUN SESSION SUMMARY 🎮')
    console.log('='.repeat(60))
    
    console.log('\nSESSION OVERVIEW:')
    console.log(`  Successful Runs: ${successfulRuns}/${attemptedRuns}`)
    
    // Calculate aggregate stats
    const totalEnemies = runStats.reduce((sum, run) => sum + run.enemies_defeated, 0)
    const avgEnemies = totalEnemies / runStats.length
    const bestRun = runStats.reduce((best, current) => 
      (current.final_floor > best.final_floor || 
       (current.final_floor === best.final_floor && current.final_room > best.final_room) ||
       (current.final_floor === best.final_floor && current.final_room === best.final_room && current.enemies_defeated > best.enemies_defeated))
        ? current : best
    )
    
    console.log(`  Total Enemies Defeated: ${totalEnemies}`)
    console.log(`  Average Enemies per Run: ${avgEnemies.toFixed(1)}`)
    
    console.log('\nBEST RUN:')
    console.log(`  Mode: ${bestRun.mode.toUpperCase()}`)
    console.log(`  Enemies Defeated: ${bestRun.enemies_defeated}`)
    console.log(`  Final Location: Floor ${bestRun.final_floor}, Room ${bestRun.final_room}`)
    
    if (bestRun.loot_history && bestRun.loot_history.length > 0) {
      console.log('\nLoot from Best Run:')
      bestRun.loot_history.forEach((loot: string, index: number) => {
        console.log(`  ${index + 1}. ${loot}`)
      })
    }
  }

  const startNewRun = async () => {
    // Check if player has enough energy for selected mode
    const modeConfig = getCurrentModeConfig()
    if (!hasEnoughEnergy()) {
      setError(`Not enough energy! Need ${modeConfig.energyCost}⚡ but only have ${playerEnergy}⚡`)
      return
    }
    
    if (multiRunMode) {
      // Start multiple runs
      console.log(`🚀 Starting multi-run mode: ${runCount} runs in ${currentMode.toUpperCase()} mode`)
      setIsRunning(true)
      setIsPaused(false)
      setError('')
      setSuccess('')
      setCurrentRunNumber(1) // Show we're starting
      await startMultipleRuns()
    } else {
      // Start single run using the same automated logic as multi-run
      console.log(`🚀 Starting single run in ${currentMode.toUpperCase()} mode`)
      setIsRunning(true)
      setIsPaused(false)
      setError('')
      setSuccess('')
      setRoundHistory([])
      setCurrentRound(0)
      setLastMove('')
      setCurrentRunNumber(1)
      
      try {
        // Start the run
        const jwtToken = getJWTToken()
        const response = await fetch('/api/dungeon', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({
            action: 'start_run',
            mode: currentMode,
            selectedPotions
          })
        })
        
        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error)
        }
        
        // Check if we started in loot phase (previous run not completed)
        if (data.lootPhase && data.lootOptions) {
          console.log('Started in loot phase, auto-selecting loot first...')
          
          // Auto-select best loot option
          const lootResponse = await fetch('/api/dungeon', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
              action: 'auto_select_loot',
              lootOptions: data.lootOptions,
              actionToken: data.actionToken,
              gameState: null // No game state yet
            })
          })
          
          const lootData = await lootResponse.json()
          if (!lootData.success) {
            throw new Error(lootData.error)
          }
          
          // Use the post-loot state to start the automated game
          const gameStats = await runSingleGame(lootData.actionToken, lootData.gameState)
          
          // Display results
          setSuccess(`🎉 Single run completed! Enemies defeated: ${gameStats.enemies_defeated}, Final location: Floor ${gameStats.final_floor}, Room ${gameStats.final_room}`)
          setIsRunning(false)
          return
        }
        
        // If token missing, derive it by making a tiny no-op and reading returned token
        let startToken = data.actionToken
        if (!startToken) {
          try {
            const probe = await fetch('/api/dungeon', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
              },
              body: JSON.stringify({ action: 'calculate_move', gameState: data.gameState })
            })
            await probe.json()
          } catch {}
        }
        const gameStats = await runSingleGame(startToken || data.actionToken, data.gameState)
        
        // Display results (guard: if no rounds, treat as failure)
        if (gameStats.rounds > 0) {
          setSuccess(`🎉 Single run completed! Enemies defeated: ${gameStats.enemies_defeated}, Final location: Floor ${gameStats.final_floor}, Room ${gameStats.final_room}`)
        } else {
          setError('Run started but did not progress. Check Network tab for execute_move errors. I will keep logs visible.')
        }
        setIsRunning(false)
        
      } catch (error) {
        console.error('Single run error:', error)
        setError(error instanceof Error ? error.message : 'Failed to complete single run')
        setIsRunning(false)
      }
    }
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  const stopRun = () => {
    setIsRunning(false)
    setIsPaused(false)
    setIsCalculating(false)
  }

  const getMoveIcon = (move: string) => {
    switch (move) {
      case 'rock': return Sword
      case 'paper': return Shield
      case 'scissor': return Scissors
      default: return Target
    }
  }

  const getMoveColor = (move: string) => {
    switch (move) {
      case 'rock': return 'text-red-400 border-red-400 bg-red-400/10'
      case 'paper': return 'text-cyan-400 border-cyan-400 bg-cyan-400/10'
      case 'scissor': return 'text-yellow-400 border-yellow-400 bg-yellow-400/10'
      default: return 'text-gray-400 border-gray-400 bg-gray-400/10'
    }
  }

  const getChargeStatus = (charge: number) => {
    if (charge === 3) return { color: 'text-green-400', status: 'FULL' }
    if (charge === 2) return { color: 'text-yellow-400', status: 'GOOD' }
    if (charge === 1) return { color: 'text-red-400', status: 'LOW' }
    return { color: 'text-gray-400', status: 'EMPTY' }
  }

  const getHealthPercentage = (current: number, max: number) => {
    return Math.max(0, (current / max) * 100)
  }

  const getLootDescription = (loot: any) => {
    if (!loot) return 'Unknown'
    const boonType = loot.boonTypeString || 'Unknown'
    const val1 = loot.selectedVal1 || 0
    const val2 = loot.selectedVal2 || 0
    
    switch (boonType) {
      case 'UpgradeRock': return `Rock +${val1 + val2} ATK/DEF`
      case 'UpgradePaper': return `Paper +${val1 + val2} ATK/DEF`
      case 'UpgradeScissor': return `Scissor +${val1 + val2} ATK/DEF`
      case 'AddMaxHealth': return `+${val1} Max Health`
      case 'AddMaxShield': return `+${val1} Max Shield`
      case 'Heal': return `Heal ${val1} HP`
      case 'Shield': return `+${val1} Shield`
      default: return boonType
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-black/90 border-2 border-cyan-400/50 rounded-none w-full h-full overflow-hidden"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative border-b border-white/10 px-6 py-4 bg-black/60">
              {/* soft neon sweep */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-rose-500/10" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-cyan-500/15 border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
                    <Sword className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-cyan-300 font-semibold">Gigaverse Dungeon Bot</div>
                    <div className="text-[12px] text-white/50">MCTS‑powered automated runner</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-3 text-xs font-mono text-white/60">
                    <span className="px-2.5 py-0.5 rounded-full border border-emerald-400/30 text-emerald-300">Wins {runStats.wins}</span>
                    <span className="px-2.5 py-0.5 rounded-full border border-rose-400/30 text-rose-300">Losses {runStats.losses}</span>
                    <span className="px-2.5 py-0.5 rounded-full border border-white/15">Avg {runStats.averageRounds.toFixed(1)}</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-white/50 hover:text-white/80 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            {/* accent line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            {/* Controls */}
            <div className="px-6 py-3 border-b border-white/10 bg-black/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Mode Selection */}
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 font-mono text-sm">Mode:</span>
                  <div className="relative">
                      <button
                        onClick={() => setShowModeSelector(!showModeSelector)}
                        disabled={isRunning}
                    className={`px-4 py-1.5 rounded-full font-mono text-sm transition-colors flex items-center space-x-2 disabled:opacity-50 ${
                          getCurrentModeConfig().bgColor
                        } ${getCurrentModeConfig().borderColor} ${getCurrentModeConfig().textColor} border`}
                      >
                        {React.createElement(getCurrentModeConfig().icon, { className: "w-4 h-4" })}
                        <span>{getCurrentModeConfig().displayName}</span>
                        <span className="text-xs opacity-70">({getCurrentModeConfig().energyCost}⚡)</span>
                        <ChevronRight className={`w-3 h-3 transition-transform ${showModeSelector ? 'rotate-90' : ''}`} />
                      </button>
                      
                      {showModeSelector && (
                        <div className="absolute top-full left-0 mt-2 w-80 bg-black/95 border border-cyan-400/50 rounded-lg z-10 p-3 space-y-2">
                          {Object.entries(DUNGEON_MODES).map(([key, mode]) => {
                            const canAfford = playerEnergy >= mode.energyCost
                            const isSelected = currentMode === key
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  setCurrentMode(key as DungeonMode)
                                  setShowModeSelector(false)
                                }}
                                disabled={isRunning || !canAfford}
                                className={`w-full p-3 rounded text-left transition-colors disabled:opacity-50 ${
                                  isSelected ? mode.bgColor : 'bg-gray-800/50 hover:bg-gray-700/50'
                                } ${
                                  isSelected ? mode.borderColor : 'border-gray-600'
                                } border ${
                                  !canAfford ? 'border-red-400/50' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    {React.createElement(mode.icon, { 
                                      className: `w-5 h-5 ${isSelected ? mode.textColor : 'text-gray-400'}` 
                                    })}
                                    <div>
                                      <div className={`font-mono font-bold ${isSelected ? mode.textColor : 'text-white'}`}>
                                        {mode.displayName}
                                      </div>
                                      <div className="text-xs text-gray-400 mt-1">
                                        {mode.description}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`font-mono text-sm ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                                      {mode.energyCost}⚡
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {mode.maxRuns} runs/day
                                    </div>
                                  </div>
                                </div>
                                {!canAfford && (
                                  <div className="text-xs text-red-400 mt-2">
                                    Need {mode.energyCost - playerEnergy} more energy
                                  </div>
                                )}
                              </button>
                            )
                          })}
                          <div className="border-t border-gray-600 pt-2 mt-2">
                            <div className="text-xs text-gray-400 font-mono">
                              Current Energy: <span className="text-green-400">{playerEnergy}⚡</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Potion Selection */}
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 font-mono text-sm">Potions:</span>
                  <div className="flex items-center space-x-1">
                      {selectedPotions.map((potionId, index) => (
                        <button
                          key={index}
                          onClick={() => setShowPotionSelector(true)}
                          disabled={isRunning}
                        className={`w-8 h-8 rounded-full border transition-colors disabled:opacity-50 ${
                            potionId === 0 
                              ? 'border-gray-600 bg-gray-800/50 text-gray-400' 
                              : (() => {
                                  const potion = getPotionById(potionId)
                                  return potion ? getPotionColor(potion.type) : 'border-gray-600 bg-gray-800/50 text-gray-400'
                                })()
                          }`}
                          title={potionId === 0 ? 'Empty slot' : getPotionById(potionId)?.name || 'Unknown'}
                        >
                          {potionId === 0 ? (
                            <div className="text-xs">⚫</div>
                          ) : (
                            (() => {
                              const potion = getPotionById(potionId)
                              const Icon = potion ? getPotionIcon(potion.type) : Target
                              return <Icon className="w-4 h-4" />
                            })()
                          )}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowPotionSelector(true)}
                        disabled={isRunning}
                      className="px-3 py-1 border border-gray-600 rounded-full text-gray-400 hover:border-cyan-400 hover:text-cyan-400 transition-colors text-xs font-mono disabled:opacity-50"
                      >
                        EDIT
                      </button>
                    </div>
                  </div>

                  {/* Multi-Run Toggle */}
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 font-mono text-sm">Multi-Run:</span>
                    <button
                      onClick={() => setMultiRunMode(!multiRunMode)}
                      disabled={isRunning}
                      className={`px-3 py-1 border rounded-full font-mono text-sm transition-colors disabled:opacity-50 ${
                        multiRunMode 
                          ? 'border-green-400 text-green-400 bg-green-400/10' 
                          : 'border-gray-600 text-gray-400 hover:border-cyan-400 hover:text-cyan-400'
                      }`}
                    >
                      {multiRunMode ? 'ON' : 'OFF'}
                    </button>
                  </div>

                                        {/* Run Count (only show when multi-run is enabled) */}
                  {multiRunMode && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 font-mono text-sm">Runs:</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={runCount}
                        onChange={(e) => setRunCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                        disabled={isRunning}
                        className="w-16 px-2 py-1 bg-black/60 border border-gray-600 rounded font-mono text-sm text-white focus:border-cyan-400 focus:outline-none disabled:opacity-50"
                      />
                      <span className="text-gray-400 font-mono text-xs">
                        (max 50)
                      </span>
                    </div>
                  )}

                  {/* Control Buttons */}
                  <div className="flex items-center space-x-2">
                    {!isRunning ? (
                      <button
                        onClick={startNewRun}
                        className="px-5 py-1.5 bg-emerald-500/15 border border-emerald-400/40 rounded-full text-emerald-300 hover:bg-emerald-500/25 transition-colors font-mono text-sm flex items-center space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                      >
                        <Play className="w-4 h-4" />
                        <span>{multiRunMode ? `START ${runCount} RUNS` : 'START RUN'}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={togglePause}
                          className={`px-5 py-1.5 border rounded-full font-mono text-sm flex items-center space-x-2 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.08)] ${
                            isPaused 
                              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25'
                              : 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
                          }`}
                        >
                          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                          <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
                        </button>
                        <button
                          onClick={stopRun}
                          className="px-5 py-1.5 bg-rose-500/15 border border-rose-400/40 rounded-full text-rose-300 hover:bg-rose-500/25 transition-colors font-mono text-sm flex items-center space-x-2 shadow-[0_0_20px_rgba(244,63,94,0.10)]"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>STOP</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-6 text-sm font-mono">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isRunning && !isPaused ? 'bg-green-400 animate-pulse' : 
                      isPaused ? 'bg-yellow-400' : 'bg-gray-400'
                    }`} />
                    <span className="text-gray-400">
                      {isRunning && !isPaused ? 'RUNNING' : isPaused ? 'PAUSED' : 'IDLE'}
                    </span>
                  </div>
                  {gameState && (
                    <div className="px-3 py-1 rounded-full border border-cyan-400/40 text-cyan-300/90 shadow-[0_0_16px_rgba(34,211,238,0.10)]">
                      Floor {gameState.current_floor} • Room {gameState.current_room}
                    </div>
                  )}
                  {multiRunMode && currentRunNumber > 0 && (
                    <span className="text-orange-400">
                      Run {currentRunNumber}/{runCount}
                    </span>
                  )}
                  {isClaimingEnergy && (
                    <span className="text-yellow-400 animate-pulse">
                      🔋 CLAIMING ENERGY...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 gap-6 h-[calc(100vh-180px)] overflow-y-auto">
              {/* Left: Game State + Vertical Stream */}
              <div className="xl:col-span-2 space-y-6">
                {gameState ? (
                  <DungeonBattle
                    gameState={gameState as any}
                    lastMove={lastMove}
                    isCalculating={isCalculating}
                  />
                ) : (
                  <div className="bg-black/60 border border-gray-600 p-8 rounded text-center">
                    <Sword className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-mono">NO ACTIVE DUNGEON RUN</p>
                    <p className="text-gray-500 font-mono text-sm mt-2">
                      Start a new run to begin automated dungeon crawling
                    </p>
                  </div>
                )}

                {/* Vertical Move Stream */}
                <MoveStream snapshots={moveSnapshots as any} />
              </div>

              {/* Full-width Session Summary (optional) */}
              {sessionStats.length > 0 && (
                <div className="bg-black/60 border border-green-400/30 p-4 rounded">
                  <h4 className="text-green-400 font-mono font-bold mb-4 flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>SESSION SUMMARY</span>
                  </h4>
                  <div className="space-y-3 text-sm font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Completed Runs:</span>
                      <span className="text-green-400">{sessionStats.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Enemies:</span>
                      <span className="text-red-400">{sessionStats.reduce((sum, run) => sum + run.enemies_defeated, 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Full-width Messages */}
              {(error || success) && (
                <div className="space-y-3">
                  {error && (
                    <div className="bg-red-900/30 border border-red-400/50 p-4 rounded">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 font-mono font-bold text-sm">ERROR</span>
                      </div>
                      <p className="text-red-300 font-mono text-sm mt-2">{error}</p>
                      <button
                        onClick={() => setError('')}
                        className="mt-3 px-3 py-1 bg-red-400/20 border border-red-400/50 rounded text-red-400 hover:bg-red-400/30 transition-colors font-mono text-xs"
                      >
                        DISMISS
                      </button>
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-900/30 border border-green-400/50 p-4 rounded">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-mono font-bold text-sm">SUCCESS</span>
                      </div>
                      <p className="text-green-300 font-mono text-sm mt-2">{success}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-cyan-400/20 p-4 bg-black/40">
              <div className="flex items-center justify-between text-sm font-mono">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400">
                    Algorithm: <span className="text-cyan-400">Monte Carlo Tree Search</span>
                  </span>
                  <span className="text-gray-400">
                    Iterations: <span className="text-cyan-400">100,000</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400">LIVE GAME DATA</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Potion Selection Modal */}
      {showPotionSelector && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowPotionSelector(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-black/95 border-2 border-purple-400/50 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-purple-400/30 p-6 bg-gradient-to-r from-purple-400/10 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-400/20 border border-purple-400/50 rounded-full">
                    <Heart className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-purple-400 font-mono tracking-wider">
                      POTION SELECTION
                    </h2>
                    <p className="text-purple-300/70 font-mono">Select up to 3 potions for your dungeon run</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPotionSelector(false)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Current Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-purple-400 font-mono mb-4">CURRENT LOADOUT</h3>
                <div className="grid grid-cols-3 gap-4">
                  {selectedPotions.map((potionId, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded border-2 transition-colors ${
                        potionId === 0 
                          ? 'border-gray-600 bg-gray-800/50' 
                          : 'border-purple-400/50 bg-purple-400/10'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-sm text-gray-400 font-mono mb-2">Slot {index + 1}</div>
                        {potionId === 0 ? (
                          <div className="text-gray-500 font-mono">Empty</div>
                        ) : (
                          (() => {
                            const potion = getPotionById(potionId)
                            if (!potion) return <div className="text-red-400">Unknown</div>
                            const Icon = getPotionIcon(potion.type)
                            return (
                              <div className="space-y-2">
                                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                                  getPotionColor(potion.type)
                                }`}>
                                  <Icon className="w-6 h-6" />
                                </div>
                                <div className="text-sm font-mono text-white">{potion.name}</div>
                                {potion.heal > 0 && (
                                  <div className="text-xs text-green-400">+{potion.heal} HP</div>
                                )}
                              </div>
                            )
                          })()
                        )}
                        <button
                          onClick={() => selectPotionForSlot(index, 0)}
                          className="mt-2 px-3 py-1 text-xs font-mono text-red-400 border border-red-400/50 rounded hover:bg-red-400/10 transition-colors"
                        >
                          CLEAR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Potions */}
              <div>
                <h3 className="text-lg font-bold text-purple-400 font-mono mb-4">AVAILABLE POTIONS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availablePotions.map((potion) => (
                    <div
                      key={potion.itemId}
                      className={`p-4 rounded border-2 transition-colors ${
                        getPotionColor(potion.type)
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          getPotionColor(potion.type)
                        }`}>
                          {React.createElement(getPotionIcon(potion.type), { className: "w-5 h-5" })}
                        </div>
                        <div className="flex-1">
                          <div className="font-mono font-bold text-white">{potion.name}</div>
                          <div className="text-xs text-gray-400">
                            {potion.heal > 0 ? `+${potion.heal} HP` : potion.type}
                          </div>
                          <div className="text-xs text-gray-400">
                            Available: {potion.balance - selectedPotions.filter(p => p === potion.itemId).length}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1">
                          {[0, 1, 2].map(slotIndex => (
                            <button
                              key={slotIndex}
                              onClick={() => selectPotionForSlot(slotIndex, potion.itemId)}
                              disabled={!canAffordPotion(potion.itemId)}
                              className={`px-2 py-1 text-xs font-mono rounded transition-colors disabled:opacity-50 ${
                                selectedPotions[slotIndex] === potion.itemId
                                  ? 'bg-green-400/20 text-green-400 border border-green-400/50'
                                  : 'bg-gray-800/50 text-gray-400 border border-gray-600 hover:border-cyan-400 hover:text-cyan-400'
                              }`}
                            >
                              Slot {slotIndex + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-purple-400/20 p-4 bg-black/40">
              <div className="flex items-center justify-between">
                <div className="text-sm font-mono text-gray-400">
                  {selectedPotions.filter(p => p !== 0).length}/3 slots filled
                </div>
                <button
                  onClick={() => setShowPotionSelector(false)}
                  className="px-6 py-2 bg-green-400/20 border border-green-400/50 rounded text-green-400 hover:bg-green-400/30 transition-colors font-mono"
                >
                  CONFIRM SELECTION
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default DungeonRunner 