'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface EnergyDisplayProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showDetails?: boolean
  className?: string
}

interface EnergyData {
  currentEnergy: number
  maxEnergy: number
  energyPerSecond: number
  timeToFull: number
  lastUpdate: number
  nextClaimable: number
}

const ElegantEnergyDisplay: React.FC<EnergyDisplayProps> = ({ 
  size = 'md', 
  showLabel = false, 
  showDetails = false,
  className = '' 
}) => {
  const [energyData, setEnergyData] = useState<EnergyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClaimable, setIsClaimable] = useState(false)

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

  const fetchEnergyData = async () => {
    try {
      setLoading(true)
      setError(null)

      const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"
      const response = await fetch(`/api/player/energy?wallet=${WALLET_ADDRESS}`, {
        headers: {
          'Authorization': `Bearer ${getJWTToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.energy) {
        const energyInfo: EnergyData = {
          currentEnergy: data.energy.current || 0,
          maxEnergy: data.energy.max || 100,
          energyPerSecond: data.energy.regen_rate || 1,
          timeToFull: data.energy.time_to_full || 0,
          lastUpdate: Date.now(),
          nextClaimable: data.energy.claimable || 0
        }
        
        setEnergyData(energyInfo)
        setIsClaimable(energyInfo.nextClaimable > 0)
      } else {
        throw new Error('Invalid energy data received')
      }
    } catch (error) {
      console.error('Energy fetch error:', error)
      setError('Failed to load energy data')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return 'Full'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return Math.floor(num).toLocaleString()
  }

  const getEnergyPercentage = (): number => {
    if (!energyData) return 0
    return Math.min(100, Math.max(0, (energyData.currentEnergy / energyData.maxEnergy) * 100))
  }

  const getStatusColor = (): string => {
    const percentage = getEnergyPercentage()
    if (percentage >= 80) return 'text-cyan-400'
    if (percentage >= 50) return 'text-amber-500'
    return 'text-red-400'
  }

  const getGlowColor = (): string => {
    const percentage = getEnergyPercentage()
    if (percentage >= 80) return 'shadow-cyan-400/30'
    if (percentage >= 50) return 'shadow-amber-500/30'
    return 'shadow-red-400/30'
  }

  // Size configurations
  const sizes = {
    sm: {
      container: 'px-3 py-2',
      icon: 'w-4 h-4',
      text: 'text-sm',
      value: 'text-base font-semibold',
      bar: 'h-1.5'
    },
    md: {
      container: 'px-4 py-3',
      icon: 'w-5 h-5',
      text: 'text-sm',
      value: 'text-lg font-bold',
      bar: 'h-2'
    },
    lg: {
      container: 'px-6 py-4',
      icon: 'w-6 h-6',
      text: 'text-base',
      value: 'text-xl font-bold',
      bar: 'h-3'
    }
  }

  useEffect(() => {
    fetchEnergyData()
    const interval = setInterval(fetchEnergyData, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`glass-elegant border-2 border-cyan-400/30 rounded-lg ${sizes[size].container} ${className}`}
      >
        <div className="flex items-center space-x-3">
          <div className="loading-shimmer w-5 h-5 rounded" />
          <div className="space-y-1">
            <div className="loading-shimmer w-16 h-4 rounded" />
            {showDetails && <div className="loading-shimmer w-12 h-3 rounded" />}
          </div>
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`glass-elegant border-2 border-red-400/30 rounded-lg ${sizes[size].container} ${className}`}
      >
        <div className="flex items-center space-x-3">
          <AlertTriangle className={`${sizes[size].icon} text-red-400`} />
          <div>
            <div className="text-red-400 text-body font-medium">Error</div>
            {showDetails && (
              <div className="text-red-400/70 text-xs text-body">{error}</div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  if (!energyData) return null

  const percentage = getEnergyPercentage()
  const statusColor = getStatusColor()
  const glowColor = getGlowColor()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-elegant border-2 border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300 rounded-lg ${sizes[size].container} ${className}`}
      style={{
        boxShadow: `0 4px 20px ${glowColor}`
      }}
    >
      <div className="flex items-center justify-between space-x-4">
        {/* Energy Icon and Status */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <motion.div
              animate={{ 
                scale: isClaimable ? [1, 1.1, 1] : 1,
                rotate: [0, 360]
              }}
              transition={{ 
                scale: { duration: 2, repeat: Infinity },
                rotate: { duration: 20, repeat: Infinity, ease: 'linear' }
              }}
              className={`p-2 rounded-full bg-cyan-400/10 border border-cyan-400/30`}
            >
              <Zap className={`${sizes[size].icon} ${statusColor}`} />
            </motion.div>
            
            {/* Status Indicator */}
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                percentage >= 80 ? 'bg-cyan-400' :
                percentage >= 50 ? 'bg-amber-500' : 'bg-red-400'
              }`}
            />
          </div>

          <div className="space-y-1">
            {showLabel && (
              <div className="text-body text-gray-300 text-xs font-medium tracking-wide">
                ENERGY
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <span className={`${sizes[size].value} text-code ${statusColor}`}>
                {formatNumber(energyData.currentEnergy)}
              </span>
              <span className="text-gray-400 text-body text-sm">/</span>
              <span className="text-gray-400 text-body text-sm">
                {formatNumber(energyData.maxEnergy)}
              </span>
            </div>

            {/* Energy Bar */}
            <div className="w-24 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`${sizes[size].bar} bg-gradient-to-r from-cyan-400 to-cyan-300 relative`}
              >
                {/* Animated shine effect */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        {showDetails && (
          <div className="flex flex-col items-end space-y-1 text-right">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-3 h-3 text-amber-500" />
              <span className="text-amber-500 text-xs text-code font-medium">
                +{energyData.energyPerSecond}/s
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-gray-400 text-xs text-body">
                {formatTime(energyData.timeToFull)}
              </span>
            </div>

            {isClaimable && (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="flex items-center space-x-1"
              >
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-green-400 text-xs text-code font-medium">
                  CLAIMABLE
                </span>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default ElegantEnergyDisplay 