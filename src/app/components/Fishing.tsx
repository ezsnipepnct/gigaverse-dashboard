'use client';

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Fish, 
  Zap, 
  Target, 
  Sparkles,
  Play,
  Pause,
  Settings,
  Waves,
  Activity,
  Gamepad2,
  Cpu,
  Heart,
  Shield,
  Sword,
  Clock,
  Trophy,
  Star,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  Flame,
  Wind,
  Zap as Lightning,
  Snowflake,
  Droplets,
  Mountain,
  TreePine,
  Gem,
  Coins,
  Package,
  BarChart3,
  TrendingUp,
  Calendar,
  Clock3,
  Timer,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff
} from 'lucide-react'
import { agwAuthService } from '@/lib/agw-auth'

interface FishingProps {
  isOpen: boolean
  onClose: () => void
}

interface FishingStats {
  // Player stats
  playerHp?: number
  playerMaxHp?: number
  
  // Fish stats
  fishHp?: number
  fishMaxHp?: number
  fishPosition?: number[]
  previousFishPosition?: number[]
  
  // Deck and cards
  fullDeck?: number[]
  hand?: number[]
  discard?: number[]
  nextCardIndex?: number
  cardInDrawPile?: number
  
  // Game state
  day?: number
  week?: number
  level?: number
  gameId?: string
  gameActive?: boolean
  
  // Derived stats for display
  hand_size?: number
  mana_remaining?: number
  turns_played?: number
  fish_caught?: number
  damage_dealt?: number
  cards_played?: number
  is_base_deck?: boolean
}

interface GameEvent {
  type: string
  category: string
  message: string
  timestamp: number
}

