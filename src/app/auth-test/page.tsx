'use client'

import { useState, useEffect } from 'react'
import { agwAuthService } from '@/lib/agw-auth'
import WalletConnect from '@/components/WalletConnect'
import { CheckCircle, AlertCircle, User, Key, Loader2 } from 'lucide-react'

export default function AuthTestPage() {
  const [authData, setAuthData] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [isTestingAPI, setIsTestingAPI] = useState(false)

  // Update auth state when wallet connects/disconnects
  useEffect(() => {
    const updateAuthState = () => {
      const currentAuthData = agwAuthService.getAuthData()
      setAuthData(currentAuthData)
    }

    updateAuthState()
    // Check auth state every second to catch updates
    const interval = setInterval(updateAuthState, 1000)
    return () => clearInterval(interval)
  }, [])

  const testAPI = async () => {
    const jwt = agwAuthService.getJWT()
    if (!jwt) {
      alert('No JWT token available. Please connect your wallet first.')
      return
    }

    setIsTestingAPI(true)
    setTestResults(null)

    try {
      // Test energy API
      const energyResponse = await fetch('/api/player/energy', {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      })

      const energyData = await energyResponse.json()

      setTestResults({
        success: energyResponse.ok,
        status: energyResponse.status,
        data: energyData
      })

    } catch (error) {
      setTestResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsTestingAPI(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-cyan-400 font-mono">
            GIGAVERSE AUTH TEST
          </h1>
          <p className="text-cyan-300/70 font-mono">
            Test the Gigaverse authentication system
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="bg-gray-900/50 border border-cyan-400/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Wallet Connection
          </h2>
          <WalletConnect className="justify-center" />
        </div>

        {/* Authentication Status */}
        {authData && (
          <div className="bg-gray-900/50 border border-green-400/30 rounded-lg p-6">
            <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Authentication Status
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-cyan-400 font-mono text-sm mb-1">Wallet Address</label>
                  <div className="bg-black/50 border border-cyan-400/20 rounded p-2 font-mono text-sm text-cyan-300">
                    {authData.user.caseSensitiveAddress}
                  </div>
                </div>
                
                <div>
                  <label className="block text-cyan-400 font-mono text-sm mb-1">Username</label>
                  <div className="bg-black/50 border border-cyan-400/20 rounded p-2 font-mono text-sm text-cyan-300">
                    {authData.user.username}
                  </div>
                </div>
                
                <div>
                  <label className="block text-cyan-400 font-mono text-sm mb-1">User ID</label>
                  <div className="bg-black/50 border border-cyan-400/20 rounded p-2 font-mono text-sm text-cyan-300">
                    {authData.user._id}
                  </div>
                </div>
                
                <div>
                  <label className="block text-cyan-400 font-mono text-sm mb-1">Token Expires</label>
                  <div className="bg-black/50 border border-cyan-400/20 rounded p-2 font-mono text-sm text-cyan-300">
                    {new Date(authData.expiresAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Game Account Info */}
              {authData.gameAccount && (
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-cyan-400 mb-2">Game Account</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-cyan-400 font-mono text-sm mb-1">Can Enter Game</label>
                      <div className="bg-black/50 border border-cyan-400/20 rounded p-2 font-mono text-sm text-cyan-300">
                        {authData.gameAccount.canEnterGame ? 'Yes' : 'No'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-cyan-400 font-mono text-sm mb-1">Noob Pass Balance</label>
                      <div className="bg-black/50 border border-cyan-400/20 rounded p-2 font-mono text-sm text-cyan-300">
                        {authData.gameAccount.noobPassBalance}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-cyan-400 font-mono text-sm mb-1">Last Noob ID</label>
                      <div className="bg-black/50 border border-cyan-400/20 rounded p-2 font-mono text-sm text-cyan-300">
                        {authData.gameAccount.lastNoobId}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* JWT Token */}
        {agwAuthService.getJWT() && (
          <div className="bg-gray-900/50 border border-cyan-400/30 rounded-lg p-6">
            <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              JWT Token
            </h2>
            
            <div className="bg-black/50 border border-cyan-400/20 rounded p-3 font-mono text-xs text-cyan-300 break-all">
              {agwAuthService.getJWT()}
            </div>
          </div>
        )}

        {/* API Test */}
        {agwAuthService.isAuthenticated() && (
          <div className="bg-gray-900/50 border border-cyan-400/30 rounded-lg p-6">
            <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              API Test
            </h2>
            
            <button
              onClick={testAPI}
              disabled={isTestingAPI}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              {isTestingAPI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing API...
                </>
              ) : (
                'Test Energy API'
              )}
            </button>

            {/* Test Results */}
            {testResults && (
              <div className={`mt-4 p-4 rounded-lg border ${
                testResults.success 
                  ? 'bg-green-900/20 border-green-400/30 text-green-400'
                  : 'bg-red-900/20 border-red-400/30 text-red-400'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResults.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="font-bold">
                    {testResults.success ? 'API Test Successful!' : 'API Test Failed'}
                  </span>
                </div>
                
                {testResults.status && (
                  <p className="mb-2 font-mono text-sm">
                    Status: {testResults.status}
                  </p>
                )}
                
                {testResults.error && (
                  <p className="mb-2 font-mono text-sm">
                    Error: {testResults.error}
                  </p>
                )}
                
                {testResults.data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-mono text-sm">Response Data</summary>
                    <pre className="mt-2 p-2 bg-black/50 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(testResults.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 