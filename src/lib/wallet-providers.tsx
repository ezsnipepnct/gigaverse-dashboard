'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { createConfig, WagmiProvider } from 'wagmi'
import { http } from 'viem'
import { abstractChain } from './chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

// Create WAGMI config for Abstract chain
const wagmiConfig = createConfig({
  chains: [abstractChain],
  transports: {
    [abstractChain.id]: http(),
  },
})

// Create React Query client
const queryClient = new QueryClient()

// Privy configuration - simplified for now
const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'your-privy-app-id'

const privyConfig = {
  // Configure appearance
  appearance: {
    theme: 'dark' as const,
    accentColor: '#06b6d4' as `#${string}`,
  },
  // Configure supported chains
  defaultChain: abstractChain,
  supportedChains: [abstractChain],
}

interface WalletProvidersProps {
  children: ReactNode
}

export function WalletProviders({ children }: WalletProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <PrivyProvider
          appId={privyAppId}
          config={privyConfig}
        >
          {children}
        </PrivyProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}

// Hook for easy access to wallet configuration
export function useWalletConfig() {
  return {
    chain: abstractChain,
    config: wagmiConfig,
    privyConfig,
  }
} 