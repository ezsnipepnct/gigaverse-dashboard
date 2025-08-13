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
  Key,
  Battery,
  Waves,
  Fish,
  Tag,
  ChevronRight
} from 'lucide-react'
import CraftingStation from './components/CraftingStation'
import Gigamarket from './components/Gigamarket'
import EnergyDisplay from './components/EnergyDisplay'
import InventoryModal from './components/InventoryModal'
import DungeonRunner from './components/DungeonRunner'
import Fishing from './components/Fishing'
import TokenManager from './components/TokenManager'
import ROMOverview from './components/ROMOverview'
import DealsModal from './components/DealsModal'
import WalletConnect from '@/components/WalletConnect'
import { agwAuthService } from '@/lib/agw-auth'

// Refined minimal button component with gold hover theme
const RefinedButton = ({ children, onClick, variant = 'primary', className = '', disabled = false, goldHover = false }: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  className?: string
  disabled?: boolean
  goldHover?: boolean
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
        ${goldHover ? 'btn-gold-hover' : ''}
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

// Station component with elegant cyan theme
const Station = ({ icon: Icon, title, description, color, onClick }: {
  icon: any
  title: string
  description: string
  color: string
  onClick: () => void
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative overflow-hidden p-6 bg-gradient-to-br from-black/60 to-gray-900/60 border border-cyan-400/30 rounded-xl cursor-pointer group hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-400/10"
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header with icon and indicator */}
        <div className="flex items-center justify-between mb-4">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-12 h-12 bg-cyan-400/20 rounded-full border border-cyan-400/40 group-hover:border-cyan-400/60 transition-all duration-300"
          >
            <Icon className="w-6 h-6 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" />
          </motion.div>
          
          <motion.div
            initial={{ x: 4, opacity: 0.6 }}
            whileHover={{ x: 8, opacity: 1 }}
            className="text-cyan-400/60 group-hover:text-cyan-400 transition-all duration-300"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.div>
        </div>

        {/* Title and description */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-cyan-400 font-mono group-hover:text-cyan-300 transition-colors duration-300">
            {title}
          </h3>
          <p className="text-gray-400 text-sm font-mono group-hover:text-gray-300 transition-colors duration-300 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      
      {/* Subtle border glow */}
      <div className="absolute inset-0 rounded-xl border border-cyan-400/0 group-hover:border-cyan-400/20 transition-all duration-300" />
    </motion.div>
  )
}

// GameMode component with distinctive styling
const GameMode = ({ icon: Icon, title, description, color, accent, onClick, isDungeon, dungeonData, isFishing, fishingData }: {
  icon: any
  title: string
  description: string
  color: string
  accent: string
  onClick: () => void
  isDungeon?: boolean
  dungeonData?: any
  isFishing?: boolean
  fishingData?: any
}) => {
  const accentColor = color === 'purple' ? 'cyan' : color
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative p-6 rounded-lg bg-black/90 h-112 flex flex-col
        border border-${accentColor}-400/50 cursor-pointer group overflow-hidden
        backdrop-blur-sm hover:border-${accentColor}-400 transition-all duration-300
        shadow-lg hover:shadow-${accentColor}-400/20
      `}
    >
      {/* Minimal background glow */}
      <div className={`absolute inset-0 bg-${accentColor}-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      {/* Clean header section */}
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded bg-${accentColor}-400/10 border border-${accentColor}-400/30 group-hover:border-${accentColor}-400/50 transition-all duration-300`}>
            <Icon className={`w-5 h-5 text-${accentColor}-400`} />
          </div>
          <div>
            <h3 className={`text-lg font-bold font-mono text-${accentColor}-400 leading-tight`}>
              {title}
            </h3>
          </div>
        </div>
        
        {/* Status dot */}
        <motion.div
          className={`w-3 h-3 rounded-full bg-${accentColor}-400 mt-2`}
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      
      {/* Dungeon-specific progress section */}
      {isDungeon && dungeonData && (
        <div className="relative z-10 space-y-3 border-t border-blue-400/20 pt-4 flex-1">
          <div className="text-blue-400/80 font-mono text-sm font-bold">TODAY'S PROGRESS</div>
          
          {/* Progress summary */}
          <div className="flex items-center justify-between bg-blue-400/5 p-3 rounded border border-blue-400/20">
            <span className="text-gray-400 font-mono text-sm">Total Runs</span>
            <span className="text-blue-400 font-mono text-lg font-bold">
              {dungeonData.normal?.completed + dungeonData.gigus?.completed + dungeonData.underhaul?.completed || 0}/
              {((dungeonData.normal?.isJuiced ? dungeonData.normal?.juicedMax : dungeonData.normal?.total) || 0) +
               ((dungeonData.gigus?.isJuiced ? dungeonData.gigus?.juicedMax : dungeonData.gigus?.total) || 0) +
               ((dungeonData.underhaul?.isJuiced ? dungeonData.underhaul?.juicedMax : dungeonData.underhaul?.total) || 0)}
            </span>
          </div>
          
          {/* Quick dungeon status with progress bars */}
          <div className="space-y-1">
            {dungeonData.normal && (
              <div className="space-y-2 bg-black/30 p-3 rounded border border-blue-400/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-400 font-mono text-sm font-bold">NORMAL</span>
                    {dungeonData.normal.isJuiced && (
                      <span className="text-yellow-400 font-mono text-xs bg-yellow-400/20 px-2 py-1 rounded">⚡</span>
                    )}
                  </div>
                  <span className="text-blue-400 font-mono text-sm font-bold">
                    {dungeonData.normal.completed}/{dungeonData.normal.isJuiced ? dungeonData.normal.juicedMax : dungeonData.normal.total}
                  </span>
                </div>
                <div className="w-full bg-gray-800/60 rounded-full h-1.5">
                  <div 
                    className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(dungeonData.normal.isJuiced ? dungeonData.normal.juicedMax : dungeonData.normal.total) > 0 ? (dungeonData.normal.completed / (dungeonData.normal.isJuiced ? dungeonData.normal.juicedMax : dungeonData.normal.total)) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            )}
            {dungeonData.gigus && (
              <div className="space-y-2 bg-black/30 p-3 rounded border border-blue-400/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-400 font-mono text-sm font-bold">GIGUS</span>
                    {dungeonData.gigus.isJuiced && (
                      <span className="text-yellow-400 font-mono text-xs bg-yellow-400/20 px-2 py-1 rounded">⚡</span>
                    )}
                  </div>
                  <span className="text-blue-400 font-mono text-sm font-bold">
                    {dungeonData.gigus.completed}/{dungeonData.gigus.isJuiced ? dungeonData.gigus.juicedMax : dungeonData.gigus.total}
                  </span>
                </div>
                <div className="w-full bg-gray-800/60 rounded-full h-1.5">
                  <div 
                    className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(dungeonData.gigus.isJuiced ? dungeonData.gigus.juicedMax : dungeonData.gigus.total) > 0 ? (dungeonData.gigus.completed / (dungeonData.gigus.isJuiced ? dungeonData.gigus.juicedMax : dungeonData.gigus.total)) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            )}
            {dungeonData.underhaul && (
              <div className="space-y-2 bg-black/30 p-3 rounded border border-blue-400/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-400 font-mono text-sm font-bold">UNDERHAUL</span>
                    {dungeonData.underhaul.isJuiced && (
                      <span className="text-yellow-400 font-mono text-xs bg-yellow-400/20 px-2 py-1 rounded">⚡</span>
                    )}
                  </div>
                  <span className="text-blue-400 font-mono text-sm font-bold">
                    {dungeonData.underhaul.completed}/{dungeonData.underhaul.isJuiced ? dungeonData.underhaul.juicedMax : dungeonData.underhaul.total}
                  </span>
                </div>
                <div className="w-full bg-gray-800/60 rounded-full h-1.5">
                  <div 
                    className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(dungeonData.underhaul.isJuiced ? dungeonData.underhaul.juicedMax : dungeonData.underhaul.total) > 0 ? (dungeonData.underhaul.completed / (dungeonData.underhaul.isJuiced ? dungeonData.underhaul.juicedMax : dungeonData.underhaul.total)) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Fishing-specific progress section */}
      {isFishing && fishingData && (
        <div className="relative z-10 space-y-4 border-t border-blue-400/20 pt-6 flex-1">
          <div className="text-blue-400/80 font-mono text-sm font-bold">TODAY'S PROGRESS</div>
          
          {/* Progress summary */}
          <div className="flex items-center justify-between bg-blue-400/5 p-3 rounded border border-blue-400/20">
            <span className="text-gray-400 font-mono text-sm">Total Runs</span>
            <span className="text-blue-400 font-mono text-lg font-bold">
              {fishingData.completed || 0}/{fishingData.total || 0}
            </span>
          </div>
          
          {/* Fishing main progress section */}
          <div className="space-y-4 bg-black/30 p-4 rounded border border-blue-400/10">
            <div className="flex items-center justify-between">
              <span className="text-blue-400 font-mono text-sm font-bold">TACTICAL FISHING</span>
              <span className="text-blue-400 font-mono text-sm font-bold">
                {Math.round(fishingData.total > 0 ? (fishingData.completed / fishingData.total) * 100 : 0)}% Complete
              </span>
            </div>
            
            {/* Main fishing progress bar */}
            <div className="w-full bg-gray-800/60 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ 
                  width: `${Math.max(5, fishingData.total > 0 ? (fishingData.completed / fishingData.total) * 100 : 0)}%` 
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {fishingData.hasActiveGame && (
                  <span className="text-green-400 font-mono text-xs bg-green-400/20 px-2 py-1 rounded">
                    ACTIVE
                  </span>
                )}
                {fishingData.isJuiced && (
                  <span className="text-yellow-400 font-mono text-xs bg-yellow-400/20 px-2 py-1 rounded">
                    ⚡ JUICED
                  </span>
                )}
              </div>
              <div className="text-gray-400 font-mono text-sm">
                {Math.max(0, (fishingData.total || 0) - (fishingData.completed || 0))} remaining
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Clean status footer */}
      <div className="relative z-10 flex items-center justify-between pt-4 border-t border-gray-700/50 mt-auto">
        <span className="text-sm font-mono text-gray-500 uppercase tracking-wider font-bold">
          Ready to Launch
        </span>
        <ChevronRight className={`w-5 h-5 text-gray-500 group-hover:text-${accentColor}-400 transition-colors duration-300`} />
      </div>
      
      {/* Subtle hover effect */}
      <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${accentColor}-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    </motion.div>
  )
}

// ROM Production Summary component
const ROMProductionSummary = ({ setShowROMOverview }: { setShowROMOverview: (show: boolean) => void }) => {
  const [romSummary, setRomSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const getJWTToken = () => {
    return agwAuthService.getJWT() || ''
  }

  const fetchROMSummary = async () => {
    try {
      setLoading(true)
      const jwtToken = getJWTToken()
      if (!jwtToken) {
        console.error('No JWT token available')
        return
      }

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
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setShowROMOverview(true)}
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-black/50 to-black/30 border border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300 cursor-pointer group"
    >
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-transparent opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-cyan-400/10 border border-cyan-400/30 group-hover:border-cyan-400/50 transition-all duration-300">
              <Cpu className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-cyan-400 font-mono group-hover:text-cyan-300 transition-colors duration-300">
                ROM COLLECTION
              </h3>
              <p className="text-cyan-400/70 font-mono text-sm group-hover:text-cyan-300/70 transition-colors duration-300">
                Digital Asset Production
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-cyan-400/50 group-hover:text-cyan-400 transition-colors duration-300" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full"
            />
          </div>
        ) : romSummary ? (
          <div className="space-y-4">
            {/* Key Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 rounded-lg p-3 border border-cyan-400/20">
                <div className="text-2xl font-bold text-cyan-400 font-mono">
                  {romSummary.totalRoms}
                </div>
                <div className="text-xs text-cyan-400/70 font-mono">TOTAL ROMS</div>
              </div>
              <div className="bg-black/20 rounded-lg p-3 border border-cyan-400/20">
                <div className="text-2xl font-bold text-cyan-400 font-mono">
                  {formatNumber(romSummary.totalClaimable?.energy || 0)}
                </div>
                <div className="text-xs text-cyan-400/70 font-mono">CLAIMABLE ⚡</div>
              </div>
            </div>
            
            {/* Daily Production */}
            <div className="space-y-3">
              <div className="text-cyan-400/80 font-mono text-xs font-bold">DAILY PRODUCTION</div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-400/70 font-mono text-xs">Energy</span>
                  </div>
                  <span className="text-cyan-400/70 font-mono font-bold text-xs">
                    {formatNumber(romSummary.dailyProduction?.energy || 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Gem className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-400/70 font-mono text-xs">Shards</span>
                  </div>
                  <span className="text-cyan-400/70 font-mono font-bold text-xs">
                    {formatNumber(romSummary.dailyProduction?.shards || 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-400/70 font-mono text-xs">Dust</span>
                  </div>
                  <span className="text-cyan-400/70 font-mono font-bold text-xs">
                    {formatNumber(romSummary.dailyProduction?.dust || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-cyan-400/50 font-mono text-sm">
            No ROM data available
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Game Progress Combined Display
const GameProgress = () => {
  const [fishingData, setFishingData] = useState<any>(null)
  const [dungeonData, setDungeonData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'fishing' | 'dungeons'>('fishing')

  // Use the same JWT token function as other components
  const getJWTToken = () => {
    return agwAuthService.getJWT() || ''
  }

  // Fetch fishing progress data
  const fetchFishingProgress = async () => {
    try {
      const jwtToken = getJWTToken()
      const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"
      const response = await fetch(`https://gigaverse.io/api/fishing/state/${WALLET_ADDRESS}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const dailyRuns = data.dayDoc?.UINT256_CID || 0
        const maxRuns = data.maxPerDayJuiced || data.maxPerDay || 10
        const hasActiveGame = data.gameState?.data?.COMPLETE_CID === null || data.gameState?.data?.COMPLETE_CID === false
        
        setFishingData({
          completed: dailyRuns,
          total: maxRuns,
          hasActiveGame: hasActiveGame,
          isJuiced: maxRuns > 10
        })
      } else {
        throw new Error('API request failed')
      }
    } catch (error) {
      console.error('Error fetching fishing progress:', error)
      setFishingData({ completed: 0, total: 10, hasActiveGame: false, isJuiced: false })
    }
  }

  // Fetch dungeon progress data
  const fetchDungeonProgress = async () => {
    try {
      const jwtToken = getJWTToken()
      const response = await fetch('/api/dungeon/progress', {
        headers: { 'Authorization': `Bearer ${jwtToken}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.dungeonDataEntities) {
          const getDungeonById = (id: number) => data.dungeonDataEntities.find((d: any) => d.ID_CID === id)
          const getCompletedRuns = (dungeonId: number) => {
            // Find progress data for this dungeon ID
            const progressData = data.dayProgressEntities?.find((p: any) => 
              parseInt(p.ID_CID) === dungeonId
            )
            return progressData ? (progressData.UINT256_CID || 0) : 0
          }
          const isPlayerJuiced = (dungeon: any) => {
            if (!dungeon) return false
            const standardRuns = dungeon.UINT256_CID || 0
            const juicedRuns = dungeon.juicedMaxRunsPerDay || 0
            return juicedRuns > standardRuns
          }

          const dungeon1 = getDungeonById(1)
          const dungeon2 = getDungeonById(2)
          const dungeon3 = getDungeonById(3)

          const parsedData = {
            normal: {
              name: dungeon1?.NAME_CID || "Dungetron 5000",
              energy: dungeon1?.ENERGY_CID || 40,
              completed: getCompletedRuns(1),
              total: dungeon1?.UINT256_CID || 10,
              juicedMax: dungeon1?.juicedMaxRunsPerDay || 12,
              isJuiced: isPlayerJuiced(dungeon1)
            },
            gigus: {
              name: dungeon2?.NAME_CID || "Gigus Dungeon",
              energy: dungeon2?.ENERGY_CID || 200,
              completed: getCompletedRuns(2),
              total: dungeon2?.UINT256_CID || 30,
              juicedMax: dungeon2?.juicedMaxRunsPerDay || 30,
              isJuiced: isPlayerJuiced(dungeon2)
            },
            underhaul: {
              name: dungeon3?.NAME_CID || "Dungetron Underhaul",
              energy: dungeon3?.ENERGY_CID || 40,
              completed: getCompletedRuns(3),
              total: dungeon3?.UINT256_CID || 8,
              juicedMax: dungeon3?.juicedMaxRunsPerDay || 9,
              isJuiced: isPlayerJuiced(dungeon3)
            }
          }
          setDungeonData(parsedData)
        }
      }
    } catch (error) {
      console.error('Error fetching dungeon progress:', error)
      setDungeonData({
        normal: { name: "Dungetron 5000", energy: 40, completed: 0, total: 10, juicedMax: 12, isJuiced: false },
        gigus: { name: "Gigus Dungeon", energy: 200, completed: 0, total: 30, juicedMax: 30, isJuiced: false },
        underhaul: { name: "Dungetron Underhaul", energy: 40, completed: 0, total: 8, juicedMax: 9, isJuiced: false }
      })
    }
  }

  // Fetch both data sources
  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([fetchFishingProgress(), fetchDungeonProgress()])
    setLoading(false)
  }

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <RefinedCard glowColor="blue" className="p-4">
        <div className="flex items-center justify-center h-32">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"
          />
        </div>
      </RefinedCard>
    )
  }

  // Calculate totals
  const fishingProgress = fishingData?.total > 0 ? fishingData.completed / fishingData.total : 0
  const dungeonModes = dungeonData ? [
    { ...dungeonData.normal, id: 'normal', color: 'cyan', icon: Target },
    { ...dungeonData.gigus, id: 'gigus', color: 'purple', icon: Flame },
    { ...dungeonData.underhaul, id: 'underhaul', color: 'red', icon: Bolt }
  ] : []
  const totalDungeonRuns = dungeonModes.reduce((sum, mode) => sum + mode.completed, 0)
  const totalDungeonMax = dungeonModes.reduce((sum, mode) => sum + (mode.isJuiced ? mode.juicedMax : mode.total), 0)

  return (
    <RefinedCard glowColor="blue" className="p-4">
      {/* Tab Headers */}
      <div className="flex items-center space-x-1 mb-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('fishing')}
          className={`flex-1 py-2 px-3 rounded-lg font-mono text-sm font-bold transition-all ${
            activeTab === 'fishing' 
              ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' 
              : 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10'
          }`}
        >
          <Fish className="w-4 h-4 inline mr-2" />
          FISHING
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('dungeons')}
          className={`flex-1 py-2 px-3 rounded-lg font-mono text-sm font-bold transition-all ${
            activeTab === 'dungeons' 
              ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' 
              : 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          DUNGEONS
        </motion.button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'fishing' ? (
          <motion.div
            key="fishing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Fishing Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-blue-400 font-mono text-sm font-bold">TACTICAL FISHING</span>
                {fishingData?.hasActiveGame && (
                  <span className="text-green-400 font-mono text-xs bg-green-400/20 px-2 py-1 rounded">
                    ACTIVE
                  </span>
                )}
                {fishingData?.isJuiced && (
                  <span className="text-yellow-400 font-mono text-xs bg-yellow-400/20 px-2 py-1 rounded">
                    ⚡ JUICED
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-blue-400 font-mono text-lg font-bold">
                  {fishingData?.completed || 0}/{fishingData?.total || 0}
                </div>
              </div>
            </div>

            {/* Fishing Progress Bar */}
            <div className="relative h-6 bg-gray-900/50 rounded border border-gray-600">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(5, fishingProgress * 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded relative overflow-hidden"
              >
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  style={{ width: '50%' }}
                />
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-mono text-xs font-bold drop-shadow-lg">
                  {Math.round(fishingProgress * 100)}%
                </span>
              </div>
            </div>

            {/* Fishing Stats */}
            <div className="flex justify-between text-xs font-mono text-gray-400">
              <span>Remaining: {Math.max(0, (fishingData?.total || 0) - (fishingData?.completed || 0))}</span>
              <span>Max: {fishingData?.total || 0}</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dungeons"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {/* Dungeon Summary */}
            <div className="flex items-center justify-between">
              <span className="text-blue-400 font-mono text-sm font-bold">DUNGEON RUNS</span>
              <div className="text-right">
                <div className="text-blue-400 font-mono text-lg font-bold">
                  {totalDungeonRuns}/{totalDungeonMax}
                </div>
              </div>
            </div>

            {/* Dungeon List */}
            <div className="space-y-1">
              {dungeonModes.map((mode) => {
                const actualTotal = mode.isJuiced ? mode.juicedMax : mode.total
                const progress = actualTotal > 0 ? mode.completed / actualTotal : 0
                
                return (
                  <div key={mode.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <mode.icon className={`w-3 h-3 text-${mode.color}-400`} />
                      <span className={`text-${mode.color}-400 font-mono text-xs font-bold`}>
                        {mode.name}
                      </span>
                      {mode.isJuiced && (
                        <span className="text-yellow-400 font-mono text-xs bg-yellow-400/20 px-1 py-0.5 rounded">
                          ⚡
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-16 h-1.5 bg-gray-900/50 rounded-full border border-gray-600`}>
                        <div 
                          className={`h-full bg-gradient-to-r from-${mode.color}-600 to-${mode.color}-400 rounded-full transition-all duration-300`}
                          style={{ width: `${Math.max(5, progress * 100)}%` }}
                        />
                      </div>
                      <span className={`text-${mode.color}-400 font-mono text-xs font-bold w-8 text-right`}>
                        {mode.completed}/{actualTotal}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Dungeon Summary */}
            <div className="pt-1 border-t border-blue-400/20">
              <div className="flex justify-between text-xs font-mono text-gray-400">
                <span>Total: {totalDungeonRuns} runs</span>
                <span>Max: {totalDungeonMax}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [showFishing, setShowFishing] = useState(false)
  const [showTokenManager, setShowTokenManager] = useState(false)
  const [showROMOverview, setShowROMOverview] = useState(false)
  const [showDeals, setShowDeals] = useState(false)
  const [showEnergyClaimModal, setShowEnergyClaimModal] = useState(false)
  const [energyClaimAmount, setEnergyClaimAmount] = useState(0)
  const [playerBalances, setPlayerBalances] = useState<Record<string, number>>({})
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [energyData, setEnergyData] = useState<{
    currentEnergy: number
    maxEnergy: number
    regenerationRate: number
    isPlayerJuiced: boolean
  } | null>(null)
  const [dungeonData, setDungeonData] = useState<any>(null)
  const [fishingData, setFishingData] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch energy data, dungeon data, and fishing data
  useEffect(() => {
    if (mounted) {
      fetchEnergyData()
      fetchDungeonData()
      fetchFishingData()
      const interval = setInterval(() => {
        fetchEnergyData()
        fetchDungeonData()
        fetchFishingData()
      }, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [mounted])

  // JWT Token management
  const getJWTToken = () => {
    return agwAuthService.getJWT() || ''
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

  const fetchEnergyData = async () => {
    try {
      const jwtToken = getJWTToken()
      if (!jwtToken) {
        console.error('No JWT token for energy fetch')
        return
      }

      const response = await fetch('/api/player/energy', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch energy:', response.status)
        return
      }

      const data = await response.json()
      console.log('Energy API response:', data)

      // Robust parsing: accept either proxied API structure or local mock fallback
      const entity = data?.entities?.[0]
      if (entity?.parsedData) {
        const parsed = entity.parsedData
        setEnergyData({
          currentEnergy: Math.max(0, parsed.energyValue ?? parsed.energy ?? 0),
          maxEnergy: parsed.maxEnergy ?? 420,
          regenerationRate: parsed.regenPerHour ?? 18,
          isPlayerJuiced: parsed.isPlayerJuiced ?? false
        })
        return
      }

      // Fallback: mock shape { energy, maxEnergy, lastRegenTime }
      if (typeof data?.energy === 'number' && typeof data?.maxEnergy === 'number') {
        setEnergyData({
          currentEnergy: data.energy,
          maxEnergy: data.maxEnergy,
          regenerationRate: 0,
          isPlayerJuiced: false
        })
        return
      }

      // Unknown shape: avoid noisy console error and set a safe default
      console.warn('Energy API returned unexpected shape. Using safe defaults.')
      setEnergyData({ currentEnergy: 0, maxEnergy: 420, regenerationRate: 0, isPlayerJuiced: false })

    } catch (error) {
      console.error('Failed to fetch energy:', error)
    }
  }

  const fetchDungeonData = async () => {
    try {
      const jwtToken = getJWTToken()
      if (!jwtToken) {
        console.error('No JWT token for dungeon fetch')
        return
      }

      const response = await fetch('/api/dungeon/progress', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch dungeon progress:', response.status)
        return
      }

      const data = await response.json()
      if (data.dungeonDataEntities) {
        const getDungeonById = (id: number) => data.dungeonDataEntities.find((d: any) => d.ID_CID === id)
        const getCompletedRuns = (dungeonId: number) => {
          const progressEntity = data.dayProgressEntities?.find((p: any) => p.ID_CID === dungeonId.toString())
          return progressEntity ? progressEntity.UINT256_CID : 0
        }
        const isPlayerJuiced = (dungeon: any) => {
          if (!dungeon) return false
          const standardRuns = dungeon.UINT256_CID || 0
          const juicedRuns = dungeon.juicedMaxRunsPerDay || 0
          return juicedRuns > standardRuns
        }

        const dungeon1 = getDungeonById(1)
        const dungeon2 = getDungeonById(2)
        const dungeon3 = getDungeonById(3)

        const parsedData = {
          normal: {
            name: dungeon1?.NAME_CID || "Dungetron 5000",
            completed: getCompletedRuns(1),
            total: dungeon1?.UINT256_CID || 10,
            energy: dungeon1?.ENERGY_CID || 40,
            juicedMax: dungeon1?.juicedMaxRunsPerDay || 12,
            isJuiced: isPlayerJuiced(dungeon1)
          },
          gigus: {
            name: dungeon2?.NAME_CID || "Gigus Dungeon",
            completed: getCompletedRuns(2),
            total: dungeon2?.UINT256_CID || 30,
            energy: dungeon2?.ENERGY_CID || 200,
            juicedMax: dungeon2?.juicedMaxRunsPerDay || 30,
            isJuiced: isPlayerJuiced(dungeon2)
          },
          underhaul: {
            name: dungeon3?.NAME_CID || "Dungetron Underhaul",
            completed: getCompletedRuns(3),
            total: dungeon3?.UINT256_CID || 8,
            energy: dungeon3?.ENERGY_CID || 40,
            juicedMax: dungeon3?.juicedMaxRunsPerDay || 9,
            isJuiced: isPlayerJuiced(dungeon3)
          }
        }

        setDungeonData(parsedData)
      }
    } catch (error) {
      console.error('Failed to fetch dungeon data:', error)
    }
  }

  const fetchFishingData = async () => {
    try {
      const jwtToken = getJWTToken()
      if (!jwtToken) {
        console.error('No JWT token for fishing fetch')
        return
      }

      const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"
      const response = await fetch(`https://gigaverse.io/api/fishing/state/${WALLET_ADDRESS}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch fishing state:', response.status)
        return
      }

      const data = await response.json()
      console.log('🎣 Fishing API response:', data)
      
      // Parse fishing data similar to how it's done in the Fishing component
      const dailyRuns = data.dayDoc?.UINT256_CID || 0
      const maxRuns = data.maxPerDayJuiced || data.maxPerDay || 10
      const isGameActive = data.gameState?.COMPLETE_CID === null || data.gameState?.COMPLETE_CID === false
      const isJuiced = maxRuns > 10 // Standard max is 10, juiced is higher
      
      const fishingProgressData = {
        completed: dailyRuns,
        total: maxRuns,
        hasActiveGame: isGameActive,
        isJuiced: isJuiced
      }
      
      setFishingData(fishingProgressData)
    } catch (error) {
      console.error('Failed to fetch fishing data:', error)
    }
  }

  // State for energy claiming
  const [energyClaimLoading, setEnergyClaimLoading] = useState(false)
  const [energyClaimMessage, setEnergyClaimMessage] = useState('')
  const [energyClaimResults, setEnergyClaimResults] = useState<{
    totalClaimed: number
    claimedRoms: Array<{ id: string; amount: number }>
  } | null>(null)

  // Calculate claimable energy when modal opens
  const handleEnergyClick = () => {
    setEnergyClaimResults(null)
    setEnergyClaimMessage('')
    setEnergyClaimAmount(50) // Default claim amount
    setShowEnergyClaimModal(true)
  }

  const handleEnergyClaim = async () => {
    try {
      setEnergyClaimLoading(true)
      setEnergyClaimMessage('')
      setEnergyClaimResults(null)
      
      const jwtToken = getJWTToken()
      if (!jwtToken) {
        setEnergyClaimMessage('Authentication required. Please login first.')
        return
      }

      console.log(`Starting energy claim with threshold: ${energyClaimAmount}`)
      
      const response = await fetch('/api/energy/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ threshold: energyClaimAmount })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        const totalClaimed = result.energy?.total || 0
        const claimedRoms = result.energy?.claimed_roms || []
        
        setEnergyClaimResults({
          totalClaimed,
          claimedRoms
        })
        
        if (totalClaimed > 0) {
          setEnergyClaimMessage(`✅ Successfully claimed ${totalClaimed} energy from ${claimedRoms.length} ROMs!`)
          // Refresh energy data to show updated amounts
          fetchEnergyData()
        } else {
          setEnergyClaimMessage('ℹ️ No energy was claimed. ROMs might already be empty or below threshold.')
        }
      } else {
        const errorMsg = result.error || result.details || 'Failed to claim energy'
        setEnergyClaimMessage(`❌ ${errorMsg}`)
        console.error('Energy claim failed:', result)
      }
      
    } catch (error) {
      console.error('Error claiming energy:', error)
      setEnergyClaimMessage('❌ Error claiming energy. Please try again.')
    } finally {
      setEnergyClaimLoading(false)
      // Clear message after 10 seconds
      setTimeout(() => {
        setEnergyClaimMessage('')
      }, 10000)
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
      id: 'deals',
      icon: Tag,
      title: 'DEALS',
      description: 'Check out current market deals',
      color: 'cyan'
    }
  ]

  const gameModes = [
    {
      id: 'dungeon',
      icon: Target,
      title: 'DUNGEON RUNNER',
      description: 'AI-powered dungeon exploration',
      color: 'blue',
      accent: 'blue'
    },
    {
      id: 'fishing',
      icon: Fish,
      title: 'FISHING',
      description: 'Cast your line and catch rare fish',
      color: 'blue',
      accent: 'blue'
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
              className="w-12 h-12 relative"
            >
              {/* Radar base circles */}
              <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-full" />
              <div className="absolute inset-1 border border-cyan-400/20 rounded-full" />
              <div className="absolute inset-2 border border-cyan-400/10 rounded-full" />
              
              {/* Radar sweep line */}
              <motion.div
                className="absolute inset-0 rounded-full overflow-hidden"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <div 
                  className="absolute top-1/2 left-1/2 w-6 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent origin-left"
                  style={{ transform: 'translate(-50%, -50%)' }}
                />
              </motion.div>
              
              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-cyan-400 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
              
              {/* Pulse effect */}
              <motion.div
                className="absolute inset-0 border border-cyan-400/40 rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold font-mono tracking-wider text-cyan-400">
                GIGA ⚡ PILOT
              </h1>
              <p className="text-cyan-300/70 font-mono text-sm">Gigaverse on Autopilot</p>
              
              {/* Moved AUTOPILOT ACTIVE below GIGA PILOT */}
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center space-x-2 text-green-400 font-mono text-xs mt-2"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>AUTOPILOT ACTIVE</span>
              </motion.div>
            </div>
          </div>
          
          {/* Right side: Wallet Connect, Token Manager and Energy Display */}
          <div className="flex items-center space-x-6 ml-auto">
            {/* Wallet Connection */}
            <WalletConnect />
            
            {/* JWT Token Manager */}
            <RefinedButton
              onClick={() => setShowTokenManager(true)}
              variant="secondary"
              className="text-sm"
              goldHover={true}
            >
              <Key className="w-4 h-4 mr-2" />
              TOKEN
            </RefinedButton>
            
            {/* Enhanced Energy Display */}
            <div className="max-w-2xl"> {/* Reduced from max-w-3xl to max-w-2xl since it's now on the right */}
              <div 
                className="bg-black/60 border border-cyan-400/30 rounded-lg p-5 backdrop-blur-sm cursor-pointer hover:border-cyan-400/50 transition-all duration-300 hover:bg-black/70"
                onClick={handleEnergyClick}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Battery className="w-4 h-4 text-cyan-400" />
                    </motion.div>
                    <span className="text-cyan-400 font-mono text-sm font-semibold">ENERGY</span>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 font-mono text-sm font-bold">
                      {energyData ? `${Math.round(energyData.currentEnergy)}/${energyData.maxEnergy}` : '--/--'}
                    </div>
                    <div className="text-yellow-400 font-mono text-xs">
                      +{energyData?.regenerationRate || 0}/hr
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden border border-cyan-400/20 mb-4">
                  {/* Background grid effect */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="grid grid-cols-20 h-full">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="border-r border-cyan-400/10 h-full" />
                      ))}
                    </div>
                  </div>
                  
                  {/* Energy fill with dynamic gradient */}
                  <motion.div
                    className={`absolute left-0 top-0 h-full rounded-full ${(() => {
                      const percentage = energyData ? (energyData.currentEnergy / energyData.maxEnergy) * 100 : 0;
                      if (percentage < 25) {
                        return 'bg-gradient-to-r from-red-600 via-red-500 to-red-400';
                      } else if (percentage < 50) {
                        return 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500';
                      } else if (percentage < 75) {
                        return 'bg-gradient-to-r from-yellow-500 via-yellow-400 to-green-400';
                      } else {
                        return 'bg-gradient-to-r from-green-500 via-cyan-400 to-cyan-300';
                      }
                    })()}`}
                    initial={{ width: 0 }}
                    animate={{ 
                      width: energyData ? `${(energyData.currentEnergy / energyData.maxEnergy) * 100}%` : '0%'
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                  
                  {/* Animated pulse overlay */}
                  <motion.div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
                    animate={{ 
                      x: energyData ? `${(energyData.currentEnergy / energyData.maxEnergy) * 100}%` : '-100%',
                      opacity: [0, 1, 0]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: 'easeInOut'
                    }}
                    style={{ 
                      width: '40px',
                      transform: 'translateX(-20px)'
                    }}
                  />
                  
                  {/* Critical energy warning */}
                  {energyData && energyData.currentEnergy < 100 && (
                    <motion.div
                      className="absolute inset-0 bg-red-400/20 rounded-full"
                      animate={{ opacity: [0.2, 0.8, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
                
                {/* Status indicators with better layout */}
                <div className="grid grid-cols-2 gap-8 text-xs font-mono">
                  <div className="flex justify-start">
                    {energyData?.isPlayerJuiced ? (
                      <span className="text-yellow-400 font-semibold">⚡ JUICED</span>
                    ) : (
                      <span className="text-gray-400">STANDARD</span>
                    )}
                  </div>
                  <div className="flex justify-end">
                    {energyData && energyData.currentEnergy < energyData.maxEnergy ? (
                      <span className="text-gray-400">
                        <span className="text-cyan-400">TIME TO FULL:</span> {(() => {
                          const totalMinutes = Math.round((energyData.maxEnergy - energyData.currentEnergy) / (energyData.regenerationRate / 60));
                          const hours = Math.floor(totalMinutes / 60);
                          const minutes = totalMinutes % 60;
                          
                          if (hours > 0) {
                            return `${hours}h ${minutes}m`;
                          } else {
                            return `${minutes}m`;
                          }
                        })()}
                      </span>
                    ) : (
                      <span className="text-green-400 font-semibold">⚡ FULL</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <ROMProductionSummary setShowROMOverview={setShowROMOverview} />
            <GameProgress />
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
                          } else if (station.id === 'deals') {
                            setShowDeals(true)
                          }
                        }}
                     />
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* Game Modes Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12"
            >
              <h2 className="text-2xl font-bold font-mono text-purple-400 mb-6 flex items-center">
                <Gamepad2 className="w-6 h-6 mr-3" />
                GAME MODES
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {gameModes.map((mode, index) => (
                  <motion.div
                    key={mode.id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.2 }}
                  >
                    <GameMode
                      icon={mode.icon}
                      title={mode.title}
                      description={mode.description}
                      color={mode.color}
                      accent={mode.accent}
                      isDungeon={mode.id === 'dungeon'}
                      dungeonData={mode.id === 'dungeon' ? dungeonData : undefined}
                      isFishing={mode.id === 'fishing'}
                      fishingData={mode.id === 'fishing' ? fishingData : undefined}
                      onClick={() => {
                        setActiveStation(mode.id)
                        if (mode.id === 'dungeon') {
                          setShowDungeonRunner(true)
                        } else if (mode.id === 'fishing') {
                          setShowFishing(true)
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
          <RefinedCard glowColor="cyan" className="p-4 card-gold-hover">
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
       <Fishing
         isOpen={showFishing}
         onClose={() => setShowFishing(false)}
       />
       <TokenManager
         isOpen={showTokenManager}
         onClose={() => setShowTokenManager(false)}
       />
       <ROMOverview
         isOpen={showROMOverview}
         onClose={() => setShowROMOverview(false)}
       />

       {/* Deals Modal */}
       {showDeals && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
           onClick={() => setShowDeals(false)}
         >
           <motion.div
             initial={{ scale: 0.8, opacity: 0, y: 50 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.8, opacity: 0, y: 50 }}
             transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-black/90 border-2 border-cyan-400/50 rounded-xl p-0 max-w-[90vw] w-full mx-4 backdrop-blur-md max-h-[92vh] overflow-hidden"
             onClick={(e) => e.stopPropagation()}
           >
             <DealsModal onClose={() => setShowDeals(false)} />
           </motion.div>
         </motion.div>
       )}

       {/* Energy Claiming Modal */}
       {showEnergyClaimModal && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
           onClick={() => setShowEnergyClaimModal(false)}
         >
           <motion.div
             initial={{ scale: 0.8, opacity: 0, y: 50 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.8, opacity: 0, y: 50 }}
             transition={{ type: 'spring', damping: 20, stiffness: 300 }}
             className="bg-black/90 border-2 border-cyan-400/50 rounded-xl p-8 max-w-md w-full mx-4 backdrop-blur-md"
             onClick={(e) => e.stopPropagation()}
           >
             {/* Header */}
             <div className="text-center mb-6">
               <motion.div
                 animate={{ scale: [1, 1.1, 1] }}
                 transition={{ duration: 2, repeat: Infinity }}
                 className="inline-flex items-center justify-center w-16 h-16 bg-cyan-400/20 rounded-full mb-4"
               >
                 <Battery className="w-8 h-8 text-cyan-400" />
               </motion.div>
               <h2 className="text-2xl font-bold font-mono text-cyan-400 mb-2">ENERGY CLAIM</h2>
               <p className="text-gray-400 font-mono text-sm">Select amount to claim instantly</p>
             </div>

             {/* Current Energy Stats */}
             <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-cyan-400/20">
               <div className="grid grid-cols-2 gap-4 text-center">
                 <div>
                   <div className="text-cyan-400 font-mono text-xs uppercase">Current</div>
                   <div className="text-white font-mono text-lg font-bold">
                     {energyData ? Math.round(energyData.currentEnergy) : 0}
                   </div>
                 </div>
                 <div>
                   <div className="text-cyan-400 font-mono text-xs uppercase">Maximum</div>
                   <div className="text-white font-mono text-lg font-bold">
                     {energyData?.maxEnergy || 0}
                   </div>
                 </div>
               </div>
               
               {/* Mini Progress Bar */}
               <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                 <motion.div
                   className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300"
                   initial={{ width: 0 }}
                   animate={{ 
                     width: energyData ? `${(energyData.currentEnergy / energyData.maxEnergy) * 100}%` : '0%'
                   }}
                   transition={{ duration: 0.5 }}
                 />
               </div>
             </div>

             {/* Energy Claim Amount */}
             <div className="mb-6">
               <div className="flex justify-between items-center mb-3">
                 <label className="text-cyan-400 font-mono text-sm font-semibold">CLAIM AMOUNT</label>
                 <span className="text-yellow-400 font-mono text-lg font-bold">
                   +{Math.round(energyClaimAmount)}
                 </span>
               </div>
               
               {/* Custom Slider */}
               <div className="relative">
                 <input
                   type="range"
                   min="10"
                   max="500"
                   step="10"
                   value={energyClaimAmount}
                   onChange={(e) => setEnergyClaimAmount(Number(e.target.value))}
                   className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider-cyan"
                   disabled={energyClaimLoading}
                 />
                 
                 {/* Slider track decoration */}
                 <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-cyan-600/30 to-yellow-400/30 rounded-full pointer-events-none transform -translate-y-1/2" />
                 
                 {/* Slider fill */}
                 <motion.div
                   className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-400 to-yellow-400 rounded-full pointer-events-none transform -translate-y-1/2"
                   animate={{
                     width: `${((energyClaimAmount - 10) / (500 - 10)) * 100}%`
                   }}
                 />
               </div>
               
               {/* Slider Labels */}
               <div className="flex justify-between mt-2 text-xs font-mono text-gray-400">
                 <span>10</span>
                 <span className="text-cyan-400">Target energy to claim</span>
                 <span>500</span>
               </div>
             </div>

             {/* Claim Results */}
             {energyClaimResults && (
               <div className="bg-green-400/10 rounded-lg p-4 mb-6 border border-green-400/30">
                 <div className="text-center">
                   <div className="text-green-400 font-mono text-xs uppercase mb-1">Claim Results</div>
                   <div className="text-white font-mono text-xl font-bold mb-2">
                     +{energyClaimResults.totalClaimed} Energy
                   </div>
                   <div className="text-sm text-gray-300 font-mono">
                     From {energyClaimResults.claimedRoms.length} ROM{energyClaimResults.claimedRoms.length !== 1 ? 's' : ''}
                   </div>
                 </div>
               </div>
             )}

             {/* Status Message */}
             {energyClaimMessage && (
               <div className="bg-gray-900/50 rounded-lg p-3 mb-6 border border-gray-600/30">
                 <div className="text-center text-sm font-mono text-gray-300">
                   {energyClaimMessage}
                 </div>
               </div>
             )}

             {/* Action Buttons */}
             <div className="flex space-x-3">
               <RefinedButton
                 onClick={() => setShowEnergyClaimModal(false)}
                 variant="secondary"
                 className="flex-1"
                 disabled={energyClaimLoading}
               >
                 CANCEL
               </RefinedButton>
               <RefinedButton
                 onClick={handleEnergyClaim}
                 variant="primary"
                 className="flex-1"
                 disabled={energyClaimAmount <= 0 || energyClaimLoading}
                 goldHover={true}
               >
                 <div className="flex items-center justify-center space-x-2">
                   {energyClaimLoading ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                       <span>CLAIMING...</span>
                     </>
                   ) : (
                     <>
                       <span>CLAIM</span>
                       <motion.div
                         animate={{ scale: [1, 1.2, 1] }}
                         transition={{ duration: 1, repeat: Infinity }}
                       >
                         ⚡
                       </motion.div>
                     </>
                   )}
                 </div>
               </RefinedButton>
             </div>

             {/* Warning Text */}
             {energyClaimAmount > 0 && (
               <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="mt-4 text-center text-yellow-400 font-mono text-xs"
               >
                 ⚠ Energy claiming may consume resources
               </motion.div>
             )}
           </motion.div>
         </motion.div>
       )}
     </div>
   )
}
