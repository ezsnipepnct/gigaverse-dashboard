'use client'

import { useWallet, useCorrectNetwork } from '@/hooks/useWallet'
import { useState } from 'react'
import { Wallet, ChevronDown, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

interface WalletConnectProps {
  className?: string
  showBalance?: boolean
}

export default function WalletConnect({ className = '', showBalance = false }: WalletConnectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const {
    address,
    isConnected,
    isConnecting,
    isDisconnecting,
    chainId,
    connect,
    disconnect,
    switchNetwork,
  } = useWallet()

  const { isCorrectNetwork, networkName } = useCorrectNetwork()

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Handle connection
  const handleConnect = async () => {
    try {
      await connect()
    } catch (error) {
      console.error('Connection failed:', error)
      // You could add toast notification here
    }
  }

  // Handle disconnection
  const handleDisconnect = async () => {
    try {
      await disconnect()
      setIsDropdownOpen(false)
    } catch (error) {
      console.error('Disconnection failed:', error)
    }
  }

  // Handle network switch
  const handleSwitchNetwork = async () => {
    try {
      await switchNetwork()
    } catch (error) {
      console.error('Network switch failed:', error)
    }
  }

  // If not connected, show connect button
  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={`
          flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 
          disabled:bg-cyan-600/50 disabled:cursor-not-allowed
          text-white font-medium rounded-lg transition-colors duration-200
          ${className}
        `}
      >
        {isConnecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>
    )
  }

  // If connected, show wallet info and controls
  return (
    <div className={`relative ${className}`}>
      {/* Network warning if not on correct network */}
      {!isCorrectNetwork && (
        <div className="mb-2 p-2 bg-orange-100 border border-orange-300 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <span className="text-sm text-orange-800">
            Wrong network. Switch to {networkName}
          </span>
          <button
            onClick={handleSwitchNetwork}
            className="ml-auto px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
          >
            Switch
          </button>
        </div>
      )}

      {/* Main wallet button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="
          flex items-center space-x-3 px-4 py-2 bg-gray-800 hover:bg-gray-700
          text-white rounded-lg transition-colors duration-200 border border-gray-600
        "
      >
        {/* Connection status indicator */}
        <div className="flex items-center space-x-2">
          {isCorrectNetwork ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          )}
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">
              {formatAddress(address!)}
            </span>
            {showBalance && (
              <span className="text-xs text-gray-400">
                {isCorrectNetwork ? networkName : `Chain ${chainId}`}
              </span>
            )}
          </div>
        </div>
        
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div className="
          absolute top-full mt-2 right-0 w-64 bg-white border border-gray-200 
          rounded-lg shadow-lg z-50 overflow-hidden
        ">
          {/* Wallet info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Abstract Global Wallet</p>
                <p className="text-xs text-gray-500">Connected</p>
              </div>
            </div>
            
            <div className="text-xs text-gray-600 break-all">
              {address}
            </div>
            
            {/* Network info */}
            <div className="mt-2 flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isCorrectNetwork ? 'bg-green-400' : 'bg-orange-400'
              }`} />
              <span className="text-xs text-gray-600">
                {isCorrectNetwork ? networkName : `Chain ${chainId}`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            {!isCorrectNetwork && (
              <button
                onClick={handleSwitchNetwork}
                className="
                  w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 
                  rounded transition-colors duration-150 flex items-center space-x-2
                "
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Switch to {networkName}</span>
              </button>
            )}
            
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="
                w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 
                rounded transition-colors duration-150 flex items-center space-x-2
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wallet className="w-4 h-4" />
              )}
              <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  )
} 