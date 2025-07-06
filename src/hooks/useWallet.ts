'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useAccount, useConnect, useDisconnect, useWalletClient } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import { abstractChain } from '@/lib/chains'

export interface WalletInfo {
  address?: string
  isConnected: boolean
  isConnecting: boolean
  isDisconnecting: boolean
  chainId?: number
  walletClient?: any
}

export interface AgwActions {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  switchNetwork: () => Promise<void>
  signTransaction: (transaction: any) => Promise<string>
  sendTransaction: (transaction: any) => Promise<string>
}

export function useWallet(): WalletInfo & AgwActions {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Privy hooks for AGW integration
  const {
    ready: privyReady,
    authenticated: privyAuthenticated,
    user: privyUser,
    login: privyLogin,
    logout: privyLogout,
  } = usePrivy()

  // Wagmi hooks for blockchain interactions
  const { address, isConnected: wagmiConnected, chainId } = useAccount()
  const { connect: wagmiConnect, connectors } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { data: walletClient } = useWalletClient()

  // Combined connection state
  const isConnected = privyAuthenticated && wagmiConnected && !!address

  // Connect function that handles AGW flow
  const connect = useCallback(async () => {
    if (isConnecting) return
    
    setIsConnecting(true)
    try {
      // Step 1: Authenticate with Privy (AGW)
      if (!privyAuthenticated) {
        await privyLogin()
      }

      // Step 2: Connect with Wagmi if we have connectors
      if (!wagmiConnected && connectors.length > 0) {
        // Use the first available connector (should be AGW)
        await wagmiConnect({ connector: connectors[0] })
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }, [isConnecting, privyAuthenticated, privyLogin, wagmiConnected, wagmiConnect, connectors])

  // Disconnect function
  const disconnect = useCallback(async () => {
    if (isDisconnecting) return
    
    setIsDisconnecting(true)
    try {
      // Disconnect Wagmi first
      if (wagmiConnected) {
        await wagmiDisconnect()
      }
      
      // Then logout from Privy
      if (privyAuthenticated) {
        await privyLogout()
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
      throw error
    } finally {
      setIsDisconnecting(false)
    }
  }, [isDisconnecting, wagmiConnected, wagmiDisconnect, privyAuthenticated, privyLogout])

  // Switch to Abstract network
  const switchNetwork = useCallback(async () => {
    if (!walletClient) {
      throw new Error('Wallet not connected')
    }

    try {
      await walletClient.switchChain({ id: abstractChain.id })
    } catch (error) {
      console.error('Failed to switch network:', error)
      throw error
    }
  }, [walletClient])

  // Sign transaction (AGW will handle this)
  const signTransaction = useCallback(async (transaction: any) => {
    if (!walletClient) {
      throw new Error('Wallet not connected')
    }

    try {
      const signature = await walletClient.signTransaction(transaction)
      return signature
    } catch (error) {
      console.error('Failed to sign transaction:', error)
      throw error
    }
  }, [walletClient])

  // Send transaction (AGW will handle gas and signing)
  const sendTransaction = useCallback(async (transaction: any) => {
    if (!walletClient) {
      throw new Error('Wallet not connected')
    }

    try {
      const hash = await walletClient.sendTransaction(transaction)
      return hash
    } catch (error) {
      console.error('Failed to send transaction:', error)
      throw error
    }
  }, [walletClient])

  // Auto-reconnect on page load if user was previously connected
  useEffect(() => {
    if (privyReady && privyAuthenticated && !wagmiConnected && connectors.length > 0) {
      // Auto-reconnect Wagmi if Privy is authenticated
      try {
        wagmiConnect({ connector: connectors[0] })
      } catch (error) {
        console.error('Auto-reconnect failed:', error)
      }
    }
  }, [privyReady, privyAuthenticated, wagmiConnected, wagmiConnect, connectors])

  return {
    // Wallet info
    address,
    isConnected,
    isConnecting,
    isDisconnecting,
    chainId,
    walletClient,
    
    // Actions
    connect,
    disconnect,
    switchNetwork,
    signTransaction,
    sendTransaction,
  }
}

// Hook for checking if we're on the correct network
export function useCorrectNetwork() {
  const { chainId } = useAccount()
  const isCorrectNetwork = chainId === abstractChain.id
  
  return {
    isCorrectNetwork,
    currentChainId: chainId,
    expectedChainId: abstractChain.id,
    networkName: abstractChain.name,
  }
} 