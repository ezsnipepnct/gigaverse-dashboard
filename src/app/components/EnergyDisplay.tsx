'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Battery, BatteryLow } from 'lucide-react'
import { agwAuthService } from '@/lib/agw-auth'

interface EnergyData {
  ENERGY_CID: number
  TIMESTAMP_CID: number
  maxEnergy: number
  currentEnergy: number
  regenerationRate: number
  isPlayerJuiced: boolean
}

interface EnergyDisplayProps {
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

// JWT Token management
const getJWTToken = () => {
  return agwAuthService.getJWT() || ''
}

const EnergyDisplay: React.FC<EnergyDisplayProps> = ({ 
  className = '', 
  showLabel = true, 
  size = 'md' 
}) => {
  const [energyData, setEnergyData] = useState<EnergyData | null>(null)
  const [energyLoading, setEnergyLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Fix hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch energy on mount and periodically
  useEffect(() => {
    if (mounted) {
      fetchEnergy()
      const interval = setInterval(fetchEnergy, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [mounted])

  const fetchEnergy = async () => {
    try {
      setEnergyLoading(true)
      
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

      // Use the parsed data from the API response
      const entity = data.entities?.[0]
      if (entity && entity.parsedData) {
        const parsed = entity.parsedData
        setEnergyData({
          ENERGY_CID: entity.ENERGY_CID,
          TIMESTAMP_CID: entity.TIMESTAMP_CID,
          maxEnergy: parsed.maxEnergy ?? 420,
          currentEnergy: Math.max(0, parsed.energyValue ?? parsed.energy ?? 0),
          regenerationRate: parsed.regenPerHour ?? 18,
          isPlayerJuiced: parsed.isPlayerJuiced ?? false
        })
      } else if (typeof data?.energy === 'number' && typeof data?.maxEnergy === 'number') {
        // Fallback mock shape
        setEnergyData({
          ENERGY_CID: 0,
          TIMESTAMP_CID: Date.now(),
          maxEnergy: data.maxEnergy,
          currentEnergy: data.energy,
          regenerationRate: 0,
          isPlayerJuiced: false
        })
      } else {
        console.warn('Invalid energy data shape; using safe defaults')
        setEnergyData({
          ENERGY_CID: 0,
          TIMESTAMP_CID: Date.now(),
          maxEnergy: 420,
          currentEnergy: 0,
          regenerationRate: 0,
          isPlayerJuiced: false
        })
      }

    } catch (error) {
      console.error('Failed to fetch energy:', error)
    } finally {
      setEnergyLoading(false)
    }
  }

  // Size configurations
  const sizeConfig = {
    sm: {
      battery: 'w-4 h-4',
      text: 'text-xs',
      container: 'px-2 py-1 space-x-1'
    },
    md: {
      battery: 'w-5 h-5',
      text: 'text-sm',
      container: 'px-3 py-2 space-x-2'
    },
    lg: {
      battery: 'w-6 h-6',
      text: 'text-base',
      container: 'px-4 py-3 space-x-3'
    }
  }

  const config = sizeConfig[size]

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null
  }

  if (energyLoading && !energyData) {
    return (
      <div className={`flex items-center bg-black/40 border border-gray-600 rounded font-mono ${config.container} ${className}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className={`border-2 border-gray-600 border-t-orange-400 rounded-full ${config.battery}`}
        />
        {showLabel && <span className={`text-gray-400 ${config.text}`}>Loading...</span>}
      </div>
    )
  }

  if (!energyData) {
    return null
  }

  const energyPercentage = (energyData.currentEnergy / energyData.maxEnergy) * 100
  const isLowEnergy = energyData.currentEnergy < 100 // Low energy threshold

  return (
    <div className={`flex items-center bg-black/40 border ${isLowEnergy ? 'border-red-400/50' : 'border-orange-400/50'} rounded font-mono ${config.container} ${className}`}>
      <div className="relative">
        {isLowEnergy ? (
          <BatteryLow className={`text-red-400 animate-pulse ${config.battery}`} />
        ) : (
          <Battery className={`text-orange-400 ${config.battery}`} />
        )}
        {/* Battery fill indicator */}
        <div 
          className={`absolute inset-1 ${isLowEnergy ? 'bg-gradient-to-t from-red-600 to-red-400' : 'bg-gradient-to-t from-orange-600 to-orange-400'} rounded-sm transition-all duration-300`}
          style={{
            height: `${energyPercentage}%`,
            bottom: '2px',
            left: '2px',
            right: '2px',
          }}
        />
      </div>
      <div className={config.text}>
        <div className={isLowEnergy ? 'text-red-400' : 'text-orange-400'}>
          {Math.round(energyData.currentEnergy)}/{energyData.maxEnergy}
          {energyData.isPlayerJuiced && <span className="text-yellow-400 ml-1">⚡</span>}
        </div>
        {showLabel && (
          <div className="text-xs text-gray-400">
            +{energyData.regenerationRate}/hr
          </div>
        )}
      </div>
    </div>
  )
}

export default EnergyDisplay 