'use client'

import { useState, useEffect } from 'react'
import { useLoginWithAbstract, useAbstractClient } from '@abstract-foundation/agw-react'
import { useAccount } from 'wagmi'

// Security constants
const AUTH_STORAGE_KEY = 'gigaverse_agw_auth_data'
const MAX_MESSAGE_AGE = 5 * 60 * 1000 // 5 minutes

export interface AuthResponse {
  success: boolean
  jwt: string
  gameAccount: {
    noob: any
    allowedToCreateAccount: boolean
    canEnterGame: boolean
    noobPassBalance: number
    lastNoobId: number
    maxNoobId: number
  }
  user: {
    _id: string
    walletAddress: string
    username: string
    caseSensitiveAddress: string
    __v: number
  }
  expiresAt: number
}

export interface AuthPayload {
  signature: string
  address: string
  message: string
  timestamp: number
}

interface UseAGWWalletReturn {
  isConnected: boolean
  isConnecting: boolean
  address: string | null
  authData: AuthResponse | null
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  clearError: () => void
  getJWT: () => string | null
  isAuthenticated: () => boolean
}

export function useAGWWallet(): UseAGWWalletReturn {
  const { login } = useLoginWithAbstract()
  const { address, isConnected: wagmiConnected } = useAccount()
  const { data: client } = useAbstractClient()

  const [isConnecting, setIsConnecting] = useState(false)
  const [authData, setAuthData] = useState<AuthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load auth data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuthData = localStorage.getItem(AUTH_STORAGE_KEY)
      if (savedAuthData) {
        try {
          const parsedAuthData = JSON.parse(savedAuthData)
          // Security checks
          const isNotExpired = parsedAuthData.expiresAt && Date.now() < parsedAuthData.expiresAt
          const isCorrectDomain = !parsedAuthData.domain || parsedAuthData.domain === window.location.hostname
          
          if (isNotExpired && isCorrectDomain) {
            setAuthData(parsedAuthData)
            console.log('Restored valid AGW auth data from localStorage')
          } else {
            console.log('Stored AGW auth data is expired or from different domain, clearing...')
            localStorage.removeItem(AUTH_STORAGE_KEY)
          }
        } catch (error) {
          console.error('Error parsing stored AGW auth data:', error)
          localStorage.removeItem(AUTH_STORAGE_KEY)
        }
      }
    }
  }, [])

  const connect = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      console.log('Starting AGW connection...')
      
      // First, connect with AGW
      await login()
      
      console.log('AGW login completed, waiting for client and address...')
      
      // Wait for connection to be established with retry logic
      let attempts = 0
      const maxAttempts = 10
      
      while ((!client || !address) && attempts < maxAttempts) {
        console.log(`Waiting for AGW connection... Attempt ${attempts + 1}/${maxAttempts}`)
        await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms
        attempts++
      }
      
      if (!client || !address) {
        throw new Error('Failed to establish connection with Abstract Global Wallet after multiple attempts')
      }

      console.log('Connected to AGW:', address)

      // Create a simpler message format that matches what Gigaverse expects
      const timestamp = Date.now()
      const message = `Login to Gigaverse at ${timestamp}`

      console.log('Signing message with AGW:', message)

      // Sign message with AGW
      const signature = await client.signMessage({
        message: message,
      })

      console.log('Signature obtained from AGW:', signature.slice(0, 20) + '...')
      console.log('Authenticating with Gigaverse API...')

      // Authenticate with Gigaverse API
      const authPayload: AuthPayload = {
        signature,
        address: address,
        message,
        timestamp
      }

      const response = await fetch('https://gigaverse.io/api/user/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authPayload)
      })

      console.log('Gigaverse API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Gigaverse API error response:', errorText)
        throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const responseData: AuthResponse = await response.json()
      console.log('Gigaverse API response:', responseData)

      if (!responseData.success) {
        throw new Error('Authentication failed: Invalid response from server')
      }

      setAuthData(responseData)

      // Persist to localStorage with additional security metadata
      if (typeof window !== 'undefined') {
        const secureAuthData = {
          ...responseData,
          domain: window.location.hostname,
          createdAt: Date.now()
        }
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(secureAuthData))
      }

      console.log('✅ Successfully authenticated with Gigaverse via AGW!')

    } catch (error) {
      console.error('❌ AGW Authentication error:', error)
      setError(error instanceof Error ? error.message : 'Connection failed')
      setAuthData(null)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setAuthData(null)
    setError(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
    console.log('Disconnected from AGW')
  }

  const clearError = () => {
    setError(null)
  }

  const getJWT = (): string | null => {
    return authData?.jwt || null
  }

  const isAuthenticated = (): boolean => {
    return !!(authData && authData.expiresAt && Date.now() < authData.expiresAt)
  }

  return {
    isConnected: wagmiConnected && isAuthenticated(),
    isConnecting,
    address: address || null,
    authData,
    error,
    connect,
    disconnect,
    clearError,
    getJWT,
    isAuthenticated
  }
} 