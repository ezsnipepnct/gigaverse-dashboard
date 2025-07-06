'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Zap, 
  Gem, 
  Sparkles,
  Clock,
  TrendingUp,
  Package,
  Star,
  Calendar,
  RefreshCw,
  Award,
  Coins,
  Battery,
  Hammer,
  AlertCircle
} from 'lucide-react'

interface ROMOverviewProps {
  isOpen: boolean
  onClose: () => void
}

interface ROM {
  romId: string
  name: string
  tier: string
  rarity: string
  energyRate: number
  shardsRate: number
  dustRate: number
  energyClaimable: number
  shardsClaimable: number
  dustClaimable: number
  lastClaim: number
  image: string
  description: string
  memory?: string
  faction?: string
  serialNumber?: string
}

interface ROMSummary {
  totalRoms: number
  totalWeeklyProduction: {
    energy: number
    shards: number
    dust: number
  }
  totalClaimable: {
    energy: number
    shards: number
    dust: number
  }
  dailyProduction: {
    energy: number
    shards: number
    dust: number
  }
}

const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"

// JWT Token management
const getJWTToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jwt_token') || ''
  }
  return ''
}

const ROMOverview: React.FC<ROMOverviewProps> = ({ isOpen, onClose }) => {
  const [roms, setRoms] = useState<ROM[]>([])
  const [summary, setSummary] = useState<ROMSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [mounted, setMounted] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimMessage, setClaimMessage] = useState<string>('')

  // Debug props
  useEffect(() => {
    console.log('🟢 ROMOverview props changed - isOpen:', isOpen)
  }, [isOpen])

  // Fix hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch ROM data when component opens
  useEffect(() => {
    if (isOpen) {
      fetchROMData()
    }
  }, [isOpen])

  const fetchROMData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const jwtToken = getJWTToken()
      if (!jwtToken) {
        setError('Authentication required. Please login first.')
        return
      }

      console.log('Fetching ROM data...')
      const response = await fetch(`/api/player/roms?wallet=${WALLET_ADDRESS}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch ROM data: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setRoms(data.roms || [])
        setSummary(data.summary || null)
        console.log('ROM data loaded:', data.roms?.length || 0, 'ROMs')
      } else {
        throw new Error(data.error || 'Failed to fetch ROM data')
      }
    } catch (error) {
      console.error('Error fetching ROM data:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getTierStyling = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'giga':
        return {
          cardClass: 'bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-cyan-500/20 border-2 border-purple-400/50 shadow-lg shadow-purple-400/20',
          hoverClass: 'hover:border-purple-400/80 hover:shadow-purple-400/40 hover:scale-105',
          textColor: 'text-purple-400',
          badgeClass: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/50 text-purple-300 font-bold shadow-lg',
          icon: <Award className="w-4 h-4 text-purple-400" />,
          accentColor: 'purple-400'
        }
      case 'void':
        return {
          cardClass: 'bg-gradient-to-br from-gray-800/50 to-black/50 border-2 border-gray-600/50 shadow-lg shadow-gray-600/20',
          hoverClass: 'hover:border-gray-400/80 hover:shadow-gray-400/40 hover:scale-105',
          textColor: 'text-gray-300',
          badgeClass: 'bg-gradient-to-r from-gray-700/50 to-gray-900/50 border-gray-500/50 text-gray-300 font-bold shadow-lg',
          icon: <Gem className="w-4 h-4 text-gray-400" />,
          accentColor: 'gray-400'
        }
      case 'gold':
        return {
          cardClass: 'bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border-2 border-yellow-400/50 shadow-lg shadow-yellow-400/20',
          hoverClass: 'hover:border-yellow-400/80 hover:shadow-yellow-400/40 hover:scale-105',
          textColor: 'text-yellow-400',
          badgeClass: 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border-yellow-400/50 text-yellow-300 font-bold shadow-lg',
          icon: <Star className="w-4 h-4 text-yellow-400" />,
          accentColor: 'yellow-400'
        }
      case 'silver':
        return {
          cardClass: 'bg-gradient-to-br from-slate-400/20 to-gray-500/20 border-2 border-slate-400/50 shadow-lg shadow-slate-400/20',
          hoverClass: 'hover:border-slate-400/80 hover:shadow-slate-400/40 hover:scale-105',
          textColor: 'text-slate-300',
          badgeClass: 'bg-gradient-to-r from-slate-500/30 to-gray-500/30 border-slate-400/50 text-slate-300 font-bold shadow-lg',
          icon: <Sparkles className="w-4 h-4 text-slate-400" />,
          accentColor: 'slate-400'
        }
      default:
        return {
          cardClass: 'bg-gradient-to-br from-gray-500/20 to-gray-600/20 border border-gray-500/30 shadow-md',
          hoverClass: 'hover:border-gray-500/50 hover:shadow-gray-500/30 hover:scale-102',
          textColor: 'text-gray-400',
          badgeClass: 'bg-gray-600/30 border-gray-500/50 text-gray-400',
          icon: <Package className="w-4 h-4 text-gray-400" />,
          accentColor: 'gray-400'
        }
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'Never'
    const now = Date.now() / 1000
    const diff = now - timestamp
    const hours = Math.floor(diff / 3600)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Recently'
  }

  const claimAllEnergy = async () => {
    try {
      setClaiming(true)
      setClaimMessage('')
      
      const jwtToken = getJWTToken()
      if (!jwtToken) {
        setClaimMessage('Authentication required. Please login first.')
        return
      }

      // Filter ROMs that have claimable energy
      const claimableRoms = roms.filter(rom => rom.energyClaimable > 0)
      
      if (claimableRoms.length === 0) {
        setClaimMessage('No energy available to claim.')
        return
      }

      console.log(`Claiming energy from ${claimableRoms.length} ROMs...`)
      
      let successCount = 0
      let totalClaimed = 0
      
      for (const rom of claimableRoms) {
        try {
          const response = await fetch('/api/energy/claim', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${jwtToken}`,
            },
            body: JSON.stringify({
              romId: rom.romId,
              wallet: WALLET_ADDRESS
            })
          })

          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              successCount++
              totalClaimed += rom.energyClaimable
              console.log(`Claimed ${rom.energyClaimable} energy from ROM #${rom.romId}`)
            }
          } else {
            console.error(`Failed to claim from ROM #${rom.romId}:`, response.status)
          }
        } catch (error) {
          console.error(`Error claiming from ROM #${rom.romId}:`, error)
        }
        
        // Small delay between claims to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      if (successCount > 0) {
        setClaimMessage(`Successfully claimed ${formatNumber(totalClaimed)} energy from ${successCount} ROMs!`)
        // Refresh ROM data to show updated claimable amounts
        setTimeout(() => {
          fetchROMData()
        }, 2000)
      } else {
        setClaimMessage('Failed to claim energy. Please try again.')
      }
      
    } catch (error) {
      console.error('Error claiming all energy:', error)
      setClaimMessage('Error claiming energy. Please try again.')
    } finally {
      setClaiming(false)
      // Clear message after 5 seconds
      setTimeout(() => {
        setClaimMessage('')
      }, 5000)
    }
  }

  // Don't render until mounted to prevent hydration issues
  if (!mounted) return null

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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-black/90 border border-cyan-400/50 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Streamlined Header */}
            <div className="border-b border-cyan-400/20 p-4 bg-cyan-400/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Package className="w-6 h-6 text-cyan-400" />
                  <div>
                    <h1 className="text-xl font-bold text-cyan-400 font-mono">
                      ROM COLLECTION
                    </h1>
                    <p className="text-cyan-400/70 font-mono text-sm">
                      {roms.length} ROMs • Digital Asset Production
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 max-h-[calc(90vh-120px)] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full mx-auto mb-3"
                    />
                    <p className="text-cyan-400 font-mono text-sm">LOADING ROMs...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <p className="text-red-400 font-mono text-lg mb-2">ERROR</p>
                  <p className="text-gray-400 font-mono text-sm">{error}</p>
                  <button
                    onClick={fetchROMData}
                    className="mt-4 px-4 py-2 bg-cyan-400/20 border border-cyan-400/50 rounded text-cyan-400 hover:bg-cyan-400/30 transition-colors font-mono text-sm"
                  >
                    RETRY
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Compact Summary Cards */}
                  {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Total ROMs */}
                      <div className="bg-black/40 border border-cyan-400/30 p-3 rounded">
                        <div className="flex items-center space-x-2">
                          <Package className="w-5 h-5 text-cyan-400" />
                          <div>
                            <div className="text-lg font-bold text-cyan-400 font-mono">
                              {summary.totalRoms}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">ROMs</div>
                          </div>
                        </div>
                      </div>

                      {/* Daily Energy */}
                      <div className="bg-black/40 border border-yellow-400/30 p-3 rounded">
                        <div className="flex items-center space-x-2">
                          <Battery className="w-5 h-5 text-yellow-400" />
                          <div>
                            <div className="text-lg font-bold text-yellow-400 font-mono">
                              {formatNumber(summary.dailyProduction.energy)}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">ENERGY/DAY</div>
                          </div>
                        </div>
                      </div>

                      {/* Daily Shards */}
                      <div className="bg-black/40 border border-purple-400/30 p-3 rounded">
                        <div className="flex items-center space-x-2">
                          <Gem className="w-5 h-5 text-purple-400" />
                          <div>
                            <div className="text-lg font-bold text-purple-400 font-mono">
                              {formatNumber(summary.dailyProduction.shards)}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">SHARDS/DAY</div>
                          </div>
                        </div>
                      </div>

                      {/* Daily Dust */}
                      <div className="bg-black/40 border border-orange-400/30 p-3 rounded">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-5 h-5 text-orange-400" />
                          <div>
                            <div className="text-lg font-bold text-orange-400 font-mono">
                              {formatNumber(summary.dailyProduction.dust)}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">DUST/DAY</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Claim Action */}
                  {summary && summary.totalClaimable.energy > 0 && (
                    <div className="bg-cyan-400/10 border border-cyan-400/30 rounded p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Zap className="w-5 h-5 text-cyan-400" />
                          <div>
                            <div className="text-cyan-400 font-mono text-sm font-bold">
                              {formatNumber(summary.totalClaimable.energy)} ENERGY CLAIMABLE
                            </div>
                            <div className="text-gray-400 font-mono text-xs">
                              Ready to claim from your ROMs
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={claimAllEnergy}
                          disabled={claiming}
                          className="px-4 py-2 bg-cyan-400/20 border border-cyan-400/50 rounded text-cyan-400 hover:bg-cyan-400/30 transition-colors disabled:opacity-50 font-mono text-sm"
                        >
                          {claiming ? 'CLAIMING...' : 'CLAIM ALL'}
                        </button>
                      </div>
                      {claimMessage && (
                        <div className="mt-2 text-xs font-mono text-yellow-400">
                          {claimMessage}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Clean ROM Grid */}
                  <div>
                    <h3 className="text-lg font-bold text-cyan-400 font-mono mb-3 flex items-center space-x-2">
                      <Package className="w-4 h-4" />
                      <span>YOUR ROMS ({roms.length})</span>
                    </h3>
                    
                    {roms.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 font-mono">NO ROMS FOUND</p>
                        <p className="text-gray-500 font-mono text-sm mt-2">
                          Purchase ROMs to start generating resources
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roms.map((rom) => {
                          const tierStyle = getTierStyling(rom.tier)
                          return (
                            <motion.div
                              key={rom.romId}
                              whileHover={{ scale: 1.02 }}
                              className={`relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${tierStyle.cardClass} ${tierStyle.hoverClass}`}
                            >
                              {/* Subtle animated background overlay */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                              
                              {/* Content */}
                              <div className="relative z-10">
                                {/* Enhanced ROM Header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-full bg-black/30 border border-white/20">
                                      {tierStyle.icon}
                                    </div>
                                    <div>
                                      <div className={`font-mono text-sm font-bold ${tierStyle.textColor}`}>
                                        ROM #{rom.romId}
                                      </div>
                                      {rom.name && (
                                        <div className="text-xs text-gray-400 font-mono">
                                          {rom.name}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`px-3 py-1 text-xs font-mono border rounded-full ${tierStyle.badgeClass}`}>
                                    {rom.tier.toUpperCase()}
                                  </span>
                                </div>

                                {/* ROM Details */}
                                {(rom.memory || rom.faction) && (
                                  <div className="mb-3 p-2 bg-black/20 rounded border border-white/10">
                                    <div className="text-xs font-mono text-gray-400">
                                      {rom.memory && <span className="text-cyan-400">{rom.memory}</span>}
                                      {rom.memory && rom.faction && <span className="text-gray-500"> • </span>}
                                      {rom.faction && <span className="text-blue-400">{rom.faction}</span>}
                                    </div>
                                  </div>
                                )}

                                {/* Enhanced Production Rates */}
                                <div className="space-y-2 mb-3">
                                  <div className="text-xs font-mono text-gray-300 font-bold">DAILY PRODUCTION</div>
                                  
                                  <div className="grid grid-cols-1 gap-2">
                                    <div className="flex items-center justify-between p-2 bg-black/20 rounded border border-yellow-400/20">
                                      <span className="text-yellow-400 font-mono flex items-center space-x-2">
                                        <Battery className="w-3 h-3" />
                                        <span>Energy</span>
                                      </span>
                                      <span className="text-yellow-400 font-mono font-bold">
                                        {formatNumber(rom.energyRate)}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-2 bg-black/20 rounded border border-purple-400/20">
                                      <span className="text-purple-400 font-mono flex items-center space-x-2">
                                        <Gem className="w-3 h-3" />
                                        <span>Shards</span>
                                      </span>
                                      <span className="text-purple-400 font-mono font-bold">
                                        {formatNumber(rom.shardsRate)}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-2 bg-black/20 rounded border border-orange-400/20">
                                      <span className="text-orange-400 font-mono flex items-center space-x-2">
                                        <Sparkles className="w-3 h-3" />
                                        <span>Dust</span>
                                      </span>
                                      <span className="text-orange-400 font-mono font-bold">
                                        {formatNumber(rom.dustRate)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Enhanced Claimable Amounts */}
                                {(rom.energyClaimable > 0 || rom.shardsClaimable > 0 || rom.dustClaimable > 0) && (
                                  <div className={`border-t border-${tierStyle.accentColor}/30 pt-3 mt-3`}>
                                    <div className={`text-xs font-mono ${tierStyle.textColor} font-bold mb-2 flex items-center space-x-1`}>
                                      <Zap className="w-3 h-3" />
                                      <span>CLAIMABLE REWARDS</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                      {rom.energyClaimable > 0 && (
                                        <div className="text-center p-2 bg-yellow-400/10 rounded border border-yellow-400/30">
                                          <div className="text-yellow-400 font-mono font-bold">
                                            {formatNumber(rom.energyClaimable)}
                                          </div>
                                          <div className="text-yellow-400/70 font-mono text-xs">ENERGY</div>
                                        </div>
                                      )}
                                      {rom.shardsClaimable > 0 && (
                                        <div className="text-center p-2 bg-purple-400/10 rounded border border-purple-400/30">
                                          <div className="text-purple-400 font-mono font-bold">
                                            {formatNumber(rom.shardsClaimable)}
                                          </div>
                                          <div className="text-purple-400/70 font-mono text-xs">SHARDS</div>
                                        </div>
                                      )}
                                      {rom.dustClaimable > 0 && (
                                        <div className="text-center p-2 bg-orange-400/10 rounded border border-orange-400/30">
                                          <div className="text-orange-400 font-mono font-bold">
                                            {formatNumber(rom.dustClaimable)}
                                          </div>
                                          <div className="text-orange-400/70 font-mono text-xs">DUST</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Enhanced Last Claim Info */}
                                {rom.lastClaim && (
                                  <div className="mt-3 pt-2 border-t border-gray-600/30">
                                    <div className="text-xs text-gray-500 font-mono flex items-center justify-center space-x-1">
                                      <Clock className="w-3 h-3" />
                                      <span>Last claim: {formatTimeAgo(rom.lastClaim)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ROMOverview 