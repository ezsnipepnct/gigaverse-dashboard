'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Key, 
  X, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  ExternalLink
} from 'lucide-react'

interface TokenManagerProps {
  isOpen: boolean
  onClose: () => void
}

const TokenManager: React.FC<TokenManagerProps> = ({ isOpen, onClose }) => {
  const [jwtToken, setJwtToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    message: string
    walletAddress?: string
    expiresAt?: string
  } | null>(null)
  const [mounted, setMounted] = useState(false)

  // Fix hydration issues
  useEffect(() => {
    setMounted(true)
    // Load existing token from localStorage
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('jwt_token') || localStorage.getItem('authToken') || ''
      setJwtToken(savedToken)
    }
  }, [])

  const validateToken = async (token: string) => {
    if (!token.trim()) {
      setValidationResult({
        isValid: false,
        message: 'Token is required'
      })
      return
    }

    setIsValidating(true)
    try {
      // Test the token by making a simple API call to the energy endpoint (we know this works)
      const response = await fetch(`https://gigaverse.io/api/offchain/player/energy/0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7`, {
        headers: {
          'accept': '*/*',
          'content-type': 'application/json',
          'authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Try to decode the JWT to get info
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const expiresAt = new Date(payload.exp * 1000).toLocaleString()
          const walletAddress = payload.address || 'Unknown'
          
          setValidationResult({
            isValid: true,
            message: 'Token is valid and working!',
            walletAddress,
            expiresAt
          })
        } catch (decodeError) {
          setValidationResult({
            isValid: true,
            message: 'Token is valid and working!'
          })
        }
      } else {
        setValidationResult({
          isValid: false,
          message: `Token validation failed: HTTP ${response.status}`
        })
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsValidating(false)
    }
  }

  const saveToken = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jwt_token', jwtToken)
      localStorage.setItem('authToken', jwtToken) // Backup key
    }
    
    // Validate the saved token
    validateToken(jwtToken)
  }

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(jwtToken)
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy token:', error)
    }
  }

  const clearToken = () => {
    setJwtToken('')
    setValidationResult(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwt_token')
      localStorage.removeItem('authToken')
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
            className="bg-black/90 border-2 border-cyan-400/50 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden"
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
                    <Key className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-cyan-400 font-mono tracking-wider neon-pulse">
                      JWT TOKEN MANAGER
                    </h2>
                    <p className="text-cyan-300/70 font-mono">MANAGE AUTHENTICATION TOKENS</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-900/30 border border-blue-400/50 p-4 rounded">
                <h3 className="text-blue-400 font-mono font-bold mb-3 flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4" />
                  <span>HOW TO GET YOUR JWT TOKEN</span>
                </h3>
                <div className="text-blue-300 font-mono text-sm space-y-2">
                  <p>1. Open your browser's Developer Tools (F12)</p>
                  <p>2. Go to the Network tab</p>
                  <p>3. Visit gigaverse.io and login</p>
                  <p>4. Look for any API request in the Network tab</p>
                  <p>5. Find the "Authorization: Bearer ..." header</p>
                  <p>6. Copy the token (everything after "Bearer ")</p>
                </div>
              </div>

              {/* Token Input */}
              <div className="space-y-4">
                <h3 className="text-cyan-400 font-mono font-bold">JWT TOKEN</h3>
                
                <div className="relative">
                  <textarea
                    value={jwtToken}
                    onChange={(e) => setJwtToken(e.target.value)}
                    placeholder="Paste your JWT token here..."
                    className="w-full h-32 px-4 py-3 bg-black/60 border border-gray-600 rounded font-mono text-sm text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none resize-none"
                    style={{ fontFamily: 'monospace' }}
                  />
                  
                  {/* Token visibility toggle */}
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute top-3 right-12 p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                    title={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>

                  {/* Copy button */}
                  {jwtToken && (
                    <button
                      onClick={copyToken}
                      className="absolute top-3 right-3 p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                      title="Copy token"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Token preview (masked) */}
                {jwtToken && !showToken && (
                  <div className="text-xs font-mono text-gray-400 bg-black/40 p-2 rounded border">
                    Token: {jwtToken.substring(0, 20)}...{jwtToken.substring(jwtToken.length - 20)}
                  </div>
                )}
              </div>

              {/* Validation Result */}
              {validationResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded border ${
                    validationResult.isValid 
                      ? 'bg-green-900/30 border-green-400/50' 
                      : 'bg-red-900/30 border-red-400/50'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {validationResult.isValid ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`font-mono font-bold text-sm ${
                      validationResult.isValid ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {validationResult.isValid ? 'TOKEN VALID' : 'TOKEN INVALID'}
                    </span>
                  </div>
                  
                  <p className={`font-mono text-sm ${
                    validationResult.isValid ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {validationResult.message}
                  </p>

                  {validationResult.isValid && validationResult.walletAddress && (
                    <div className="mt-3 space-y-1 text-xs font-mono text-gray-300">
                      <div>Wallet: <span className="text-cyan-400">{validationResult.walletAddress}</span></div>
                      {validationResult.expiresAt && (
                        <div>Expires: <span className="text-yellow-400">{validationResult.expiresAt}</span></div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={saveToken}
                  disabled={!jwtToken.trim()}
                  className="flex-1 px-4 py-3 bg-green-400/20 border border-green-400/50 rounded text-green-400 hover:bg-green-400/30 transition-colors font-mono text-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>SAVE TOKEN</span>
                </button>

                <button
                  onClick={() => validateToken(jwtToken)}
                  disabled={!jwtToken.trim() || isValidating}
                  className="flex-1 px-4 py-3 bg-cyan-400/20 border border-cyan-400/50 rounded text-cyan-400 hover:bg-cyan-400/30 transition-colors font-mono text-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
                  <span>{isValidating ? 'VALIDATING...' : 'VALIDATE'}</span>
                </button>

                <button
                  onClick={clearToken}
                  className="px-4 py-3 bg-red-400/20 border border-red-400/50 rounded text-red-400 hover:bg-red-400/30 transition-colors font-mono text-sm flex items-center justify-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>CLEAR</span>
                </button>
              </div>

              {/* Current Status */}
              <div className="bg-black/60 border border-gray-600 p-4 rounded">
                <h4 className="text-gray-400 font-mono font-bold mb-3">CURRENT STATUS</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Token Stored:</span>
                    <span className={jwtToken ? 'text-green-400' : 'text-red-400'}>
                      {jwtToken ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Token Length:</span>
                    <span className="text-cyan-400">{jwtToken.length} chars</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Validation Status:</span>
                    <span className={
                      validationResult === null ? 'text-gray-400' :
                      validationResult.isValid ? 'text-green-400' : 'text-red-400'
                    }>
                      {validationResult === null ? 'NOT TESTED' :
                       validationResult.isValid ? 'VALID' : 'INVALID'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-cyan-400/20 p-4 bg-black/40">
              <div className="flex items-center justify-between text-sm font-mono">
                <div className="text-gray-400">
                  💡 Tip: Tokens typically expire after 24-48 hours
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  <span className="text-cyan-400">SECURE TOKEN STORAGE</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default TokenManager 