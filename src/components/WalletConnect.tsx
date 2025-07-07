'use client'

import { useAGWWallet } from '@/hooks/useAGWWallet'
import { Wallet, LogOut, User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface WalletConnectProps {
  className?: string
}

export default function WalletConnect({ className = '' }: WalletConnectProps) {
  const {
    isConnected,
    isConnecting,
    address,
    authData,
    error,
    connect,
    disconnect,
    clearError
  } = useAGWWallet()

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
          <button 
            onClick={clearError}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  if (isConnecting) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Connecting to Abstract Global Wallet...</span>
        </div>
      </div>
    )
  }

  if (isConnected && address && authData) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* User info */}
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <User className="h-4 w-4 text-green-600" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-green-800">
              {formatAddress(address)}
            </span>
            <span className="text-xs text-green-600">
              Abstract Global Wallet
            </span>
          </div>
        </div>

        {/* Disconnect button */}
        <button
          onClick={disconnect}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-gray-700 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Disconnect</span>
        </button>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={connect}
        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium"
      >
        <Wallet className="h-4 w-4" />
        <span>Connect with Abstract</span>
      </button>
    </div>
  )
} 