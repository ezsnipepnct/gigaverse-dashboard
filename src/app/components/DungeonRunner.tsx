'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  BarChart3
} from 'lucide-react'

interface DungeonRunnerProps {
  isOpen: boolean
  onClose: () => void
}

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
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jwt_token') || ''
    }
    return ''
  }

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [actionToken, setActionToken] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentMode, setCurrentMode] = useState<'normal' | 'gigus'>('normal')
  const [multiRunMode, setMultiRunMode] = useState(false)
  const [runCount, setRunCount] = useState(5)
  const [currentRunNumber, setCurrentRunNumber] = useState(0)
  const [sessionStats, setSessionStats] = useState<any[]>([])
  const [isClaimingEnergy, setIsClaimingEnergy] = useState(false)
  const [roundHistory, setRoundHistory] = useState<RoundResult[]>([])
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
          
          // Add to round history
          if (executeData.roundResult) {
            setRoundHistory(prev => [...prev, executeData.roundResult])
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
          console.error('Failed to calculate move:', moveResponse.status)
          break
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
          console.error('Failed to execute move:', executeResponse.status)
          break
        }
        
        const executeData = await executeResponse.json()
        if (!executeData.success) {
          console.error('Move execution failed:', executeData.error)
          break
        }
        
        // Update action token and game state
        currentActionToken = executeData.actionToken
        currentGameState = executeData.gameState
        
        // Update UI state
        if (currentGameState) {
          setGameState(currentGameState)
          finalFloor = currentGameState.current_floor || finalFloor
          finalRoom = currentGameState.current_room || finalRoom
        }
        
        // Add to round history
        if (executeData.roundResult) {
          setRoundHistory(prev => [...prev, executeData.roundResult])
          console.log(`Round result: ${executeData.roundResult.playerMove} vs ${executeData.roundResult.enemyMove} = ${executeData.roundResult.result}`)
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
              actionToken: currentActionToken,
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
          currentActionToken = lootData.actionToken
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
            mode: currentMode
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
        
        // Run the automated game loop
        const gameStats = await runSingleGame(data.actionToken, data.gameState)
        
        // Display results
        setSuccess(`🎉 Single run completed! Enemies defeated: ${gameStats.enemies_defeated}, Final location: Floor ${gameStats.final_floor}, Room ${gameStats.final_room}`)
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-black/90 border-2 border-cyan-400/50 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden"
            style={{
              clipPath: 'polygon(20px 0%, 100% 0%, calc(100% - 20px) 100%, 0% 100%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-cyan-400/30 p-6 bg-gradient-to-r from-cyan-400/10 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-cyan-400/20 border border-cyan-400/50 rounded-full">
                    <Sword className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-cyan-400 font-mono tracking-wider neon-pulse">
                      GIGAVERSE DUNGEON BOT
                    </h2>
                    <p className="text-cyan-300/70 font-mono">MCTS-POWERED AUTOMATED DUNGEON RUNNER</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right text-sm font-mono">
                    <div className="text-green-400">Wins: {runStats.wins}</div>
                    <div className="text-red-400">Losses: {runStats.losses}</div>
                    <div className="text-gray-400">Avg Rounds: {runStats.averageRounds.toFixed(1)}</div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="p-6 border-b border-cyan-400/20 bg-black/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Mode Selection */}
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 font-mono text-sm">Mode:</span>
                    <select
                      value={currentMode}
                      onChange={(e) => setCurrentMode(e.target.value as 'normal' | 'gigus')}
                      disabled={isRunning}
                      className="px-3 py-1 bg-black/60 border border-gray-600 rounded font-mono text-sm text-white focus:border-cyan-400 focus:outline-none disabled:opacity-50"
                    >
                      <option value="normal">Normal Mode</option>
                      <option value="gigus">Gigus Mode</option>
                    </select>
                  </div>

                  {/* Multi-Run Toggle */}
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 font-mono text-sm">Multi-Run:</span>
                    <button
                      onClick={() => setMultiRunMode(!multiRunMode)}
                      disabled={isRunning}
                      className={`px-3 py-1 border rounded font-mono text-sm transition-colors disabled:opacity-50 ${
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
                        className="px-4 py-2 bg-green-400/20 border border-green-400/50 rounded text-green-400 hover:bg-green-400/30 transition-colors font-mono text-sm flex items-center space-x-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>{multiRunMode ? `START ${runCount} RUNS` : 'START RUN'}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={togglePause}
                          className={`px-4 py-2 border rounded font-mono text-sm flex items-center space-x-2 transition-colors ${
                            isPaused 
                              ? 'bg-green-400/20 border-green-400/50 text-green-400 hover:bg-green-400/30'
                              : 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/30'
                          }`}
                        >
                          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                          <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
                        </button>
                        <button
                          onClick={stopRun}
                          className="px-4 py-2 bg-red-400/20 border border-red-400/50 rounded text-red-400 hover:bg-red-400/30 transition-colors font-mono text-sm flex items-center space-x-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>STOP</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-4 text-sm font-mono">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isRunning && !isPaused ? 'bg-green-400 animate-pulse' : 
                      isPaused ? 'bg-yellow-400' : 'bg-gray-400'
                    }`} />
                    <span className="text-gray-400">
                      {isRunning && !isPaused ? 'RUNNING' : isPaused ? 'PAUSED' : 'IDLE'}
                    </span>
                  </div>
                  {multiRunMode && currentRunNumber > 0 && (
                    <span className="text-orange-400">
                      Run {currentRunNumber}/{runCount}
                    </span>
                  )}
                  {gameState && (
                    <span className="text-cyan-400">Floor {gameState?.current_floor || 1} - Room {gameState?.current_room || 1}</span>
                  )}
                  {isClaimingEnergy && (
                    <span className="text-yellow-400 animate-pulse">
                      🔋 CLAIMING ENERGY...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* Game State */}
              <div className="lg:col-span-2 space-y-6">
                {gameState ? (
                  <>
                    {/* Combat Display */}
                                <div className="bg-black/60 border border-cyan-400/30 p-6 rounded">
              <h3 className="text-xl font-bold text-cyan-400 font-mono mb-6 flex items-center space-x-2">
                        <Crosshair className="w-5 h-5" />
                        <span>COMBAT STATUS</span>
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-8">
                                                {/* Player */}
                        <div className="space-y-4">
                          <h4 className="text-green-400 font-mono font-bold text-center">PLAYER</h4>
                          
                          {/* Health Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm font-mono">
                              <span className="text-gray-400">Health</span>
                              <span className="text-green-400">{gameState.player_health}/{gameState.player_max_health}</span>
                            </div>
                            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
                                style={{ width: `${getHealthPercentage(gameState.player_health, gameState.player_max_health)}%` }}
                              />
                            </div>
                          </div>

                          {/* Shield Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm font-mono">
                              <span className="text-gray-400">Shield</span>
                              <span className="text-cyan-400">{gameState.player_shield}/{gameState.player_max_shield}</span>
                            </div>
                            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                                                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
                                style={{ width: `${getHealthPercentage(gameState.player_shield, gameState.player_max_shield)}%` }}
                              />
                            </div>
                          </div>

                          {/* Move Stats */}
                          <div className="space-y-3">
                            {Object.entries(gameState.player_move_stats).map(([move, stats]) => {
                               const Icon = getMoveIcon(move)
                               const charge = gameState.player_charges[move as keyof typeof gameState.player_charges]
                               const chargeStatus = getChargeStatus(charge)
                              
                              return (
                                <div key={move} className={`p-3 border rounded ${getMoveColor(move)}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <Icon className="w-4 h-4" />
                                      <span className="font-mono text-sm uppercase">{move}</span>
                                    </div>
                                    <div className="text-xs font-mono">
                                      <span className="text-red-300">DMG: {stats.damage}</span>
                                      <span className="text-blue-300 ml-2">DEF: {stats.shield}</span>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between">
                                    <div className="flex space-x-1">
                                      {[1, 2, 3].map(i => (
                                        <div key={i} className={`w-2 h-2 rounded-full ${
                                          i <= charge ? 'bg-current' : 'bg-gray-600'
                                        }`} />
                                      ))}
                                    </div>
                                    <span className={`text-xs font-mono ${chargeStatus.color}`}>
                                      {chargeStatus.status}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Enemy */}
                        <div className="space-y-4">
                          <h4 className="text-red-400 font-mono font-bold text-center">ENEMY</h4>
                          
                          {/* Health Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm font-mono">
                              <span className="text-gray-400">Health</span>
                              <span className="text-red-400">{gameState.enemy_health}/{gameState.enemy_max_health}</span>
                            </div>
                            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                                style={{ width: `${getHealthPercentage(gameState.enemy_health, gameState.enemy_max_health)}%` }}
                              />
                            </div>
                          </div>

                          {/* Shield Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm font-mono">
                              <span className="text-gray-400">Shield</span>
                              <span className="text-purple-400">{gameState.enemy_shield}/{gameState.enemy_max_shield}</span>
                            </div>
                            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500"
                                style={{ width: `${getHealthPercentage(gameState.enemy_shield, gameState.enemy_max_shield)}%` }}
                              />
                            </div>
                          </div>

                          {/* Move Stats */}
                          <div className="space-y-3">
                                                         {Object.entries(gameState.enemy_move_stats).map(([move, stats]) => {
                               const Icon = getMoveIcon(move)
                               const charge = gameState.enemy_charges[move as keyof typeof gameState.enemy_charges]
                               const chargeStatus = getChargeStatus(charge)
                              
                              return (
                                <div key={move} className="p-3 border border-gray-600 bg-gray-600/10 rounded">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <Icon className="w-4 h-4 text-gray-400" />
                                      <span className="font-mono text-sm uppercase text-gray-400">{move}</span>
                                    </div>
                                    <div className="text-xs font-mono">
                                      <span className="text-red-300">DMG: {stats.damage}</span>
                                      <span className="text-blue-300 ml-2">DEF: {stats.shield}</span>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between">
                                    <div className="flex space-x-1">
                                      {[1, 2, 3].map(i => (
                                        <div key={i} className={`w-2 h-2 rounded-full ${
                                          i <= charge ? 'bg-gray-400' : 'bg-gray-600'
                                        }`} />
                                      ))}
                                    </div>
                                    <span className="text-xs font-mono text-gray-400">
                                      {chargeStatus.status}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Current Move */}
                    {(isCalculating || lastMove) && (
                      <div className="bg-black/60 border border-orange-400/30 p-4 rounded">
                        <h4 className="text-orange-400 font-mono font-bold mb-4 flex items-center space-x-2">
                          <Brain className="w-4 h-4" />
                          <span>MCTS ANALYSIS</span>
                        </h4>
                        
                        {isCalculating ? (
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                            <span className="text-orange-400 font-mono">
                              Calculating optimal move... (100,000 iterations)
                            </span>
                          </div>
                        ) : lastMove && (
                          <div className="flex items-center space-x-4">
                            <div className={`p-3 border rounded ${getMoveColor(lastMove)} flex items-center space-x-2`}>
                              {React.createElement(getMoveIcon(lastMove), { className: "w-5 h-5" })}
                              <span className="font-mono font-bold uppercase">{lastMove}</span>
                            </div>
                            <div className="text-sm font-mono text-gray-400">
                              Selected by MCTS algorithm
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-black/60 border border-gray-600 p-8 rounded text-center">
                    <Sword className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-mono">NO ACTIVE DUNGEON RUN</p>
                    <p className="text-gray-500 font-mono text-sm mt-2">
                      Start a new run to begin automated dungeon crawling
                    </p>
                  </div>
                )}
              </div>

              {/* Round History & Stats */}
              <div className="space-y-6">
                {/* Round History */}
                            <div className="bg-black/60 border border-cyan-400/30 p-4 rounded">
              <h4 className="text-cyan-400 font-mono font-bold mb-4 flex items-center space-x-2">
                    <Activity className="w-4 h-4" />
                                          <span>COMBAT HISTORY</span>
                  </h4>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {roundHistory.length === 0 ? (
                      <p className="text-gray-500 font-mono text-sm text-center py-4">
                        No combats yet
                      </p>
                    ) : (
                      roundHistory.slice(-10).reverse().map((round, index) => (
                        <div key={index} className="p-2 bg-black/40 border border-gray-600 rounded">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-mono text-gray-400">
                                R{roundHistory.length - index}
                              </span>
                              <div className="flex items-center space-x-1">
                                {React.createElement(getMoveIcon(round.playerMove), { 
                                  className: `w-3 h-3 ${getMoveColor(round.playerMove).split(' ')[0]}` 
                                })}
                                <span className="text-xs">vs</span>
                                {React.createElement(getMoveIcon(round.enemyMove), { 
                                  className: "w-3 h-3 text-gray-400" 
                                })}
                              </div>
                            </div>
                            <span className={`text-xs font-mono ${
                              round.result === 'VICTORY' ? 'text-green-400' :
                              round.result === 'DEFEAT' ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {round.result}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Session Summary (only show when we have session stats) */}
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
                        <span className="text-red-400">
                          {sessionStats.reduce((sum, run) => sum + run.enemies_defeated, 0)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg Enemies/Run:</span>
                        <span className="text-yellow-400">
                          {(sessionStats.reduce((sum, run) => sum + run.enemies_defeated, 0) / sessionStats.length).toFixed(1)}
                        </span>
                      </div>
                      
                      {(() => {
                        const bestRun = sessionStats.reduce((best, current) => 
                          (current.final_floor > best.final_floor || 
                           (current.final_floor === best.final_floor && current.final_room > best.final_room) ||
                           (current.final_floor === best.final_floor && current.final_room === best.final_room && current.enemies_defeated > best.enemies_defeated))
                            ? current : best
                        )
                        return (
                          <>
                            <div className="border-t border-gray-600 pt-3 mt-3">
                              <div className="text-cyan-400 font-bold mb-2">BEST RUN:</div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Location:</span>
                                                                  <span className="text-cyan-400">Floor {bestRun.final_floor}, Room {bestRun.final_room}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Enemies:</span>
                                <span className="text-red-400">{bestRun.enemies_defeated}</span>
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {/* Messages */}
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
    </AnimatePresence>
  )
}

export default DungeonRunner 