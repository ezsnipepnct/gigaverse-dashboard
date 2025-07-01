'use client';

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, 
  Shield, 
  Sword, 
  Wrench, 
  Beaker, 
  Gem, 
  Settings, 
  Play, 
  Pause,
  Activity,
  Cpu,
  Database,
  Gamepad2,
  Sparkles,
  Target,
  Flame,
  Snowflake,
  Bolt,
  ShoppingCart,
  Package,
  Key
} from 'lucide-react'
import CraftingStation from './components/CraftingStation'
import Gigamarket from './components/Gigamarket'
import EnergyDisplay from './components/EnergyDisplay'
import InventoryModal from './components/InventoryModal'
import DungeonRunner from './components/DungeonRunner'
import TokenManager from './components/TokenManager'
import ROMOverview from './components/ROMOverview'

// Refined minimal button component
const RefinedButton = ({ children, onClick, variant = 'primary', className = '', disabled = false }: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  className?: string
  disabled?: boolean
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary border-cyan-400/60 text-cyan-400 hover:bg-cyan-400/10',
    danger: 'btn-secondary border-red-400/60 text-red-400 hover:bg-red-400/10',
    success: 'btn-secondary border-green-400/60 text-green-400 hover:bg-green-400/10'
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        btn-refined text-refined
        ${variants[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      {children}
    </motion.button>
  )
}

// Refined minimal card component
const RefinedCard = ({ children, className = '', glowColor = 'cyan', onClick }: {
  children: React.ReactNode
  className?: string
  glowColor?: string
  onClick?: () => void
}) => {
  const glowColors = {
    cyan: 'border-cyan-400/30 hover:border-cyan-400/50',
    purple: 'border-purple-400/30 hover:border-purple-400/50',
    green: 'border-green-400/30 hover:border-green-400/50',
    red: 'border-red-400/30 hover:border-red-400/50',
    yellow: 'border-yellow-400/30 hover:border-yellow-400/50'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`
        card-refined
        ${glowColors[glowColor as keyof typeof glowColors]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  )
}

// Refined minimal background
const RefinedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 refined-gradient-bg" />
      <div className="absolute inset-0 minimal-circuit-pattern opacity-40" />
      {/* Subtle scanning effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent h-1"
        animate={{ y: ['0vh', '100vh'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

// Station component
const Station = ({ icon: Icon, title, description, color, onClick }: {
  icon: any
  title: string
  description: string
  color: string
  onClick: () => void
}) => {
  return (
    <RefinedCard glowColor={color} className="p-6 cursor-pointer group" onClick={onClick}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="flex flex-col items-center text-center space-refined-sm"
      >
        <div className={`p-4 rounded-full bg-${color}-400/10 border-2 border-${color}-400/30 group-hover:border-${color}-400/60 transition-colors`}>
          <Icon className={`w-8 h-8 text-${color}-400`} />
        </div>
        <div>
          <h3 className={`text-xl font-semibold text-${color}-400 text-display`}>{title}</h3>
          <p className="text-gray-400 text-sm mt-2 text-mono-refined">{description}</p>
        </div>
      </motion.div>
    </RefinedCard>
  )
}

// ROM Production Summary component
const ROMProductionSummary = ({ setShowROMOverview }: { setShowROMOverview: (show: boolean) => void }) => {
  const [romSummary, setRomSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const getJWTToken = () => {
    const hardcodedToken = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwidXNlciI6eyJfaWQiOiI2N2I5MjE1YTEwOGFlZGRiNDA5YTdlNzMiLCJ3YWxsZXRBZGRyZXNzIjoiMHhiMGQ5MGQ1MmM3Mzg5ODI0ZDRiMjJjMDZiY2RjY2Q3MzRlMzE2MmI3IiwidXNlcm5hbWUiOiIweGIwZDkwRDUyQzczODk4MjRENEIyMmMwNmJjZGNjRDczNEUzMTYyYjciLCJjYXNlU2Vuc2l0aXZlQWRkcmVzcyI6IjB4YjBkOTBENTJDNzM4OTgyNEQ0QjIyYzA2YmNkY0NENzM0RTMxNjJiNyIsIl9fdiI6MH0sImdhbWVBY2NvdW50Ijp7Im5vb2IiOnsiX2lkIjoiNjdiOTIxNzRlM2MzOWRjYTZmZGFkZjA5IiwiZG9jSWQiOiIyMTQyNCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiTEFTVF9UUkFOU0ZFUl9USU1FX0NJRCI6MTc0MDE4NTk2NCwiY3JlYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMi45NDZaIiwidXBkYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMy4xNjVaIiwiTEVWRUxfQ0lEIjoxLCJJU19OT09CX0NJRCI6dHJ1ZSwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJPV05FUl9DSUQiOiIweGIwZDkwZDUyYzczODk4MjRkNGIyMmMwNmJjZGNjZDczNGUzMTYyYjciLCJhbGxvd2VkVG9DcmVhdGVBY2NvdW50Ijp0cnVlLCJjYW5FbnRlckdhbWUiOnRydWUsIm5vb2JQYXNzQmFsYW5jZSI6MCwibGFzdE5vb2JJZCI6NzM4ODQsIm1heE5vb2JJZCI6MTAwMDB9LCJleHAiOjE3NTAxMTY0MzF9.M26R6pDnFSSIbMXHa6kOhT_Hrjn3U7nkm_sGv0rY0uY"
    
    if (hardcodedToken) {
      return hardcodedToken
    }
    
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jwt_token') || localStorage.getItem('authToken') || ''
    }
    return ''
  }

  const fetchROMSummary = async () => {
    try {
      setLoading(true)
      const jwtToken = getJWTToken()
      if (!jwtToken) return

      const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"
      const response = await fetch(`/api/player/roms?wallet=${WALLET_ADDRESS}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRomSummary(data.summary)
        }
      }
    } catch (error) {
      console.error('Error fetching ROM summary:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchROMSummary()
  }, [])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  return (
    <RefinedCard glowColor="yellow" className="p-6">
      <h3 className="text-yellow-400 font-mono font-bold text-lg mb-4 flex items-center">
        <Gem className="w-5 h-5 mr-2" />
        ROM PRODUCTION
      </h3>
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full"
          />
        </div>
      ) : romSummary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-yellow-400 font-mono">
                {romSummary.totalRoms}
              </div>
              <div className="text-xs text-gray-400 font-mono">TOTAL ROMS</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400 font-mono">
                {formatNumber(romSummary.totalClaimable?.energy || 0)}
              </div>
              <div className="text-xs text-gray-400 font-mono">CLAIMABLE ⚡</div>
            </div>
          </div>
          
          {/* Production Stats Section */}
          <div className="space-y-3 border-t border-cyan-400/20 pt-4">
            <div className="text-cyan-400/80 font-mono text-xs font-bold">DAILY PRODUCTION</div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400/70 font-mono text-xs">DAILY ENERGY</span>
              </div>
              <span className="text-yellow-400/70 font-mono font-bold text-xs">
                {formatNumber(romSummary.dailyProduction?.energy || 0)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Gem className="w-4 h-4 text-yellow-400" />
                <span className="text-blue-400/70 font-mono text-xs">DAILY SHARDS</span>
              </div>
              <span className="text-blue-400/70 font-mono font-bold text-xs">
                {formatNumber(romSummary.dailyProduction?.shards || 0)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-purple-400/70 font-mono text-xs">DAILY DUST</span>
              </div>
              <span className="text-purple-400/70 font-mono font-bold text-xs">
                {formatNumber(romSummary.dailyProduction?.dust || 0)}
              </span>
            </div>
            
            <div className="text-cyan-400/80 font-mono text-xs font-bold mt-4">WEEKLY PRODUCTION</div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400/70 font-mono text-xs">WEEKLY ENERGY</span>
              </div>
              <span className="text-yellow-400/70 font-mono font-bold text-xs">
                {formatNumber(romSummary.totalWeeklyProduction?.energy || 0)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Gem className="w-4 h-4 text-yellow-400" />
                <span className="text-blue-400/70 font-mono text-xs">WEEKLY SHARDS</span>
              </div>
              <span className="text-blue-400/70 font-mono font-bold text-xs">
                {formatNumber(romSummary.totalWeeklyProduction?.shards || 0)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-purple-400/70 font-mono text-xs">WEEKLY DUST</span>
              </div>
              <span className="text-purple-400/70 font-mono font-bold text-xs">
                {formatNumber(romSummary.totalWeeklyProduction?.dust || 0)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 font-mono text-sm">
          No ROM data available
        </div>
      )}
    </RefinedCard>
  )
}

// Game mode selector
const GameModeSelector = () => {
  const [selectedMode, setSelectedMode] = useState('normal')

  const modes = [
    { id: 'normal', name: 'NORMAL', color: 'cyan', icon: Target },
    { id: 'gigus', name: 'GIGUS', color: 'purple', icon: Flame },
    { id: 'underhaul', name: 'UNDERHAUL', color: 'red', icon: Bolt }
  ]

  return (
    <RefinedCard glowColor="purple" className="p-6">
      <h3 className="text-purple-400 font-mono font-bold text-lg mb-4 flex items-center">
        <Gamepad2 className="w-5 h-5 mr-2" />
        GAME MODE
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {modes.map((mode) => (
          <motion.button
            key={mode.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedMode(mode.id)}
            className={`
              p-3 border-2 bg-black/30 backdrop-blur-sm font-mono font-bold
              transition-all duration-300 flex items-center space-x-3
              ${selectedMode === mode.id 
                ? `border-${mode.color}-400 text-${mode.color}-400 bg-${mode.color}-400/10 shadow-${mode.color}-400/30` 
                : `border-gray-600 text-gray-400 hover:border-${mode.color}-400/50 hover:text-${mode.color}-400`
              }
            `}
            style={{
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)'
            }}
          >
            <mode.icon className="w-5 h-5" />
            <span>{mode.name}</span>
            {selectedMode === mode.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`ml-auto w-2 h-2 bg-${mode.color}-400 rounded-full animate-pulse`}
              />
            )}
          </motion.button>
        ))}
      </div>
    </RefinedCard>
  )
}

