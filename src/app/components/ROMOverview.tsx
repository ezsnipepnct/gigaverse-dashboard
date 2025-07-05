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

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'mythic': return 'text-red-400 border-red-400 bg-red-400/10'
      case 'legendary': return 'text-yellow-400 border-yellow-400 bg-yellow-400/10'
      case 'epic': return 'text-purple-400 border-purple-400 bg-purple-400/10'
      case 'rare': return 'text-blue-400 border-blue-400 bg-blue-400/10'
      case 'uncommon': return 'text-green-400 border-green-400 bg-green-400/10'
      default: return 'text-gray-400 border-gray-400 bg-gray-400/10'
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'diamond':
      case 'mythic': return <Award className="w-4 h-4 text-red-400" />
      case 'gold':
      case 'legendary': return <Star className="w-4 h-4 text-yellow-400" />
      case 'silver':
      case 'epic': return <Gem className="w-4 h-4 text-purple-400" />
      case 'bronze':
      case 'rare': return <Sparkles className="w-4 h-4 text-blue-400" />
      default: return <Package className="w-4 h-4 text-gray-400" />
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {roms.map((rom) => (
                          <motion.div
                            key={rom.romId}
                            whileHover={{ scale: 1.02 }}
                            className="bg-black/40 border border-cyan-400/30 p-3 rounded hover:border-cyan-400/50 transition-all duration-200"
                          >
                            {/* ROM Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {getTierIcon(rom.tier)}
                                <span className="font-mono text-sm text-gray-300">
                                  ROM #{rom.romId}
                                </span>
                              </div>
                              <span className={`px-2 py-1 text-xs font-mono border rounded ${getRarityColor(rom.tier)}`}>
                                {rom.tier.toUpperCase()}
                              </span>
                            </div>

                            {/* ROM Details */}
                            {(rom.memory || rom.faction) && (
                              <div className="mb-2 text-xs font-mono text-gray-400">
                                {rom.memory && <span>{rom.memory}</span>}
                                {rom.memory && rom.faction && <span> • </span>}
                                {rom.faction && <span>{rom.faction}</span>}
                              </div>
                            )}

                            {/* Clean Production Rates */}
                            <div className="space-y-1 mb-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-yellow-400 font-mono flex items-center space-x-1">
                                  <Battery className="w-3 h-3" />
                                  <span>Energy</span>
                                </span>
                                <span className="text-yellow-400 font-mono">
                                  {formatNumber(rom.energyRate)}/day
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-purple-400 font-mono flex items-center space-x-1">
                                  <Gem className="w-3 h-3" />
                                  <span>Shards</span>
                                </span>
                                <span className="text-purple-400 font-mono">
                                  {formatNumber(rom.shardsRate)}/day
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-orange-400 font-mono flex items-center space-x-1">
                                  <Sparkles className="w-3 h-3" />
                                  <span>Dust</span>
                                </span>
                                <span className="text-orange-400 font-mono">
                                  {formatNumber(rom.dustRate)}/day
                                </span>
                              </div>
                            </div>

                            {/* Claimable Amounts */}
                            {(rom.energyClaimable > 0 || rom.shardsClaimable > 0 || rom.dustClaimable > 0) && (
                              <div className="border-t border-cyan-400/20 pt-2">
                                <div className="text-xs font-mono text-cyan-400 mb-1">CLAIMABLE</div>
                                <div className="flex items-center justify-between text-xs">
                                  {rom.energyClaimable > 0 && (
                                    <span className="text-yellow-400 font-mono">
                                      ⚡ {formatNumber(rom.energyClaimable)}
                                    </span>
                                  )}
                                  {rom.shardsClaimable > 0 && (
                                    <span className="text-purple-400 font-mono">
                                      💎 {formatNumber(rom.shardsClaimable)}
                                    </span>
                                  )}
                                  {rom.dustClaimable > 0 && (
                                    <span className="text-orange-400 font-mono">
                                      ✨ {formatNumber(rom.dustClaimable)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Last Claim */}
                            {rom.lastClaim && (
                              <div className="text-xs text-gray-500 font-mono mt-2 flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>Last claim: {formatTimeAgo(rom.lastClaim)}</span>
                              </div>
                            )}
                          </motion.div>
                        ))}
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