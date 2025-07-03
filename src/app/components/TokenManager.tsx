'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Key, 
  X, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'

interface TokenManagerProps {
  show: boolean
  onClose: () => void
}

const TokenManager: React.FC<TokenManagerProps> = ({ show, onClose }) => {
  const [jwtToken, setJwtToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('jwt_token') || ''
      setJwtToken(savedToken)
    }
  }, [])

  const validateToken = async (token: string) => {
    if (!token.trim()) {
      setIsValid(false)
      return
    }

    setIsValidating(true)
    try {
      const response = await fetch(`https://gigaverse.io/api/offchain/player/energy/0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7`, {
        headers: {
          'accept': '*/*',
          'content-type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      })
      setIsValid(response.ok)
    } catch (error) {
      setIsValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  const saveToken = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jwt_token', jwtToken)
    }
    validateToken(jwtToken)
  }

  const handleTokenChange = (value: string) => {
    setJwtToken(value)
    setIsValid(null) // Reset validation when token changes
  }

  if (!mounted || !show) {
    return null
  }

  return (
    <AnimatePresence>
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
              <Key className="w-8 h-8 text-cyan-400" />
            </motion.div>
            <h2 className="text-2xl font-bold font-mono text-cyan-400 mb-2">TOKEN SETUP</h2>
            <p className="text-gray-400 font-mono text-sm">Configure your authentication token</p>
          </div>

          {/* Token Input */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="text-cyan-400 font-mono text-sm font-semibold">JWT TOKEN</label>
              <button
                onClick={() => setShowToken(!showToken)}
                className="text-gray-400 hover:text-cyan-400 transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            <textarea
              value={jwtToken}
              onChange={(e) => handleTokenChange(e.target.value)}
              placeholder="Paste your JWT token here..."
              className="w-full h-24 px-4 py-3 bg-gray-900/50 border border-cyan-400/20 rounded-lg font-mono text-sm text-white placeholder-gray-500 focus:border-cyan-400/50 focus:outline-none resize-none"
              style={{ 
                fontFamily: 'monospace',
                filter: showToken ? 'none' : 'blur(2px)'
              }}
            />
            
            {jwtToken && !showToken && (
              <div className="mt-2 text-xs font-mono text-gray-400">
                Token: {jwtToken.substring(0, 12)}...{jwtToken.substring(jwtToken.length - 12)} ({jwtToken.length} chars)
              </div>
            )}
          </div>

          {/* Validation Status */}
          {isValid !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-3 rounded-lg border ${
                isValid 
                  ? 'bg-green-400/10 border-green-400/30' 
                  : 'bg-red-400/10 border-red-400/30'
              }`}
            >
              <div className="flex items-center space-x-2">
                {isValid ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span className={`font-mono text-sm ${
                  isValid ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isValid ? 'Token is valid' : 'Token is invalid'}
                </span>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 mb-6">
            <button
              onClick={saveToken}
              disabled={!jwtToken.trim()}
              className="flex-1 px-4 py-3 bg-green-400/20 border border-green-400/50 rounded-lg text-green-400 hover:bg-green-400/30 transition-colors font-mono text-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>SAVE</span>
            </button>

            <button
              onClick={() => validateToken(jwtToken)}
              disabled={!jwtToken.trim() || isValidating}
              className="flex-1 px-4 py-3 bg-cyan-400/20 border border-cyan-400/50 rounded-lg text-cyan-400 hover:bg-cyan-400/30 transition-colors font-mono text-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
              <span>{isValidating ? 'TESTING...' : 'TEST'}</span>
            </button>
          </div>

          {/* Quick Help */}
          <div className="bg-cyan-400/5 border border-cyan-400/20 rounded-lg p-4 mb-6">
            <p className="text-cyan-400/80 font-mono text-xs text-center">
              💡 Get your token from gigaverse.io → F12 → Network → Authorization header
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
    </AnimatePresence>
  )
}

export default TokenManager 