export default function GigaverseDashboard() {
  const [activeStation, setActiveStation] = useState<string | null>(null)
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [showCraftingStation, setShowCraftingStation] = useState(false)
  const [showGigamarket, setShowGigamarket] = useState(false)
  const [showInventory, setShowInventory] = useState(false)
  const [showDungeonRunner, setShowDungeonRunner] = useState(false)
  const [showTokenManager, setShowTokenManager] = useState(false)
  const [showROMOverview, setShowROMOverview] = useState(false)
  const [playerBalances, setPlayerBalances] = useState<Record<string, number>>({})
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // JWT Token management
  const getJWTToken = () => {
    const hardcodedToken = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwidXNlciI6eyJfaWQiOiI2N2I5MjE1YTEwOGFlZGRiNDA5YTdlNzMiLCJ3YWxsZXRBZGRyZXNzIjoiMHhiMGQ5MGQ1MmM3Mzg5ODI0ZDRiMjJjMDZiY2RjY2Q3MzRlMzE2MmI3IiwidXNlcm5hbWUiOiIweGIwZDkwRDUyQzczODk4MjRENEIyMmMwNmJjZGNDRDczNEUzMTYyYjciLCJjYXNlU2Vuc2l0aXZlQWRkcmVzcyI6IjB4YjBkOTBENTJDNzM4OTgyNEQ0QjIyYzA2YmNkY0NENzM0RTMxNjJiNyIsIl9fdiI6MH0sImdhbWVBY2NvdW50Ijp7Im5vb2IiOnsiX2lkIjoiNjdiOTIxNzRlM2MzOWRjYTZmZGFkZjA5IiwiZG9jSWQiOiIyMTQyNCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiTEFTVF9UUkFOU0ZFUl9USU1FX0NJRCI6MTc0MDE4NTk2NCwiY3JlYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMi45NDZaIiwidXBkYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMy4xNjVaIiwiTEVWRUxfQ0lEIjoxLCJJU19OT09CX0NJRCI6dHJ1ZSwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJPV05FUl9DSUQiOiIweGIwZDkwZDUyYzczODk4MjRkNGIyMmMwNmJjZGNjZDczNGUzMTYyYjcifSwiYWxsb3dlZFRvQ3JlYXRlQWNjb3VudCI6dHJ1ZSwiY2FuRW50ZXJHYW1lIjp0cnVlLCJub29iUGFzc0JhbGFuY2UiOjAsImxhc3ROb29iSWQiOjczODg0LCJtYXhOb29iSWQiOjEwMDAwfSwiZXhwIjoxNzUwMTE2NDMxfQ.M26R6pDnFSSIbMXHa6kOhT_Hrjn3U7nkm_sGv0rY0uY"
    
    if (hardcodedToken) {
      return hardcodedToken
    }
    
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jwt_token') || localStorage.getItem('authToken') || ''
    }
    return ''
  }

  const fetchPlayerBalances = async () => {
    try {
      setBalancesLoading(true)
      const jwtToken = getJWTToken()
      if (!jwtToken) {
        console.log('No JWT token available for fetching balances')
        return
      }

      const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"
      const response = await fetch(`/api/player/balances?wallet=${WALLET_ADDRESS}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.balances) {
          setPlayerBalances(data.balances)
          console.log('Player balances loaded:', Object.keys(data.balances).length, 'items')
        }
      } else {
        console.error('Failed to fetch player balances:', response.status)
      }
    } catch (error) {
      console.error('Error fetching player balances:', error)
    } finally {
      setBalancesLoading(false)
    }
  }

  const stations = [
    {
      id: 'crafting',
      icon: Wrench,
      title: 'CRAFTING STATION',
      description: 'Forge powerful weapons and armor',
      color: 'cyan'
    },
    {
      id: 'inventory',
      icon: Package,
      title: 'INVENTORY',
      description: 'Manage your items and materials',
      color: 'cyan'
    },
    {
      id: 'gear',
      icon: Shield,
      title: 'GEAR STATION',
      description: 'Upgrade and modify gear',
      color: 'cyan'
    },
    {
      id: 'gigamarket',
      icon: ShoppingCart,
      title: 'GIGAMARKET',
      description: 'Trade digital assets on the blockchain',
      color: 'cyan'
    },
    {
      id: 'roms',
      icon: Cpu,
      title: 'ROM COLLECTION',
      description: 'View and manage your ROM NFTs',
      color: 'cyan'
    },
    {
      id: 'dungeon',
      icon: Target,
      title: 'DUNGEON RUNNER',
      description: 'AI-powered dungeon bot',
      color: 'cyan'
    }
  ]

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <RefinedBackground />
      
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 p-6 border-b border-cyan-400/30 bg-black/50 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-2 border-cyan-400 rounded-full flex items-center justify-center bg-cyan-400/10"
            >
              <Cpu className="w-6 h-6 text-cyan-400" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold font-mono tracking-wider text-cyan-400">
                GIGAVERSE
              </h1>
              <p className="text-cyan-300/70 font-mono text-sm">DIGITAL REALM INTERFACE</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Energy Display */}
            <EnergyDisplay size="md" showLabel={true} />
            
            {/* JWT Token Manager */}
            <RefinedButton
              onClick={() => setShowTokenManager(true)}
              variant="secondary"
              className="text-sm"
            >
              <Key className="w-4 h-4 mr-2" />
              TOKEN
            </RefinedButton>
            
            {/* Quick Inventory Access */}
            <RefinedButton
              onClick={() => {
                setShowInventory(true)
                fetchPlayerBalances()
              }}
              variant="secondary"
              className="text-sm"
            >
              <Package className="w-4 h-4 mr-2" />
              INVENTORY
            </RefinedButton>
            <RefinedButton 
              onClick={() => setShowDungeonRunner(true)}
              variant="danger" 
              className="text-sm"
            >
              <Target className="w-4 h-4 mr-2" />
              DUNGEON BOT
            </RefinedButton>
            
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center space-x-2 text-green-400 font-mono"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>SYSTEM ONLINE</span>
            </motion.div>
            
            <RefinedButton
              onClick={() => setIsGameRunning(!isGameRunning)}
              variant={isGameRunning ? 'danger' : 'success'}
            >
              {isGameRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isGameRunning ? 'PAUSE' : 'START'}
            </RefinedButton>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <ROMProductionSummary setShowROMOverview={setShowROMOverview} />
            <GameModeSelector />
          </div>

          {/* Main Area - Stations Grid */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold font-mono text-cyan-400 mb-6 flex items-center">
                <Database className="w-6 h-6 mr-3" />
                STATION ACCESS GRID
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {stations.map((station, index) => (
                  <motion.div
                    key={station.id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                                         <Station
                       icon={station.icon}
                       title={station.title}
                       description={station.description}
                       color={station.color}
                                                                        onClick={() => {
                          setActiveStation(station.id)
                          if (station.id === 'crafting') {
                            setShowCraftingStation(true)
                          } else if (station.id === 'gigamarket') {
                            setShowGigamarket(true)
                          } else if (station.id === 'inventory') {
                            setShowInventory(true)
                            fetchPlayerBalances()
                          } else if (station.id === 'roms') {
                            setShowROMOverview(true)
                          } else if (station.id === 'dungeon') {
                            setShowDungeonRunner(true)
                          }
                        }}
                     />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Floating Action Panel */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-6 right-6 z-20"
        >
          <RefinedCard glowColor="cyan" className="p-4">
            <div className="flex items-center space-x-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-3 h-3 bg-cyan-400 rounded-full"
              />
              <span className="text-cyan-400 font-mono text-sm">
                {isGameRunning ? 'GAME ACTIVE' : 'AWAITING INPUT'}
              </span>
            </div>
          </RefinedCard>
        </motion.div>

                {/* Enhanced Particle Effects */}
        {mounted && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {/* Floating particles */}
            {[...Array(30)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              initial={{
                opacity: 0
              }}
              animate={{
                y: [0, -100],
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: Math.random() * 4 + 3,
                repeat: Infinity,
                delay: Math.random() * 3
              }}
            />
          ))}
          
          {/* Circuit traces */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`circuit-${i}`}
              className="absolute h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
              style={{
                top: `${20 + i * 15}%`,
                width: '100%'
              }}
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 8 + Math.random() * 4,
                repeat: Infinity,
                delay: i * 2
              }}
            />
          ))}
          
          {/* Data streams */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`stream-${i}`}
              className="absolute w-px h-20 bg-gradient-to-b from-transparent via-purple-400/60 to-transparent"
              style={{
                left: `${10 + i * 12}%`,
                top: '100%'
              }}
              animate={{
                y: [0, -1200],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 4
              }}
            />
          ))}
        </div>
        )}
       </div>

       {/* Station Modals */}
       <CraftingStation 
         isOpen={showCraftingStation} 
         onClose={() => setShowCraftingStation(false)} 
       />
       <Gigamarket 
         isOpen={showGigamarket} 
         onClose={() => setShowGigamarket(false)} 
       />
       <InventoryModal
         isOpen={showInventory}
         onClose={() => setShowInventory(false)}
         playerBalances={playerBalances}
         onRefreshBalances={fetchPlayerBalances}
         balancesLoading={balancesLoading}
       />
       <DungeonRunner
         isOpen={showDungeonRunner}
         onClose={() => setShowDungeonRunner(false)}
       />
       <TokenManager
         isOpen={showTokenManager}
         onClose={() => setShowTokenManager(false)}
       />
       <ROMOverview
         isOpen={showROMOverview}
         onClose={() => setShowROMOverview(false)}
       />
     </div>
   )
}