const Fishing: React.FC<FishingProps> = ({ isOpen, onClose }) => {
  const [isGameActive, setIsGameActive] = useState(false)
  const [fishingStats, setFishingStats] = useState<FishingStats>({})
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [isStarting, setIsStarting] = useState(false)
  const [showEventLog, setShowEventLog] = useState(true)
  const [hasActiveGame, setHasActiveGame] = useState(false)
  const [isCheckingForActiveGame, setIsCheckingForActiveGame] = useState(true)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // JWT Token management using AGW auth service
  const getJWTToken = () => {
    return agwAuthService.getJWT() || ''
  }

  // Check for existing active fishing game
  const checkForActiveGame = async () => {
    try {
      console.log('🔍 Checking for active fishing game...')
      setIsCheckingForActiveGame(true)
      const jwtToken = getJWTToken()
      
      if (!jwtToken) {
        console.log('❌ No JWT token available')
        setHasActiveGame(false)
        addEvent('system', 'error', '❌ No JWT token available for game check')
        return
      }

      console.log('🔑 JWT token found, calling fishing state API...')
      const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"
      const response = await fetch(`https://gigaverse.io/api/fishing/state/${WALLET_ADDRESS}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('📡 API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('📊 Full API response:', data)
        
        // FIXED: Check if there's an active game - COMPLETE_CID should be null or false for active games
        const isGameActive = data.gameState?.COMPLETE_CID === null || data.gameState?.COMPLETE_CID === false
        console.log('🎮 Is game active?', isGameActive, 'COMPLETE_CID:', data.gameState?.COMPLETE_CID)
        setHasActiveGame(isGameActive)
        
        // ADDED: Parse daily fishing runs data
        const dailyRuns = data.dayDoc?.UINT256_CID || 0
        const maxRuns = data.maxPerDayJuiced || data.maxPerDay || 10
        
        if (isGameActive) {
          addEvent('system', 'info', '🎮 Active fishing game detected!')
          console.log('Game state data:', data.gameState.data)
          
          // Parse the current game state
          const gameState = data.gameState.data
          const stats: FishingStats = {
            playerHp: gameState.playerHp,
            playerMaxHp: gameState.playerMaxHp,
            fishHp: gameState.fishHp,
            fishMaxHp: gameState.fishMaxHp,
            fishPosition: gameState.fishPosition,
            hand: gameState.hand,
            discard: gameState.discard,
            fullDeck: gameState.fullDeck,
            gameActive: true,
            hand_size: gameState.hand ? gameState.hand.length : 0,
            mana_remaining: gameState.playerHp,
            is_base_deck: gameState.fullDeck ? gameState.fullDeck.every((cardId: number) => cardId <= 10) : false,
            // ADDED: Daily runs data
            fish_caught: dailyRuns,
            turns_played: maxRuns
          }
          
          setFishingStats(stats)
          addEvent('fishing_session', 'state', `🎯 Current: Player Mana: ${stats.playerHp}, Fish HP: ${stats.fishHp}, Fish Position: [${stats.fishPosition?.join(', ')}]`)
          addEvent('fishing_session', 'daily', `📊 Daily Runs: ${dailyRuns}/${maxRuns}`)
        } else {
          addEvent('system', 'info', '✨ No active fishing game found')
          // ADDED: Still show daily runs even when no active game
          const stats: FishingStats = {
            gameActive: false,
            fish_caught: dailyRuns,
            turns_played: maxRuns
          }
          setFishingStats(stats)
          addEvent('fishing_session', 'daily', `📊 Daily Runs: ${dailyRuns}/${maxRuns}`)
        }
      } else {
        console.error('Failed to check fishing state:', response.status)
        addEvent('system', 'error', `❌ API error: ${response.status}`)
        setHasActiveGame(false)
      }
    } catch (error: any) {
      console.error('Error checking for active game:', error)
      addEvent('system', 'error', `❌ Network error: ${error}`)
      setHasActiveGame(false)
    } finally {
      setIsCheckingForActiveGame(false)
      console.log('✅ Active game check completed')
    }
  }

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      setConnectionStatus('connecting')
      wsRef.current = new WebSocket('ws://localhost:8000/ws')

      wsRef.current.onopen = () => {
        setConnectionStatus('connected')
        addEvent('system', 'connection', '🔗 Connected to fishing server')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      wsRef.current.onclose = () => {
        setConnectionStatus('disconnected')
        addEvent('system', 'connection', '❌ Disconnected from server')
        
        // Auto-reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isOpen) {
            connectWebSocket()
          }
        }, 3000)
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        addEvent('system', 'error', '❌ Connection error')
      }

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
      setConnectionStatus('disconnected')
    }
  }

  const handleWebSocketMessage = (data: any) => {
    console.log('Received WebSocket message:', data)
    
    // Handle the actual API response structure
    if (data.success === true) {
      addEvent('fishing_session', 'success', `✅ ${data.message}`)
      
      // Extract game state from nested data structure
      if (data.data && data.data.doc && data.data.doc.data) {
        const gameState = data.data.doc.data
        
        // Convert to our FishingStats interface
        const stats: FishingStats = {
          // Player stats
          playerHp: gameState.playerHp,
          playerMaxHp: gameState.playerMaxHp,
          
          // Fish stats
          fishHp: gameState.fishHp,
          fishMaxHp: gameState.fishMaxHp,
          fishPosition: gameState.fishPosition,
          previousFishPosition: gameState.previousFishPosition,
          
          // Deck and cards
          fullDeck: gameState.fullDeck,
          hand: gameState.hand,
          discard: gameState.discard,
          nextCardIndex: gameState.nextCardIndex,
          cardInDrawPile: gameState.cardInDrawPile,
          
          // Game state
          day: gameState.day,
          week: gameState.week,
          level: data.data.doc.LEVEL_CID,
          gameId: data.data.doc.docId,
          gameActive: !data.data.doc.COMPLETE_CID,
          
          // Derived stats for display
          hand_size: gameState.hand ? gameState.hand.length : 0,
          mana_remaining: gameState.playerHp, // Player HP acts as mana
          is_base_deck: gameState.fullDeck ? gameState.fullDeck.every((cardId: number) => cardId <= 10) : false
        }
        
        setFishingStats(stats)
        setIsGameActive(true)
        setIsStarting(false)
        
        addEvent('fishing_stats', 'update', `🎮 Game state updated - Fish HP: ${stats.fishHp}/${stats.fishMaxHp}, Position: ${stats.fishPosition?.join(', ')}`)
      }
    } else if (data.success === false) {
      addEvent('fishing_session', 'error', `❌ ${data.message}`)
      setIsStarting(false)
    } else {
      // Handle other message types (legacy format)
      const { type, category, message } = data

      // Add event to log
      addEvent(type, category, message)

      // Handle system connection events
      if (type === 'system' && category === 'connection') {
        // Reset checking state when connected
        setIsCheckingForActiveGame(false)
        console.log('🔗 WebSocket connection established - active game check should start automatically')
      }

      // Handle fishing-specific events
      if (type === 'fishing_stats' && category === 'update') {
        try {
          // Check if message is a string before parsing
          const stats = typeof message === 'string' ? JSON.parse(message) : message
          setFishingStats(stats)
        } catch (error) {
          console.error('Error parsing fishing stats:', error)
        }
      } else if (type === 'fishing_session') {
        if (category === 'start') {
          setIsGameActive(true)
          setIsStarting(false)
        } else if (category === 'end' || category === 'stop') {
          setIsGameActive(false)
          setIsStarting(false)
        } else if (category === 'active_game_found') {
          // ACTIVE GAME DETECTED - Show continue button
          console.log('🎮 Active game found event received!')
          setHasActiveGame(true)
          setIsCheckingForActiveGame(false)
          addEvent('fishing_session', 'active_game_found', '🎮 Active game detected - Continue button should appear!')
        } else if (category === 'no_active_game') {
          // NO ACTIVE GAME - Show start button
          console.log('ℹ️ No active game found event received')
          setHasActiveGame(false)
          setIsCheckingForActiveGame(false)
        } else if (category === 'state') {
          // Parse real-time state messages like "🎯 Turn 1: Player Mana: 8, Fish HP: 7, Fish Position: [2, 3]"
          try {
            const stateMatch = message.match(/Player Mana: (\d+), Fish HP: (\d+), Fish Position: \[([^\]]+)\]/)
            if (stateMatch) {
              const playerMana = parseInt(stateMatch[1])
              const fishHp = parseInt(stateMatch[2])
              const fishPositions = stateMatch[3].split(', ').map((pos: string) => parseInt(pos.trim()))
              
              // Update fishing stats with real-time data
              setFishingStats(prev => ({
                ...prev,
                playerHp: playerMana,
                fishHp: fishHp,
                fishPosition: fishPositions,
                mana_remaining: playerMana,
                gameActive: true
              }))
              
              console.log('🔄 Updated game state from real-time message:', {
                playerMana,
                fishHp,
                fishPosition: fishPositions
              })
            }
          } catch (error) {
            console.error('Error parsing state message:', error)
          }
        }
      }
    }
  }

  const addEvent = (type: string, category: string, message: any) => {
    const event: GameEvent = {
      type,
      category,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      timestamp: Date.now()
    }
    setGameEvents(prev => [event, ...prev].slice(0, 50)) // Keep last 50 events
  }

  const startFishing = () => {
    if (connectionStatus !== 'connected' || !wsRef.current) {
      addEvent('system', 'error', '❌ Not connected to server')
      return
    }

    setIsStarting(true)
    const jwtToken = getJWTToken()
    
    if (!jwtToken) {
      addEvent('system', 'error', '❌ No authentication token found')
      setIsStarting(false)
      return
    }

    // Use the correct message format that matches the actual API
    const message = {
      action: 'start_run',
      actionToken: '',
      jwt_token: jwtToken,  // Include JWT token for authentication
      data: {
        cards: [],
        nodeId: '2'
      }
    }

    try {
      wsRef.current.send(JSON.stringify(message))
      addEvent('fishing_session', 'request', '🎣 Starting fishing run...')
    } catch (error) {
      console.error('Error sending fishing start message:', error)
      addEvent('system', 'error', '❌ Failed to send fishing request')
      setIsStarting(false)
    }
  }

  const stopFishing = () => {
    setIsGameActive(false)
    setIsStarting(false)
    addEvent('fishing_session', 'stop', '🛑 Stopping fishing session...')
  }

  const continueGame = () => {
    if (connectionStatus !== 'connected' || !wsRef.current) {
      addEvent('system', 'error', '❌ Not connected to server')
      return
    }

    const jwtToken = getJWTToken()
    
    if (!jwtToken) {
      addEvent('system', 'error', '❌ No authentication token found')
      return
    }

    // Send a message to continue monitoring the existing game
    // The auto-play logic will pick up from where it left off
    const message = {
      action: 'continue_run',
      actionToken: '',
      jwt_token: jwtToken,
      data: {
        cards: [],
        nodeId: '2'
      }
    }

    try {
      wsRef.current.send(JSON.stringify(message))
      addEvent('fishing_session', 'request', '🎮 Continuing existing fishing game...')
    } catch (error) {
      console.error('Error sending continue message:', error)
      addEvent('system', 'error', '❌ Failed to send continue message')
    }
  }

  // Convert fish position to grid position for display
  const convertPositionToGrid = (pos?: number[]): number[] => {
    if (!pos || pos.length === 0) return [5] // Default center
    return pos // Return the array of positions directly
  }

  // Render 3x3 grid for fish position
  const renderFishGrid = () => {
    const fishGridPositions = convertPositionToGrid(fishingStats.fishPosition)
    
    return (
      <div className="grid grid-cols-3 gap-2 w-48 h-48 mx-auto mb-6">
        {Array.from({ length: 9 }, (_, i) => {
          const position = i + 1
          const isFishHere = fishGridPositions.includes(position)
          
          return (
            <motion.div
              key={position}
              className={`
                relative border-2 rounded-lg flex items-center justify-center text-sm font-mono
                ${isFishHere 
                  ? 'border-blue-400 bg-blue-400/20' 
                  : 'border-gray-600 bg-gray-800/30'
                }
              `}
              animate={isFishHere ? { 
                scale: [1, 1.1, 1],
                backgroundColor: ['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.4)', 'rgba(59, 130, 246, 0.2)']
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="text-gray-400">{position}</span>
              {isFishHere && (
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute"
                >
                  <Fish className="w-6 h-6 text-blue-400" />
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>
    )
  }

  // Connect when component opens
  useEffect(() => {
    if (isOpen) {
      connectWebSocket()
      checkForActiveGame()
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [isOpen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-gradient-to-br from-black/95 to-blue-900/20 border-2 border-blue-400/50 rounded-2xl p-8 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-3 bg-blue-400/20 rounded-xl border-2 border-blue-400/50"
                >
                  <Fish className="w-8 h-8 text-blue-400" />
                </motion.div>
                <div>
                  <h2 className="text-3xl font-bold font-mono text-blue-400 mb-2">TACTICAL FISHING</h2>
                  <p className="text-blue-300/70 font-mono text-sm">Strategic grid-based fish combat</p>
                  {fishingStats.is_base_deck !== undefined && (
                    <p className="text-yellow-400/70 font-mono text-xs mt-1">
                      {fishingStats.is_base_deck ? '🎯 Base Deck (Cards 1-10)' : '🃏 Expanded Deck'}
                    </p>
                  )}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-3 rounded-full bg-blue-400/20 hover:bg-blue-400/30 border-2 border-blue-400/50 transition-all"
              >
                <X className="w-6 h-6 text-blue-400" />
              </motion.button>
            </div>

            {/* Connection Status */}
            <div className="mb-6">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-mono font-bold ${
                connectionStatus === 'connected' ? 'bg-green-400/20 text-green-400 border border-green-400/30' :
                connectionStatus === 'connecting' ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30' :
                'bg-red-400/20 text-red-400 border border-red-400/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400' :
                  connectionStatus === 'connecting' ? 'bg-yellow-400' :
                  'bg-red-400'
                }`} />
                <span>{connectionStatus.toUpperCase()}</span>
              </div>
            </div>

            {/* Game Status */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-blue-400/10 rounded-xl p-4 border border-blue-400/30">
                <div className="text-blue-400 font-mono text-sm font-bold">STATUS</div>
                <div className="text-xl font-mono text-white mt-2">
                  {hasActiveGame ? 'ACTIVE GAME' : connectionStatus === 'connected' ? 'READY' : 'OFFLINE'}
                </div>
              </div>
              <div className="bg-green-400/10 rounded-xl p-4 border border-green-400/30">
                <div className="text-green-400 font-mono text-sm font-bold">DAILY RUNS</div>
                <div className="text-xl font-mono text-white mt-2">{fishingStats.fish_caught || 0}/{fishingStats.turns_played || 0}</div>
              </div>
              <div className="bg-purple-400/10 rounded-xl p-4 border border-purple-400/30">
                <div className="text-purple-400 font-mono text-sm font-bold">JUICED STATUS</div>
                <div className="text-xl font-mono text-white mt-2">{(fishingStats.turns_played || 0) > 10 ? '⚡ JUICED' : 'STANDARD'}</div>
              </div>
              <div className="bg-yellow-400/10 rounded-xl p-4 border border-yellow-400/30">
                <div className="text-yellow-400 font-mono text-sm font-bold">REMAINING</div>
                <div className="text-xl font-mono text-white mt-2">{Math.max(0, (fishingStats.turns_played || 0) - (fishingStats.fish_caught || 0))}</div>
              </div>
              <div className="bg-cyan-400/10 rounded-xl p-4 border border-cyan-400/30">
                <div className="text-cyan-400 font-mono text-sm font-bold">NODE</div>
                <div className="text-xl font-mono text-white mt-2">2</div>
              </div>
            </div>

            {/* Game State Details - Only show when there's an active game */}
            {hasActiveGame && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Fish HP */}
                {fishingStats.fishHp !== undefined && (
                  <div className="bg-red-400/10 rounded-xl p-4 border border-red-400/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-red-400 font-mono text-sm font-bold flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        FISH HP
                      </div>
                      <div className="text-red-400 font-mono text-sm">
                        {fishingStats.fishHp}/{fishingStats.fishMaxHp}
                      </div>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div 
                        className="bg-red-400 h-3 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.max(0, ((fishingStats.fishHp || 0) / (fishingStats.fishMaxHp || 1)) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Player Mana (API calls it HP) */}
                {fishingStats.playerHp !== undefined && (
                  <div className="bg-blue-400/10 rounded-xl p-4 border border-blue-400/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-blue-400 font-mono text-sm font-bold flex items-center">
                        <Sparkles className="w-4 h-4 mr-2" />
                        PLAYER MANA
                      </div>
                      <div className="text-blue-400 font-mono text-sm">
                        {fishingStats.playerHp}/{fishingStats.playerMaxHp}
                      </div>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div 
                        className="bg-blue-400 h-3 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.max(0, ((fishingStats.playerHp || 0) / (fishingStats.playerMaxHp || 1)) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Combat Grid */}
              <div className="bg-gradient-to-br from-blue-400/5 to-cyan-400/5 rounded-2xl p-6 border border-blue-400/30">
                <h3 className="text-xl font-bold font-mono text-blue-400 mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  COMBAT GRID
                </h3>
                
                {renderFishGrid()}
                
                {/* Grid Info */}
                <div className="text-center space-y-2">
                  <div className="text-blue-300/80 font-mono text-sm">
                    Fish Position: {fishingStats.fishPosition?.join(', ')}
                  </div>
                  <div className="text-gray-400 font-mono text-xs">
                    {isGameActive ? 'Predict fish movement and play cards!' : 'Start fishing to begin combat'}
                  </div>
                </div>
              </div>

              {/* Card Information */}
              <div className="bg-gradient-to-br from-purple-400/5 to-blue-400/5 rounded-2xl p-6 border border-purple-400/30">
                <h3 className="text-xl font-bold font-mono text-purple-400 mb-4">CARD INFO</h3>
                
                <div className="space-y-4">
                  <div className="bg-purple-400/10 rounded-lg p-3">
                    <div className="text-purple-400 font-mono text-sm font-bold mb-1">HAND SIZE</div>
                    <div className="text-2xl font-mono text-white">{fishingStats.hand_size || 0}</div>
                  </div>
                  
                  <div className="bg-cyan-400/10 rounded-lg p-3">
                    <div className="text-cyan-400 font-mono text-sm font-bold mb-1">MANA REMAINING</div>
                    <div className="text-2xl font-mono text-white">{fishingStats.mana_remaining || 0}</div>
                  </div>
                  
                  <div className="text-gray-400 font-mono text-xs">
                    <div>• Cards target specific grid zones</div>
                    <div>• Hit zones deal damage to fish</div>
                    <div>• Crit zones deal double damage</div>
                    <div>• Miss zones heal the fish</div>
                    <div>• Cards cost mana to play</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fishing Controls */}
            <div className="bg-gray-900/50 rounded-xl p-6 border border-cyan-400/30 mb-6">
              <h3 className="text-cyan-400 font-mono font-bold text-lg mb-4 flex items-center">
                <Fish className="w-5 h-5 mr-2" />
                FISHING CONTROLS
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-400' : 
                      connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <span className="text-gray-300 font-mono text-sm">
                      {connectionStatus === 'connected' ? 'Connected' : 
                       connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-cyan-400 font-mono text-sm">
                      {fishingStats.gameActive ? 'GAME ACTIVE' : 'NO ACTIVE GAME'}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  {isCheckingForActiveGame ? (
                    <motion.button
                      disabled
                      className="flex-1 bg-gray-600 text-gray-400 px-4 py-2 rounded-lg font-mono text-sm cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"
                        />
                        <span>CHECKING...</span>
                      </div>
                    </motion.button>
                  ) : hasActiveGame ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={continueGame}
                      disabled={connectionStatus !== 'connected'}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-4 py-2 rounded-lg font-mono text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <Play className="w-4 h-4" />
                        <span>CONTINUE GAME</span>
                      </div>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={startFishing}
                      disabled={connectionStatus !== 'connected' || isStarting}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-mono text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        {isStarting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                        ) : (
                          <Fish className="w-4 h-4" />
                        )}
                        <span>{isStarting ? 'STARTING...' : 'START FISHING'}</span>
                      </div>
                    </motion.button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={checkForActiveGame}
                    disabled={isCheckingForActiveGame}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-mono text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Waves className="w-4 h-4" />
                      <span>REFRESH</span>
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Event Log */}
            <div className="bg-gradient-to-br from-gray-900/50 to-blue-900/20 rounded-2xl p-6 border border-gray-600/30">
              <h3 className="text-xl font-bold font-mono text-gray-300 mb-4">EVENT LOG</h3>
              <div className="h-48 overflow-y-auto space-y-2">
                {gameEvents.length > 0 ? (
                  gameEvents.map((event, index) => (
                    <motion.div
                      key={`${event.timestamp}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start space-x-3 p-2 rounded bg-black/30"
                    >
                      <div className="text-xs text-gray-500 font-mono whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-sm font-mono text-gray-300 flex-1">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold mr-2 ${
                          event.type === 'system' ? 'bg-gray-600 text-gray-200' :
                          event.type === 'fishing_session' ? 'bg-blue-600 text-blue-200' :
                          event.type === 'fishing_turn' ? 'bg-green-600 text-green-200' :
                          event.type === 'fishing_loot' ? 'bg-yellow-600 text-yellow-200' :
                          'bg-purple-600 text-purple-200'
                        }`}>
                          {event.type.toUpperCase()}
                        </span>
                        {event.message}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 font-mono text-sm py-8">
                    No events yet. Start fishing to see activity.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Fishing 