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
import ElegantEnergyDisplay from './components/EnergyDisplay'
import InventoryModal from './components/InventoryModal'
import DungeonRunner from './components/DungeonRunner'
import TokenManager from './components/TokenManager'
import ROMOverview from './components/ROMOverview'

// Elegant Tron-style button component
const ElegantButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  size = 'md'
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  className?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}) => {
  const variants = {
    primary: 'border-cyan-400/50 text-cyan-400 hover:border-cyan-400 hover:shadow-cyan-400/30',
    secondary: 'border-amber-500/50 text-amber-500 hover:border-amber-500 hover:shadow-amber-500/30',
    danger: 'border-red-400/50 text-red-400 hover:border-red-400 hover:shadow-red-400/30',
    success: 'border-cyan-400/50 text-cyan-400 hover:border-cyan-400 hover:shadow-cyan-400/30'
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        button-elegant relative border-2 glass-elegant
        transition-all duration-300 text-body font-medium tracking-wide
        ${variants[variant]}
        ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover-lift'}
        ${className}
      `}
    >
      {children}
    </motion.button>
  )
}

// Refined card component
const ElegantCard = ({ 
  children, 
  className = '', 
  glowColor = 'cyan', 
  onClick,
  elevation = 'base'
}: {
  children: React.ReactNode
  className?: string
  glowColor?: 'cyan' | 'amber' | 'red' | 'green'
  onClick?: () => void
  elevation?: 'base' | 'elevated'
}) => {
  const glowColors = {
    cyan: 'border-cyan-400/30 hover:border-cyan-400/60',
    amber: 'border-amber-500/30 hover:border-amber-500/60',
    red: 'border-red-400/30 hover:border-red-400/60',
    green: 'border-green-400/30 hover:border-green-400/60'
  }

  const elevationClasses = {
    base: 'glass-elegant',
    elevated: 'glass-elevated'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`
        relative border-2 transition-all duration-300
        ${elevationClasses[elevation]}
        ${glowColors[glowColor]}
        ${onClick ? 'cursor-pointer hover-glow' : ''}
        ${className}
      `}
      style={{
        clipPath: 'polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)',
        borderRadius: '8px'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  )
}

// Refined background with subtle animations
const ElegantBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
      
      {/* Refined grid pattern */}
      <div className="absolute inset-0 refined-grid" />
      
      {/* Subtle circuit pattern */}
      <div className="absolute inset-0 subtle-circuit" />
      
      {/* Gentle scanning effect - less frequent */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent h-1"
        animate={{ y: ['0vh', '100vh'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

// Refined station component
const ElegantStation = ({ 
  icon: Icon, 
  title, 
  description, 
  color, 
  onClick,
  status
}: {
  icon: any
  title: string
  description: string
  color: 'cyan' | 'amber'
  onClick: () => void
  status?: 'online' | 'warning' | 'error'
}) => {
  const colorStyles = {
    cyan: 'text-cyan-400 border-cyan-400/30',
    amber: 'text-amber-500 border-amber-500/30'
  }

  return (
    <ElegantCard 
      glowColor={color} 
      className="p-8 cursor-pointer group" 
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Icon with status indicator */}
        <div className="relative">
          <div className={`p-6 rounded-full bg-black/50 border-2 group-hover:scale-105 transition-transform duration-300 ${colorStyles[color]}`}>
            <Icon className="w-10 h-10" />
          </div>
          {status && (
            <div className={`absolute -top-1 -right-1 status-dot status-${status}`} />
          )}
        </div>
        
        {/* Content */}
        <div className="space-y-3">
          <h3 className={`text-2xl font-bold text-heading tracking-wide ${colorStyles[color].split(' ')[0]}`}>
            {title}
          </h3>
          <p className="text-gray-400 text-sm text-body leading-relaxed max-w-sm">
            {description}
          </p>
        </div>
      </div>
    </ElegantCard>
  )
}

// Status bar component
const StatusBar = ({ playerBalances }: { playerBalances: any }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <ElegantCard className="p-6" elevation="elevated">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            {/* Energy Display */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="status-dot status-online" />
                <span className="text-body text-gray-300 text-sm">ENERGY</span>
              </div>
              <ElegantEnergyDisplay size="sm" />
            </div>
            
            {/* Player Stats */}
            <div className="flex items-center space-x-6 text-body text-sm">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-amber-500" />
                <span className="text-gray-300">Items:</span>
                <span className="text-amber-500 font-medium">
                  {Object.keys(playerBalances).length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-gray-300">Status:</span>
                <span className="text-cyan-400 font-medium">ONLINE</span>
              </div>
            </div>
          </div>
          
          {/* System Time */}
          <div className="text-body text-gray-400 text-sm">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </ElegantCard>
    </motion.div>
  )
}

// ROM Production Summary component with refined design
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

  if (loading || !romSummary) {
    return (
      <ElegantCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Gem className="w-6 h-6 text-cyan-400" />
            <div>
              <h3 className="text-heading text-cyan-400 font-medium">ROM PRODUCTION</h3>
              <p className="text-body text-gray-400 text-sm">Loading...</p>
            </div>
          </div>
          <div className="loading-shimmer w-16 h-6 rounded" />
        </div>
      </ElegantCard>
    )
  }

  return (
    <ElegantCard 
      className="p-6 cursor-pointer group" 
      onClick={() => setShowROMOverview(true)}
      glowColor="cyan"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-cyan-400/10 border border-cyan-400/30 rounded-lg">
            <Gem className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-heading text-cyan-400 font-medium text-lg">ROM PRODUCTION</h3>
            <p className="text-body text-gray-400 text-sm">
              {romSummary.totalRoms} active ROMs generating resources
            </p>
          </div>
        </div>
        
        <div className="text-right space-y-1">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-cyan-400 font-bold text-lg text-code">
                {formatNumber(romSummary.totalClaimable?.energy || 0)}
              </div>
              <div className="text-gray-400 text-xs text-body">ENERGY</div>
            </div>
            <div className="text-center">
              <div className="text-amber-500 font-bold text-lg text-code">
                {formatNumber(romSummary.totalClaimable?.shards || 0)}
              </div>
              <div className="text-gray-400 text-xs text-body">SHARDS</div>
            </div>
          </div>
        </div>
      </div>
    </ElegantCard>
  )
}

// Game Mode Selector with refined design
const GameModeSelector = () => {
  const [activeMode, setActiveMode] = useState<'standard' | 'gigus'>('standard')

  return (
    <ElegantCard className="p-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <Gamepad2 className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h3 className="text-heading text-amber-500 font-medium text-lg">GAME MODE</h3>
            <p className="text-body text-gray-400 text-sm">Select your preferred automation mode</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <ElegantButton
            variant={activeMode === 'standard' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveMode('standard')}
          >
            STANDARD
          </ElegantButton>
          <ElegantButton
            variant={activeMode === 'gigus' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveMode('gigus')}
          >
            GIGUS MODE
          </ElegantButton>
        </div>
      </div>
    </ElegantCard>
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
    const hardcodedToken = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwidXNlciI6eyJfaWQiOiI2N2I5MjE1YTEwOGFlZGRiNDA5YTdlNzMiLCJ3YWxsZXRBZGRyZXNzIjoiMHhiMGQ5MGQ1MmM3Mzg5ODI0ZDRiMjJjMDZiY2RjY2Q3MzRlMzE2MmI3IiwidXNlcm5hbWUiOiIweGIwZDkwRDUyQzczODk4MjRENEIyMmMwNmJjZGNjRDczNEUzMTYyYjciLCJjYXNlU2Vuc2l0aXZlQWRkcmVzcyI6IjB4YjBkOTBENTJDNzM4OTgyNEQ0QjIyYzA2YmNkY0NENzM0RTMxNjJiNyIsIl9fdiI6MH0sImdhbWVBY2NvdW50Ijp7Im5vb2IiOnsiX2lkIjoiNjdiOTIxNzRlM2MzOWRjYTZmZGFkZjA5IiwiZG9jSWQiOiIyMTQyNCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiTEFTVF9UUkFOU0ZFUl9USU1FX0NJRCI6MTc0MDE4NTk2NCwiY3JlYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMi45NDZaIiwidXBkYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMy4xNjVaIiwiTEVWRUxfQ0lEIjoxLCJJU19OT09CX0NJRCI6dHJ1ZSwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJPV05FUl9DSUQiOiIweGIwZDkwZDUyYzczODk4MjRkNGIyMmMwNmJjZGNjZDczNGUzMTYyYjciLCJhbGxvd2VkVG9DcmVhdGVBY2NvdW50Ijp0cnVlLCJjYW5FbnRlckdhbWUiOnRydWUsIm5vb2JQYXNzQmFsYW5jZSI6MCwibGFzdE5vb2JJZCI6NzM4ODQsIm1heE5vb2JJZCI6MTAwMDB9LCJleHAiOjE3NTAxMTY0MzF9.M26R6pDnFSSIbMXHa6kOhT_Hrjn3U7nkm_sGv0rY0uY"
    
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
      color: 'cyan' as const
    },
    {
      id: 'inventory',
      icon: Package,
      title: 'INVENTORY',
      description: 'Manage your items and materials',
      color: 'amber' as const
    },
    {
      id: 'repair',
      icon: Settings,
      title: 'REPAIR BAY',
      description: 'Restore damaged equipment',
      color: 'cyan' as const
    },
    {
      id: 'gear',
      icon: Shield,
      title: 'GEAR STATION',
      description: 'Upgrade and modify gear',
      color: 'amber' as const
    },
    {
      id: 'alchemy',
      icon: Beaker,
      title: 'ALCHEMY BENCH',
      description: 'Brew potions and elixirs',
      color: 'cyan' as const
    },
    {
      id: 'gigamarket',
      icon: ShoppingCart,
      title: 'GIGAMARKET',
      description: 'Trade digital assets on the blockchain',
      color: 'amber' as const
    },
    {
      id: 'dungeon',
      icon: Target,
      title: 'DUNGEON RUNNER',
      description: 'AI-powered dungeon bot',
      color: 'cyan' as const
    },
    {
      id: 'roms',
      icon: Gem,
      title: 'ROM COLLECTION',
      description: 'NFT resource generators',
      color: 'amber' as const
    },
    {
      id: 'combat',
      icon: Sword,
      title: 'COMBAT SIM',
      description: 'Train combat abilities',
      color: 'cyan' as const
    }
  ]

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <ElegantBackground />
      
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
            <ElegantEnergyDisplay size="md" showLabel={true} />
            
            {/* JWT Token Manager */}
            <ElegantButton
              onClick={() => setShowTokenManager(true)}
              variant="secondary"
              className="text-sm"
            >
              <Key className="w-4 h-4 mr-2" />
              TOKEN
            </ElegantButton>
            
            {/* Quick Inventory Access */}
            <ElegantButton
              onClick={() => {
                setShowInventory(true)
                fetchPlayerBalances()
              }}
              variant="secondary"
              className="text-sm"
            >
              <Package className="w-4 h-4 mr-2" />
              INVENTORY
            </ElegantButton>
            <ElegantButton 
              onClick={() => setShowDungeonRunner(true)}
              variant="danger" 
              className="text-sm"
            >
              <Target className="w-4 h-4 mr-2" />
              DUNGEON BOT
            </ElegantButton>
            
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center space-x-2 text-green-400 font-mono"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>SYSTEM ONLINE</span>
            </motion.div>
            
            <ElegantButton
              onClick={() => setIsGameRunning(!isGameRunning)}
              variant={isGameRunning ? 'danger' : 'success'}
            >
              {isGameRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isGameRunning ? 'PAUSE' : 'START'}
            </ElegantButton>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <ROMProductionSummary setShowROMOverview={setShowROMOverview} />
            
            {/* ROM Collection Access Card - Separate from production stats */}
            <ElegantCard glowColor="amber" className="p-6">
              <h3 className="text-amber-500 font-mono font-bold text-lg mb-4 flex items-center">
                <Gem className="w-5 h-5 mr-2" />
                ROM COLLECTION
              </h3>
              <div className="text-center">
                <button
                  onClick={() => setShowROMOverview(true)}
                  className="w-full p-4 bg-amber-500/10 border-2 border-amber-500/30 hover:border-amber-500/60 transition-colors font-mono text-amber-500"
                  style={{
                    clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)'
                  }}
                >
                  <div className="text-2xl font-bold mb-2">VIEW ALL ROMS</div>
                  <div className="text-sm opacity-80">Manage your complete ROM collection</div>
                </button>
              </div>
            </ElegantCard>
            
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
                                         <ElegantStation
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
                           } else if (station.id === 'dungeon') {
                             setShowDungeonRunner(true)
                           } else if (station.id === 'roms') {
                             setShowROMOverview(true)
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
          <ElegantCard glowColor="cyan" className="p-4">
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
          </ElegantCard>
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
