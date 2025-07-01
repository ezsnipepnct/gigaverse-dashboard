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
  Hammer
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
  // Try localStorage first
  if (typeof window !== 'undefined') {
    const savedToken = localStorage.getItem('jwt_token') || localStorage.getItem('authToken')
    if (savedToken) {
      return savedToken
    }
  }
  
  // Fallback to hardcoded token for backward compatibility
  const hardcodedToken = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwidXNlciI6eyJfaWQiOiI2N2I5MjE1YTEwOGFlZGRiNDA5YTdlNzMiLCJ3YWxsZXRBZGRyZXNzIjoiMHhiMGQ5MGQ1MmM3Mzg5ODI0ZDRiMjJjMDZiY2RjY2Q3MzRlMzE2MmI3IiwidXNlcm5hbWUiOiIweGIwZDkwRDUyQzczODk4MjRENEIyMmMwNmJjZGNjRDczNEUzMTYyYjciLCJjYXNlU2Vuc2l0aXZlQWRkcmVzcyI6IjB4YjBkOTBENTJDNzM4OTgyNEQ0QjIyYzA2YmNkY0NENzM0RTMxNjJiNyIsIl9fdiI6MH0sImdhbWVBY2NvdW50Ijp7Im5vb2IiOnsiX2lkIjoiNjdiOTIxNzRlM2MzOWRjYTZmZGFkZjA5IiwiZG9jSWQiOiIyMTQyNCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiTEFTVF9UUkFOU0ZFUl9USU1FX0NJRCI6MTc0MDE4NTk2NCwiY3JlYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMi45NDZaIiwidXBkYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMy4xNjVaIiwiTEVWRUxfQ0lEIjoxLCJJU19OT09CX0NJRCI6dHJ1ZSwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJPV05FUl9DSUQiOiIweGIwZDkwZDUyYzczODk4MjRkNGIyMmMwNmJjZGNjZDczNGUzMTYyYjciLCJhbGxvd2VkVG9DcmVhdGVBY2NvdW50Ijp0cnVlLCJjYW5FbnRlckdhbWUiOnRydWUsIm5vb2JQYXNzQmFsYW5jZSI6MCwibGFzdE5vb2JJZCI6NzM4ODQsIm1heE5vb2JJZCI6MTAwMDB9LCJleHAiOjE3NTAxMTY0MzF9.M26R6pDnFSSIbMXHa6kOhT_Hrjn3U7nkm_sGv0rY0uY"
  return hardcodedToken
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
  if (!mounted) {
    return null
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
                    <Package className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-cyan-400 font-mono tracking-wider neon-pulse">
                      ROM COLLECTION
                    </h2>
                    <p className="text-cyan-300/70 font-mono">NFT RESOURCE GENERATORS</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={fetchROMData}
                    disabled={loading}
                    className="p-2 bg-cyan-400/20 border border-cyan-400/50 rounded text-cyan-400 hover:bg-cyan-400/30 transition-colors disabled:opacity-50"
                    title="Refresh ROM Data"
                  >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full mx-auto mb-4"
                    />
                    <p className="text-cyan-400 font-mono">LOADING ROM DATA...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <X className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400 font-mono mb-4">ERROR LOADING ROM DATA</p>
                    <p className="text-gray-400 font-mono text-sm mb-4">{error}</p>
                    <button
                      onClick={fetchROMData}
                      className="px-4 py-2 bg-cyan-400/20 border border-cyan-400/50 rounded text-cyan-400 hover:bg-cyan-400/30 transition-colors font-mono text-sm"
                    >
                      RETRY
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  {summary && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total ROMs */}
                        <div className="bg-black/60 border border-cyan-400/30 p-4 rounded">
                          <div className="flex items-center space-x-3">
                            <Package className="w-8 h-8 text-cyan-400" />
                            <div>
                              <div className="text-2xl font-bold text-cyan-400 font-mono">
                                {summary.totalRoms}
                              </div>
                              <div className="text-xs text-gray-400 font-mono">TOTAL ROMS</div>
                            </div>
                          </div>
                        </div>

                      {/* Daily Energy */}
                      <div className="bg-black/60 border border-yellow-400/30 p-4 rounded">
                        <div className="flex items-center space-x-3">
                          <Battery className="w-8 h-8 text-yellow-400" />
                          <div>
                            <div className="text-2xl font-bold text-yellow-400 font-mono">
                              {formatNumber(summary.dailyProduction.energy)}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">ENERGY/DAY</div>
                          </div>
                        </div>
                        {summary.totalClaimable.energy > 0 && (
                          <div className="mt-2 text-xs text-yellow-300 font-mono">
                            {formatNumber(summary.totalClaimable.energy)} claimable
                          </div>
                        )}
                      </div>

                      {/* Daily Shards */}
                      <div className="bg-black/60 border border-blue-400/30 p-4 rounded">
                        <div className="flex items-center space-x-3">
                          <Gem className="w-8 h-8 text-blue-400" />
                          <div>
                            <div className="text-2xl font-bold text-blue-400 font-mono">
                              {formatNumber(summary.dailyProduction.shards)}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">SHARDS/DAY</div>
                          </div>
                        </div>
                        {summary.totalClaimable.shards > 0 && (
                          <div className="mt-2 text-xs text-blue-300 font-mono">
                            {formatNumber(summary.totalClaimable.shards)} claimable
                          </div>
                        )}
                      </div>

                      {/* Daily Dust */}
                      <div className="bg-black/60 border border-purple-400/30 p-4 rounded">
                        <div className="flex items-center space-x-3">
                          <Sparkles className="w-8 h-8 text-purple-400" />
                          <div>
                            <div className="text-2xl font-bold text-purple-400 font-mono">
                              {formatNumber(summary.dailyProduction.dust)}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">DUST/DAY</div>
                          </div>
                        </div>
                        {summary.totalClaimable.dust > 0 && (
                          <div className="mt-2 text-xs text-purple-300 font-mono">
                            {formatNumber(summary.totalClaimable.dust)} claimable
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Claim All Button */}
                    {summary && summary.totalClaimable.energy > 0 && (
                      <div className="flex items-center justify-center">
                        <button
                          onClick={claimAllEnergy}
                          disabled={claiming}
                          className={`
                            px-6 py-3 border-2 font-mono font-bold tracking-wider transition-all duration-300 rounded
                            ${claiming 
                              ? 'border-orange-400 text-orange-400 bg-orange-400/10' 
                              : 'border-green-400 text-green-400 hover:bg-green-400/10 hover:shadow-lg hover:shadow-green-400/20'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                          `}
                          style={{
                            clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)'
                          }}
                        >
                          {claiming ? (
                            <div className="flex items-center space-x-2">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full"
                              />
                              <span>CLAIMING...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Zap className="w-5 h-5" />
                              <span>CLAIM ALL ENERGY ({formatNumber(summary.totalClaimable.energy)})</span>
                            </div>
                          )}
                        </button>
                      </div>
                    )}
                    
                    {/* Claim Message */}
                    {claimMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`
                          p-4 rounded border text-center font-mono
                          ${claimMessage.includes('Successfully') 
                            ? 'bg-green-900/30 border-green-400/50 text-green-300' 
                            : 'bg-red-900/30 border-red-400/50 text-red-300'
                          }
                        `}
                      >
                        {claimMessage}
                      </motion.div>
                    )}
                  </div>
                  )}

                  {/* ROM List */}
                  <div>
                    <h3 className="text-xl font-bold text-cyan-400 font-mono mb-4 flex items-center space-x-2">
                      <Package className="w-5 h-5" />
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
                        {roms.map((rom) => (
                          <motion.div
                            key={rom.romId}
                            whileHover={{ scale: 1.02 }}
                            className="bg-black/60 border border-gray-600 p-4 rounded hover:border-cyan-400/50 transition-all duration-300"
                            style={{
                              clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)'
                            }}
                          >
                            {/* ROM Header */}
                            <div className="flex items-center justify-between mb-3">
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
                              <div className="mb-3 text-xs font-mono text-gray-400">
                                {rom.memory && <span>{rom.memory}</span>}
                                {rom.memory && rom.faction && <span> • </span>}
                                {rom.faction && <span>{rom.faction}</span>}
                              </div>
                            )}

                            {/* Production Rates */}
                            <div className="space-y-2 mb-4">
                              <div className="text-xs text-gray-400 font-mono">WEEKLY PRODUCTION</div>
                              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                                <div className="text-center">
                                  <div className="text-yellow-400">{formatNumber(rom.energyRate)}</div>
                                  <div className="text-gray-500">Energy</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-blue-400">{formatNumber(rom.shardsRate)}</div>
                                  <div className="text-gray-500">Shards</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-purple-400">{formatNumber(rom.dustRate)}</div>
                                  <div className="text-gray-500">Dust</div>
                                </div>
                              </div>
                            </div>

                            {/* Claimable Resources */}
                            {(rom.energyClaimable > 0 || rom.shardsClaimable > 0 || rom.dustClaimable > 0) && (
                              <div className="border-t border-gray-700 pt-3">
                                <div className="text-xs text-green-400 font-mono mb-2">CLAIMABLE NOW</div>
                                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                                  {rom.energyClaimable > 0 && (
                                    <div className="text-center">
                                      <div className="text-yellow-300">{formatNumber(rom.energyClaimable)}</div>
                                      <div className="text-gray-500">Energy</div>
                                    </div>
                                  )}
                                  {rom.shardsClaimable > 0 && (
                                    <div className="text-center">
                                      <div className="text-blue-300">{formatNumber(rom.shardsClaimable)}</div>
                                      <div className="text-gray-500">Shards</div>
                                    </div>
                                  )}
                                  {rom.dustClaimable > 0 && (
                                    <div className="text-center">
                                      <div className="text-purple-300">{formatNumber(rom.dustClaimable)}</div>
                                      <div className="text-gray-500">Dust</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Last Claim */}
                            <div className="mt-3 pt-3 border-t border-gray-700">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-gray-400">Last Claim:</span>
                                <span className="text-gray-300">{formatTimeAgo(rom.lastClaim)}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-cyan-400/20 p-4 bg-black/40">
              <div className="flex items-center justify-between text-sm font-mono">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400">
                    Wallet: <span className="text-cyan-400">{WALLET_ADDRESS.slice(0, 6)}...{WALLET_ADDRESS.slice(-4)}</span>
                  </span>
                  {summary && (
                    <span className="text-gray-400">
                      Weekly Total: <span className="text-yellow-400">{formatNumber(summary.totalWeeklyProduction.energy)} ⚡</span>
                      <span className="text-blue-400 ml-2">{formatNumber(summary.totalWeeklyProduction.shards)} 💎</span>
                      <span className="text-purple-400 ml-2">{formatNumber(summary.totalWeeklyProduction.dust)} ✨</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400">LIVE BLOCKCHAIN DATA</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ROMOverview 