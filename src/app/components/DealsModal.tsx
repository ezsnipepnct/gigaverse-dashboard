'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  Tag, 
  Package, 
  Sparkles,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Timer,
  CheckCircle,
  Loader,
  RefreshCw,
  Zap
} from 'lucide-react'
import { agwAuthService } from '@/lib/agw-auth'
import ItemIcon from './ItemIcon'
import ItemTooltip from './ItemTooltip'
import { marketPriceService } from '../services/marketPrices'

interface DealsModalProps {
  onClose: () => void
}

interface Deal {
  id: string
  name: string
  inputItem: {
    id: number
    name: string
    description: string
    iconUrl: string
    imageUrl: string
  }
  inputAmount: number
  outputAmount: number
  isWeekly: boolean
  maxCompletions: number
  timesCompleted: number
}

interface PlayerBalance {
  [itemId: string]: number
}

interface TradeState {
  [dealId: string]: 'idle' | 'loading' | 'success' | 'error'
}

const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"
const NOOB_ID = 21424

const DealsModal: React.FC<DealsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily')
  const [deals, setDeals] = useState<Deal[]>([])
  const [playerBalances, setPlayerBalances] = useState<PlayerBalance>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tradeStates, setTradeStates] = useState<TradeState>({})
  const [tradeMessages, setTradeMessages] = useState<{[dealId: string]: string}>({})
  const [floorPriceMap, setFloorPriceMap] = useState<Record<string, number>>({})
  const [ethUsd, setEthUsd] = useState<number>(0)
  const [timeInfo, setTimeInfo] = useState({
    currentDay: 0,
    currentWeek: 0,
    timeUntilNextDay: '',
    timeUntilNextWeek: ''
  })

  // JWT Token management using AGW auth service
  const getJWTToken = () => {
    return agwAuthService.getJWT() || ''
  }

  useEffect(() => {
    fetchDealsData()
    fetchPlayerBalances()
  }, [])

  // Load market floors for value computations
  useEffect(() => {
    ;(async () => {
      try {
        const floors = await marketPriceService.getFloorMap()
        setFloorPriceMap(floors)
        const usd = await marketPriceService.getEthUsd()
        setEthUsd(usd)
      } catch (err) {
        console.error('Failed to fetch market floors for deals:', err)
      }
    })()
  }, [])

  const formatUsd = (n: number) => {
    if (!n || n <= 0) return '$0'
    if (n < 0.01) return `$${n.toFixed(4)}`
    if (n < 1) return `$${n.toFixed(3)}`
    if (n < 100) return `$${n.toFixed(2)}`
    return `$${Math.round(n).toLocaleString()}`
  }

  const getTotalUsdNeededForDailyDeals = () => {
    if (!ethUsd || ethUsd <= 0) return 0
    let total = 0
    for (const deal of dailyDeals) {
      const remainingCompletions = deal.maxCompletions > 0 ? Math.max(0, deal.maxCompletions - deal.timesCompleted) : 0
      if (remainingCompletions === 0) continue
      const required = deal.inputAmount * remainingCompletions
      const have = getPlayerBalance(deal.inputItem.id)
      const missing = Math.max(0, required - have)
      if (missing === 0) continue
      const floorEth = floorPriceMap[deal.inputItem.id.toString()] || 0
      if (floorEth <= 0) continue
      total += missing * floorEth * ethUsd
    }
    return total
  }

  // Function to fetch recipe player data for completion tracking
  const fetchRecipePlayerData = async () => {
    try {
      console.log('Fetching recipe player data...')
      const response = await fetch(`https://gigaverse.io/api/offchain/recipes/player/${WALLET_ADDRESS}`)
      const data = await response.json()
      
      // Parse the recipe player data into a lookup object
      const playerDataLookup: Record<string, any> = {}
      data.entities.forEach((entity: any) => {
        // Use ID_CID directly as it contains the recipe ID like "Recipe#90077"
        const recipeId = entity.ID_CID
        if (recipeId) {
          playerDataLookup[recipeId] = entity
        }
      })
      
      console.log('Fetched recipe player data:', Object.keys(playerDataLookup).length, 'recipes')
      return playerDataLookup
    } catch (error) {
      console.error('Error fetching recipe player data:', error)
      return {}
    }
  }

  const fetchDealsData = async () => {
    try {
      setLoading(true)
      console.log('Fetching deals data...')
      
      // Fetch both static data and recipe player data
      const [staticResponse, playerDataLookup] = await Promise.all([
        fetch('https://gigaverse.io/api/offchain/static'),
        fetchRecipePlayerData()
      ])
      
      const data = await staticResponse.json()
      
      // Set time information
      setTimeInfo({
        currentDay: data.currentDay,
        currentWeek: data.currentWeek,
        timeUntilNextDay: data.readableTimeTillNextDay,
        timeUntilNextWeek: formatTimeUntilNextWeek(data.secondsTillNextWeek)
      })

      // Get deals that involve Abstract Stubs (ID 373)
      const abstractStubsDeals = data.recipes.filter((recipe: any) => 
        recipe.LOOT_ID_CID_array?.includes(373)
      )

      console.log('Found Abstract Stubs deals:', abstractStubsDeals.length)

      // Process deals
      const processedDeals: Deal[] = []
      
      for (const recipe of abstractStubsDeals) {
        const inputItemId = recipe.INPUT_ID_CID_array?.[0]
        const inputAmount = recipe.INPUT_AMOUNT_CID_array?.[0]
        const outputAmount = recipe.LOOT_AMOUNT_CID_array?.[0]
        
        if (!inputItemId || !inputAmount || !outputAmount) continue

        // Find input item details
        const inputItem = data.gameItems.find((item: any) => item.ID_CID === inputItemId)
        if (!inputItem) continue

        // Find output item details (Abstract Stubs)
        const outputItemId = recipe.LOOT_ID_CID_array?.[0] // Should be 373 for Abstract Stubs
        const outputItem = data.gameItems.find((item: any) => item.ID_CID === outputItemId)
        
        const dealId = recipe.docId || `deal-${inputItemId}`
        
        // Get completion data from player data using the recipe ID
        const recipeId = dealId // For deals, the docId is actually the recipe ID
        const playerData = playerDataLookup[recipeId]
        let timesCompleted = 0
        
        if (playerData) {
          // Use DAY_COUNT_CID for daily deals, WEEK_COUNT_CID for weekly deals
          const isWeekly = recipe.IS_WEEKLY_CID || false
          timesCompleted = isWeekly ? (playerData.WEEK_COUNT_CID || 0) : (playerData.DAY_COUNT_CID || 0)
          console.log(`Deal ${recipeId}: ${isWeekly ? 'Weekly' : 'Daily'} completions: ${timesCompleted}`)
        }
        
        // Generate deal name in format "input item -> output item"
        const inputItemName = inputItem.NAME_CID || `Item ${inputItemId}`
        const outputItemName = outputItem?.NAME_CID || 'Abstract Stubs'
        const dealName = `${inputItemName} → ${outputItemName}`
        
        processedDeals.push({
          id: dealId,
          name: dealName,
          inputItem: {
            id: inputItemId,
            name: inputItem.NAME_CID || `Item ${inputItemId}`,
            description: inputItem.DESCRIPTION_CID || '',
            iconUrl: inputItem.ICON_URL_CID || '',
            imageUrl: inputItem.IMG_URL_CID || ''
          },
          inputAmount,
          outputAmount,
          isWeekly: recipe.IS_WEEKLY_CID || false,
          maxCompletions: recipe.MAX_COMPLETIONS_CID || 0,
          timesCompleted
        })
      }

      // Sort deals by output amount (highest stubs first)
      const sortedDeals = processedDeals.sort((a, b) => b.outputAmount - a.outputAmount)

      setDeals(sortedDeals)
      console.log('Processed deals:', sortedDeals.length)
      
    } catch (error) {
      console.error('Error fetching deals:', error)
      setError('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlayerBalances = async () => {
    try {
      const jwtToken = getJWTToken()
      if (!jwtToken) {
        console.log('No JWT token available')
        return
      }

      const response = await fetch(`/api/player/balances?wallet=${WALLET_ADDRESS}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPlayerBalances(data.balances || {})
        console.log('Player balances loaded:', Object.keys(data.balances || {}).length)
      } else {
        console.log('Failed to fetch player balances')
      }
    } catch (error) {
      console.error('Error fetching player balances:', error)
    }
  }

  const executeBulkTrade = async (deal: Deal, times: number) => {
    const jwtToken = getJWTToken()
    if (!jwtToken) {
      setTradeMessages(prev => ({
        ...prev,
        [deal.id]: 'JWT token required. Please login first.'
      }))
      setTradeStates(prev => ({ ...prev, [deal.id]: 'error' }))
      return
    }

    try {
      setTradeStates(prev => ({ ...prev, [deal.id]: 'loading' }))
      setTradeMessages(prev => ({ ...prev, [deal.id]: '' }))

      console.log(`Executing bulk trade for deal ${deal.id} ${times} times...`)
      
      let successCount = 0
      let totalStubs = 0

      for (let i = 0; i < times; i++) {
        const payload = {
          recipeId: deal.id,
          noobId: NOOB_ID,
          gearInstanceId: "",
          nodeIndex: 0
        }

        const response = await fetch('/api/recipes/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify(payload)
        })

        const data = await response.json()

        if (response.ok && data.success && data.entities?.[0]?.SUCCESS_CID) {
          successCount++
          const stubsReceived = data.entities[0].LOOT_AMOUNT_CID_array?.[0] || deal.outputAmount
          totalStubs += stubsReceived
          
          // Note: Completion tracking is now handled by the API
        } else {
          const errorMessage = data.error || data.message || 'Unknown error'
          console.log(`Trade ${i + 1} failed:`, errorMessage)
          
          // Check if this is a completion/cooldown error
          if (errorMessage.toLowerCase().includes('cooldown') || 
              errorMessage.toLowerCase().includes('complete') ||
              errorMessage.toLowerCase().includes('limit')) {
            console.log(`Deal ${deal.id} appears to be completed: ${errorMessage}`)
          }
          break
        }
      }

      if (successCount > 0) {
        setTradeStates(prev => ({ ...prev, [deal.id]: 'success' }))
        setTradeMessages(prev => ({
          ...prev,
          [deal.id]: `Success! Completed ${successCount}/${times} trades. Received ${totalStubs} Abstract Stubs`
        }))

        // Refresh player balances and deals data after successful trades
        setTimeout(() => {
          fetchPlayerBalances()
          fetchDealsData()
        }, 1000)
      } else {
        setTradeStates(prev => ({ ...prev, [deal.id]: 'error' }))
        setTradeMessages(prev => ({
          ...prev,
          [deal.id]: 'All trades failed'
        }))
      }

      // Clear message after 5 seconds
      setTimeout(() => {
        setTradeStates(prev => ({ ...prev, [deal.id]: 'idle' }))
        setTradeMessages(prev => ({ ...prev, [deal.id]: '' }))
      }, 5000)

    } catch (error) {
      console.error('Bulk trade execution error:', error)
      setTradeStates(prev => ({ ...prev, [deal.id]: 'error' }))
      setTradeMessages(prev => ({
        ...prev,
        [deal.id]: error instanceof Error ? error.message : 'Network error'
      }))

      // Clear error message after 5 seconds
      setTimeout(() => {
        setTradeStates(prev => ({ ...prev, [deal.id]: 'idle' }))
        setTradeMessages(prev => ({ ...prev, [deal.id]: '' }))
      }, 5000)
    }
  }

  const executeAllDailyDeals = async () => {
    const availableDeals = dailyDeals.filter(deal => canAffordDeal(deal) && !isDealCompleted(deal))
    
    for (const deal of availableDeals) {
      const remainingCompletions = deal.maxCompletions - deal.timesCompleted
      const affordableCompletions = Math.floor(getPlayerBalance(deal.inputItem.id) / deal.inputAmount)
      const timesToComplete = Math.min(remainingCompletions, affordableCompletions)
      
      if (timesToComplete > 0) {
        await executeBulkTrade(deal, timesToComplete)
      }
    }
  }

  const refreshDeals = async () => {
    setLoading(true)
    
    // Fetch fresh data including completion tracking from API
    await fetchDealsData()
    await fetchPlayerBalances()
    setLoading(false)
  }

  const executeTrade = async (deal: Deal) => {
    const jwtToken = getJWTToken()
    if (!jwtToken) {
      setTradeMessages(prev => ({
        ...prev,
        [deal.id]: 'JWT token required. Please login first.'
      }))
      setTradeStates(prev => ({ ...prev, [deal.id]: 'error' }))
      return
    }

    try {
      setTradeStates(prev => ({ ...prev, [deal.id]: 'loading' }))
      setTradeMessages(prev => ({ ...prev, [deal.id]: '' }))

      console.log(`Executing trade for deal ${deal.id}...`)
      
      const payload = {
        recipeId: deal.id,
        noobId: NOOB_ID,
        gearInstanceId: "",
        nodeIndex: 0
      }

      console.log('Trade payload:', payload)

      const response = await fetch('/api/recipes/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('Trade response:', data)

      if (response.ok && data.success && data.entities?.[0]?.SUCCESS_CID) {
        const result = data.entities[0]
                  const stubsReceived = result.LOOT_AMOUNT_CID_array?.[0] || deal.outputAmount
        
        // Note: Completion tracking is now handled by the API
        
        setTradeStates(prev => ({ ...prev, [deal.id]: 'success' }))
        setTradeMessages(prev => ({
          ...prev,
          [deal.id]: `Success! Received ${stubsReceived} Abstract Stubs`
        }))

        // Refresh player balances and deals data after successful trade
        setTimeout(() => {
          fetchPlayerBalances()
          fetchDealsData()
        }, 1000)

        // Clear success message after 5 seconds
        setTimeout(() => {
          setTradeStates(prev => ({ ...prev, [deal.id]: 'idle' }))
          setTradeMessages(prev => ({ ...prev, [deal.id]: '' }))
        }, 5000)

      } else {
        // Handle API error
        let errorMessage = 'Trade failed'
        
        if (data.error) {
          errorMessage = data.error
        } else if (data.message) {
          errorMessage = data.message
        } else if (!response.ok) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }

        // Check if this is a completion/cooldown error
        if (errorMessage.toLowerCase().includes('cooldown') || 
            errorMessage.toLowerCase().includes('complete') ||
            errorMessage.toLowerCase().includes('limit')) {
          errorMessage = 'Deal completed (limit reached)'
        }

        console.error('Trade failed:', errorMessage)
        setTradeStates(prev => ({ ...prev, [deal.id]: 'error' }))
        setTradeMessages(prev => ({
          ...prev,
          [deal.id]: errorMessage
        }))

        // Clear error message after 5 seconds
        setTimeout(() => {
          setTradeStates(prev => ({ ...prev, [deal.id]: 'idle' }))
          setTradeMessages(prev => ({ ...prev, [deal.id]: '' }))
        }, 5000)
      }

    } catch (error) {
      console.error('Trade execution error:', error)
      setTradeStates(prev => ({ ...prev, [deal.id]: 'error' }))
      setTradeMessages(prev => ({
        ...prev,
        [deal.id]: error instanceof Error ? error.message : 'Network error'
      }))

      // Clear error message after 5 seconds
      setTimeout(() => {
        setTradeStates(prev => ({ ...prev, [deal.id]: 'idle' }))
        setTradeMessages(prev => ({ ...prev, [deal.id]: '' }))
      }, 5000)
    }
  }

  const formatTimeUntilNextWeek = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600))
    const hours = Math.floor((seconds % (24 * 3600)) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const dailyDeals = deals.filter(deal => !deal.isWeekly)
  const weeklyDeals = deals.filter(deal => deal.isWeekly)

  const getPlayerBalance = (itemId: string | number) => {
    return playerBalances[itemId.toString()] || 0
  }

  const canAffordDeal = (deal: Deal) => {
    return getPlayerBalance(deal.inputItem.id) >= deal.inputAmount
  }

  const isDealCompleted = (deal: Deal) => {
    // Check if deal has reached max completions based on API data
    return deal.maxCompletions > 0 && deal.timesCompleted >= deal.maxCompletions
  }

  const getRemainingCompletions = (deal: Deal) => {
    if (deal.maxCompletions === 0) return Infinity
    return Math.max(0, deal.maxCompletions - deal.timesCompleted)
  }

  const getTradeButtonContent = (deal: Deal) => {
    const state = tradeStates[deal.id] || 'idle'
    const canAfford = canAffordDeal(deal)
    const isCompleted = isDealCompleted(deal)

    switch (state) {
      case 'loading':
        return (
          <div className="flex items-center justify-center space-x-2">
            <Loader className="w-4 h-4 animate-spin" />
            <span>TRADING...</span>
          </div>
        )
      case 'success':
        return (
          <div className="flex items-center justify-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>SUCCESS</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>ERROR</span>
          </div>
        )
      default:
        if (isCompleted) return 'COMPLETED'
        return canAfford ? 'TRADE' : 'INSUFFICIENT BALANCE'
    }
  }

  const getTradeButtonStyle = (deal: Deal) => {
    const state = tradeStates[deal.id] || 'idle'
    const canAfford = canAffordDeal(deal)
    const isCompleted = isDealCompleted(deal)

    switch (state) {
      case 'loading':
        return 'bg-blue-400/20 border border-blue-400/50 text-blue-400 cursor-wait'
      case 'success':
        return 'bg-green-400/20 border border-green-400/50 text-green-400'
      case 'error':
        return 'bg-red-400/20 border border-red-400/50 text-red-400'
      default:
        if (isCompleted) return 'bg-green-400/20 border border-green-400/50 text-green-400 cursor-not-allowed'
        return canAfford
          ? 'bg-cyan-400/20 border border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/30 hover:border-cyan-400'
          : 'bg-gray-600/20 border border-gray-600/50 text-gray-500 cursor-not-allowed'
    }
  }

  const isTradeDisabled = (deal: Deal) => {
    const state = tradeStates[deal.id] || 'idle'
    const canAfford = canAffordDeal(deal)
    const isCompleted = isDealCompleted(deal)
    return !canAfford || state === 'loading' || isCompleted
  }

  const currentDeals = activeTab === 'daily' ? dailyDeals : weeklyDeals

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-cyan-400/20">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-cyan-400/20 rounded-full">
            <Tag className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-mono text-cyan-400">DEALS</h2>
            <p className="text-gray-400 font-mono text-sm">
              Trade items for Abstract Stubs
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshDeals}
            disabled={loading}
            className="text-gray-400 hover:text-cyan-400 transition-colors p-2 hover:bg-cyan-400/10 rounded disabled:opacity-50"
            title="Refresh deals"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={executeAllDailyDeals}
            disabled={loading || activeTab !== 'daily'}
            className="text-gray-400 hover:text-cyan-400 transition-colors p-2 hover:bg-cyan-400/10 rounded disabled:opacity-50"
            title="Execute all daily deals"
          >
            <Zap className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-cyan-400 transition-colors p-2 hover:bg-cyan-400/10 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Time Info */}
      <div className="px-6 py-3 border-b border-cyan-400/20 bg-black/20">
        <div className="flex items-center justify-between text-sm font-mono">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Timer className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-400">Daily Reset:</span>
              <span className="text-cyan-400">{timeInfo.timeUntilNextDay}</span>
            </div>
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-400">Weekly Reset:</span>
              <span className="text-cyan-400">{timeInfo.timeUntilNextWeek}</span>
            </div>
          </div>
          <div className="text-gray-400">
            Needed to complete daily: <span className="text-yellow-400 font-bold">{formatUsd(getTotalUsdNeededForDailyDeals())}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cyan-400/20">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 px-6 py-4 font-mono text-sm font-bold transition-all duration-300 
            ${activeTab === 'daily' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5' : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-400/5'}`}
        >
          <div className="flex items-center justify-center space-x-2">
            <span>DAILY</span>
            <span className="px-2 py-1 bg-cyan-400/20 text-cyan-400 rounded text-xs">{dailyDeals.length}</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex-1 px-6 py-4 font-mono text-sm font-bold transition-all duration-300 
            ${activeTab === 'weekly' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5' : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-400/5'}`}
        >
          <div className="flex items-center justify-center space-x-2">
            <span>WEEKLY</span>
            <span className="px-2 py-1 bg-cyan-400/20 text-cyan-400 rounded text-xs">{weeklyDeals.length}</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full mx-auto mb-4"
              />
              <p className="text-cyan-400 font-mono">LOADING DEALS...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-mono">{error}</p>
            <button
              onClick={fetchDealsData}
              className="mt-4 px-6 py-2 bg-red-400/20 border border-red-400 text-red-400 rounded hover:bg-red-400/30 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : currentDeals.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-mono">No {activeTab} deals available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentDeals.map((deal) => {
              const playerBalance = getPlayerBalance(deal.inputItem.id)
              const canAfford = canAffordDeal(deal)
              const tradeMessage = tradeMessages[deal.id]
              
              return (
                <motion.div
                  key={deal.id}
                  whileHover={{ scale: 1.02 }}
                  className={`bg-black/40 border border-cyan-400/30 rounded-lg p-4 transition-all duration-300 ${
                    canAfford ? 'hover:border-cyan-400/50' : 'opacity-60'
                  }`}
                >
                  {/* Deal Content */}
                  <div className="space-y-4">
                    {/* Input Item */}
                    <div className="flex items-center space-x-3">
                      <ItemTooltip itemId={deal.inputItem.id} position="right">
                        <ItemIcon itemId={deal.inputItem.id} size="medium" showRarity className="w-12 h-12" />
                      </ItemTooltip>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-mono font-bold text-white text-sm truncate">{deal.inputItem.name}</h4>
                        <div className="flex items-center space-x-3 text-xs font-mono mt-1">
                          <span className="text-gray-400">ID: {deal.inputItem.id}</span>
                          {(() => {
                            const pEth = floorPriceMap[deal.inputItem.id.toString()] || 0
                            const usd = pEth > 0 && ethUsd > 0 ? pEth * ethUsd : 0
                            return usd > 0 ? (
                              <span className="text-yellow-400">Floor: {formatUsd(usd)}</span>
                            ) : null
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Exchange Arrow */}
                    <div className="flex items-center justify-center py-2">
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>

                    {/* Output (Abstract Stubs) */}
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-cyan-400/20 rounded border border-cyan-400/30 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-mono font-bold text-cyan-400 text-sm">Abstract Stubs</h4>
                        <p className="text-xs text-gray-400">Weekly XP allocation</p>
                      </div>
                    </div>

                    {/* Exchange Summary */}
                    <div className="bg-black/40 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm font-mono">
                        <span className="text-gray-400">Trade:</span>
                        <span className="text-white">{deal.inputAmount}x</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-mono">
                        <span className="text-gray-400">Receive:</span>
                        <span className="text-cyan-400">{deal.outputAmount}x</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-mono">
                        <span className="text-gray-400">Balance:</span>
                        <span className={`${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                          {playerBalance.toLocaleString()}
                        </span>
                      </div>
                      {deal.maxCompletions > 0 && (
                        <div className="flex items-center justify-between text-sm font-mono border-t border-gray-600/50 pt-2">
                          <span className="text-gray-400">Limit:</span>
                          <span className={`${isDealCompleted(deal) ? 'text-red-400' : 'text-cyan-400'}`}>
                            {deal.timesCompleted}/{deal.maxCompletions}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Trade Message */}
                    {tradeMessage && (
                      <div className={`text-xs font-mono p-2 rounded border ${
                        tradeStates[deal.id] === 'success' 
                          ? 'bg-green-400/10 border-green-400/30 text-green-400'
                          : 'bg-red-400/10 border-red-400/30 text-red-400'
                      }`}>
                        {tradeMessage}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <button
                        disabled={isTradeDisabled(deal)}
                        onClick={() => executeTrade(deal)}
                        className={`w-full py-3 px-4 rounded font-mono text-sm font-bold transition-all duration-300 ${getTradeButtonStyle(deal)}`}
                      >
                        {getTradeButtonContent(deal)}
                      </button>
                      
                      {/* Bulk Trade Button - only show if deal can be completed multiple times */}
                      {deal.maxCompletions > 1 && !isDealCompleted(deal) && canAffordDeal(deal) && (
                        <button
                          disabled={isTradeDisabled(deal)}
                          onClick={() => {
                            const remainingCompletions = getRemainingCompletions(deal)
                            const affordableCompletions = Math.floor(playerBalance / deal.inputAmount)
                            const timesToComplete = Math.min(remainingCompletions, affordableCompletions)
                            if (timesToComplete > 1) {
                              executeBulkTrade(deal, timesToComplete)
                            }
                          }}
                          className="w-full py-2 px-4 rounded font-mono text-xs font-bold transition-all duration-300 bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20 hover:border-cyan-400/50"
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <Zap className="w-4 h-4" />
                            <span>
                              SELL ALL ({Math.min(getRemainingCompletions(deal), Math.floor(playerBalance / deal.inputAmount))})
                            </span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default DealsModal 