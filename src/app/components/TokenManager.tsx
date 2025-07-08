'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Coins, TrendingUp, TrendingDown, Wallet, DollarSign, RefreshCw, ArrowUpDown, X, Save, AlertCircle } from 'lucide-react'
import { agwAuthService } from '@/lib/agw-auth'

interface TokenManagerProps {
  isOpen: boolean
  onClose: () => void
}

interface TokenBalance {
  symbol: string
  balance: number
  usdValue: number
  change24h: number
  logo?: string
}

const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"

const TokenManager: React.FC<TokenManagerProps> = ({ isOpen, onClose }) => {
  const [balances, setBalances] = useState<TokenBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      fetchBalances()
    }
  }, [isOpen])

  const fetchBalances = async () => {
    try {
      setLoading(true)
      setError('')
      
      const jwtToken = agwAuthService.getJWT()
      if (!jwtToken) {
        setError('Authentication required. Please login first.')
        return
      }

      const response = await fetch(`https://gigaverse.io/api/offchain/player/energy/${WALLET_ADDRESS}`, {
        headers: {
          'accept': '*/*',
          'content-type': 'application/json',
          'authorization': `Bearer ${jwtToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: TokenBalance[] = await response.json()
      setBalances(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to fetch balances: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
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
        className="bg-black/90 border-2 border-cyan-400/50 rounded-xl p-8 max-w-lg w-full mx-4 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center justify-center w-16 h-16 bg-cyan-400/20 rounded-full mb-4"
          >
            <Coins className="w-8 h-8 text-cyan-400" />
          </motion.div>
          <h2 className="text-2xl font-bold font-mono text-cyan-400 mb-2">TOKEN SETUP</h2>
          <p className="text-gray-400 font-mono text-sm">Configure your authentication token</p>
        </div>

        {/* Token Input */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="text-cyan-400 font-mono text-sm font-semibold">JWT TOKEN</label>
            <button
              onClick={() => {}} // No action for now, as token is managed by AGW
              className="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <Wallet className="w-4 h-4" />
            </button>
          </div>
          
          <textarea
            value={agwAuthService.getJWT() || ''} // Display current token
            onChange={(e) => {}} // No action for now
            placeholder="Your JWT token is managed by AGW"
            className="w-full h-24 px-4 py-3 bg-gray-900/50 border border-cyan-400/20 rounded-lg font-mono text-sm text-white placeholder-gray-500 focus:border-cyan-400/50 focus:outline-none resize-none"
            style={{ 
              fontFamily: 'monospace',
              filter: 'none' // Always visible
            }}
            readOnly
          />
          
          {/* Removed token display as it's managed by AGW */}
        </div>

        {/* Validation Status */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 rounded-lg border border-red-400/30 bg-red-400/10"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="font-mono text-sm text-red-400">
                {error}
              </span>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 mb-6">
          <button
            onClick={() => {}} // No action for now
            disabled={true} // Always disabled as token is managed by AGW
            className="flex-1 px-4 py-3 bg-green-400/20 border border-green-400/50 rounded-lg text-green-400 hover:bg-green-400/30 transition-colors font-mono text-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>SAVE</span>
          </button>

          <button
            onClick={() => {}} // No action for now
            disabled={true} // Always disabled as token is managed by AGW
            className="flex-1 px-4 py-3 bg-cyan-400/20 border border-cyan-400/50 rounded-lg text-cyan-400 hover:bg-cyan-400/30 transition-colors font-mono text-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-4 h-4" />
            <span>TEST</span>
          </button>
        </div>

        {/* Quick Help */}
        <div className="bg-cyan-400/5 border border-cyan-400/20 rounded-lg p-4 mb-6">
          <p className="text-cyan-400/80 font-mono text-xs text-center">
            💡 Your token is managed by AGW. No need to manually enter it here.
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-gray-400/20 border border-gray-400/50 rounded-lg text-gray-400 hover:bg-gray-400/30 transition-colors font-mono text-sm flex items-center justify-center space-x-2"
        >
          <X className="w-4 h-4" />
          <span>CLOSE</span>
        </button>
      </motion.div>
    </motion.div>
  )
}

export default TokenManager 