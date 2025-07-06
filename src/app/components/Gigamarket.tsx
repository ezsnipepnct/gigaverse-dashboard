'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown,
  Zap, 
  Shield, 
  Sword, 
  X, 
  Search,
  Filter,
  Sparkles,
  ArrowUpDown,
  Eye,
  Coins,
  Flame,
  Star,
  Package,
  Beaker,
  Heart,
  Grid,
  List,
  Settings,
  Bell,
  BarChart3,
  Download,
  Share,
  Bookmark,
  AlertTriangle,
  Clock,
  Users,
  Activity,
  Layers,
  Target,
  Shuffle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Info,
  ExternalLink,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Plus
} from 'lucide-react'
import { itemMetadataService } from '@/app/services/itemMetadata'
import ItemIcon from './ItemIcon'
import ItemTooltip from './ItemTooltip'
import WalletConnect from '@/components/WalletConnect'
import CreateListingModal from '@/components/CreateListingModal'

interface GigamarketProps {
  isOpen: boolean
  onClose: () => void
}

interface MarketItem {
  GAME_ITEM_ID_CID: number
  ETH_MINT_PRICE_CID: number
  name?: string
  description?: string
  rarity?: number
  rarityName?: string
  category?: string
  type?: string
  priceInEth?: number
  imageUrl?: string
  iconUrl?: string
  volume?: number
  priceChange?: number
  priceHistory?: number[]
  lastSale?: number
  available?: boolean
  owner?: string
  stats?: {
    attack?: number
    defense?: number
    speed?: number
    magic?: number
  }
  attributes?: string[]
  tradingVolume24h?: number
  floorPrice?: number
  avgPrice?: number
  totalSupply?: number
  holders?: number
  listingTime?: string
  expirationTime?: string
}

const Gigamarket: React.FC<GigamarketProps> = ({ isOpen, onClose }) => {
  const [marketData, setMarketData] = useState<MarketItem[]>([])
  const [filteredData, setFilteredData] = useState<MarketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'price' | 'id' | 'rarity' | 'name' | 'volume' | 'change'>('price')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10 })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFavorites, setShowFavorites] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set())
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState('all')
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [priceAlerts, setPriceAlerts] = useState<Map<string, number>>(new Map())
  const [showPriceHistory, setShowPriceHistory] = useState(false)
  const [comparisonItems, setComparisonItems] = useState<Set<string>>(new Set())
  const [showComparison, setShowComparison] = useState(false)
  const [showUsdPrices, setShowUsdPrices] = useState(false)
  const [ethPrice, setEthPrice] = useState<number>(0)
  const [lastCurrencyMode, setLastCurrencyMode] = useState<'eth' | 'usd'>('eth')
  const [showCreateListingModal, setShowCreateListingModal] = useState(false)
  const [itemToList, setItemToList] = useState<any>(null)

  // Fetch ETH price from CoinGecko API
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
        const data = await response.json()
        setEthPrice(data.ethereum.usd)
      } catch (error) {
        console.error('Failed to fetch ETH price:', error)
        setEthPrice(3000) // Fallback price
      }
    }
    fetchEthPrice()
  }, [])

  // Auto-convert price range when switching currencies
  useEffect(() => {
    if (ethPrice > 0) {
      const currentMode = showUsdPrices ? 'usd' : 'eth'
      
      if (lastCurrencyMode !== currentMode) {
        if (currentMode === 'usd' && lastCurrencyMode === 'eth') {
          // Converting from ETH to USD
          setPriceRange(prev => ({
            min: Math.round(prev.min * ethPrice * 100) / 100,
            max: Math.round(prev.max * ethPrice * 100) / 100
          }))
        } else if (currentMode === 'eth' && lastCurrencyMode === 'usd') {
          // Converting from USD to ETH
          setPriceRange(prev => ({
            min: Math.round((prev.min / ethPrice) * 10000) / 10000,
            max: Math.round((prev.max / ethPrice) * 10000) / 10000
          }))
        }
        setLastCurrencyMode(currentMode)
        console.log(`💰 Converted price range from ${lastCurrencyMode} to ${currentMode}:`, {
          ethPrice,
          newRange: currentMode === 'usd' 
            ? `$${(priceRange.min * ethPrice).toFixed(2)} - $${(priceRange.max * ethPrice).toFixed(2)}`
            : `${(priceRange.min / ethPrice).toFixed(4)} - ${(priceRange.max / ethPrice).toFixed(4)} ETH`
        })
      }
    }
  }, [showUsdPrices, ethPrice, lastCurrencyMode])

  // Fetch marketplace data and enhance with item metadata
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch marketplace data
        const marketResponse = await fetch('https://gigaverse.io/api/marketplace/item/floor/all')
        const marketData = await marketResponse.json()
        
        console.log('Marketplace API response:', marketData)
        
        // Process and enhance the data with item metadata
        const processedData = await Promise.all(
          marketData.entities
            .filter((item: any) => item.ETH_MINT_PRICE_CID > 0) // Only show items with prices
            .map(async (item: any) => {
              const basePrice = item.ETH_MINT_PRICE_CID / 1000000000000000000 // Convert from wei to ETH
              
              // Get item metadata
              const metadata = await itemMetadataService.getItem(item.GAME_ITEM_ID_CID)
              
              return {
                ...item,
                priceInEth: basePrice,
                name: metadata?.name || `Item #${item.GAME_ITEM_ID_CID}`,
                description: metadata?.description || '',
                rarity: metadata?.rarity || 0,
                rarityName: getRarityName(metadata?.rarity || 0),
                                 type: metadata?.type || 'Unknown',
                 category: getCategoryFromType(metadata?.type || 'Unknown'),
                imageUrl: metadata?.image || '',
                iconUrl: metadata?.icon || '',
                // Mock additional data for demo purposes
                volume: Math.floor(Math.random() * 1000) + 10,
                priceChange: (Math.random() - 0.5) * 20,
                priceHistory: Array.from({length: 7}, () => basePrice * (0.8 + Math.random() * 0.4)),
                lastSale: basePrice * (0.9 + Math.random() * 0.2),
                available: Math.random() > 0.2,
                owner: `0x${Math.random().toString(16).substr(2, 8)}...`,
                stats: {
                  attack: Math.floor(Math.random() * 100) + 1,
                  defense: Math.floor(Math.random() * 100) + 1,
                  speed: Math.floor(Math.random() * 100) + 1,
                  magic: Math.floor(Math.random() * 100) + 1,
                },
                attributes: ['Rare', 'Enchanted', 'Battle-tested'].slice(0, Math.floor(Math.random() * 3) + 1),
                tradingVolume24h: Math.random() * 50,
                floorPrice: basePrice * 0.8,
                avgPrice: basePrice * 1.1,
                totalSupply: Math.floor(Math.random() * 10000) + 100,
                holders: Math.floor(Math.random() * 500) + 10,
                listingTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                expirationTime: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
              }
            })
        )
        
        setMarketData(processedData)
        setFilteredData(processedData)
      } catch (error) {
        console.error('Failed to fetch marketplace data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const getRarityName = (rarity: number): string => {
    const rarityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Relic']
    return rarityNames[rarity] || 'Unknown'
  }

  const getCategoryFromType = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'Consumable': 'consumables',
      'Material': 'materials',
      'Collectable': 'collectables',
      'Equipment': 'equipment',
      'Weapon': 'weapons',
      'Armor': 'armor'
    }
    return typeMap[type] || 'other'
  }

  const getRarityColor = (rarity: number) => {
    const colors = [
      'from-gray-400 to-gray-600',      // Common
      'from-green-400 to-green-600',    // Uncommon
      'from-blue-400 to-blue-600',      // Rare
      'from-purple-400 to-purple-600',  // Epic
      'from-yellow-400 to-yellow-600',  // Legendary
      'from-red-600 to-red-800'         // Relic (dark red)
    ]
    return colors[rarity] || colors[0]
  }

  const getRarityCardStyling = (rarity: number) => {
    const rarityStyles = [
      {
        border: 'border-gray-300',
        glow: 'shadow-gray-500/20',
        background: 'bg-gradient-to-br from-gray-50 to-gray-100',
        hover: 'hover:shadow-gray-500/30'
      },
      {
        border: 'border-green-300',
        glow: 'shadow-green-500/20',
        background: 'bg-gradient-to-br from-green-50 to-green-100',
        hover: 'hover:shadow-green-500/30'
      },
      {
        border: 'border-blue-300',
        glow: 'shadow-blue-500/20',
        background: 'bg-gradient-to-br from-blue-50 to-blue-100',
        hover: 'hover:shadow-blue-500/30'
      },
      {
        border: 'border-purple-300',
        glow: 'shadow-purple-500/20',
        background: 'bg-gradient-to-br from-purple-50 to-purple-100',
        hover: 'hover:shadow-purple-500/30'
      },
      {
        border: 'border-yellow-300',
        glow: 'shadow-yellow-500/20',
        background: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
        hover: 'hover:shadow-yellow-500/30'
      },
      {
        border: 'border-red-600',
        glow: 'shadow-red-500/30',
        background: 'bg-gradient-to-br from-red-50 to-red-100',
        hover: 'hover:shadow-red-500/40'
      }
    ]
    
    return rarityStyles[rarity] || rarityStyles[0]
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'consumables': return Beaker
      case 'materials': return Package
      case 'collectables': return Star
      case 'equipment': return Shield
      case 'weapons': return Sword
      case 'armor': return Shield
      default: return Zap
    }
  }

  // Filter and sort data
  useEffect(() => {
    let filtered = marketData.filter(item => {
      const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      const matchesRarity = selectedRarity === 'all' || item.rarity === parseInt(selectedRarity)
      const itemPrice = showUsdPrices && ethPrice > 0 ? (item.priceInEth || 0) * ethPrice : (item.priceInEth || 0)
      const matchesPrice = itemPrice >= priceRange.min && itemPrice <= priceRange.max
              const matchesFavorites = !showFavorites || favorites.has(item.GAME_ITEM_ID_CID.toString())
      const matchesAvailable = !showOnlyAvailable || item.available
      const matchesOwner = selectedOwner === 'all' || item.owner === selectedOwner
      
      return matchesSearch && matchesCategory && matchesRarity && matchesPrice && 
             matchesFavorites && matchesAvailable && matchesOwner
    })

    // Sort data
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'price':
          comparison = (a.priceInEth || 0) - (b.priceInEth || 0)
          break
        case 'id':
          comparison = a.GAME_ITEM_ID_CID - b.GAME_ITEM_ID_CID
          break
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'volume':
          comparison = (a.volume || 0) - (b.volume || 0)
          break
        case 'change':
          comparison = (a.priceChange || 0) - (b.priceChange || 0)
          break
        case 'rarity':
          comparison = (a.rarity || 0) - (b.rarity || 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredData(filtered)
  }, [marketData, searchTerm, sortBy, sortOrder, selectedCategory, selectedRarity, priceRange, showFavorites, favorites, showOnlyAvailable, selectedOwner, showUsdPrices, ethPrice])

  const formatPrice = (price: number) => {
    if (price === 0) return 'FREE'
    
    if (showUsdPrices && ethPrice > 0) {
      const usdPrice = price * ethPrice
      if (usdPrice < 0.01) return `$${usdPrice.toFixed(4)}`
      if (usdPrice < 1) return `$${usdPrice.toFixed(3)}`
      if (usdPrice < 100) return `$${usdPrice.toFixed(2)}`
      return `$${Math.round(usdPrice).toLocaleString()}`
    }
    
    // ETH formatting with scientific notation for small values
    if (price < 0.0001) {
      const exponent = Math.floor(Math.log10(price))
      const mantissa = price / Math.pow(10, exponent)
      return `${mantissa.toFixed(2)} × 10^${exponent} ETH`
    }
    
    if (price < 0.001) {
      return `${(price * 1000).toFixed(2)} mETH`
    }
    
    return `${price.toFixed(4)} ETH`
  }

  const getUniqueCategories = () => {
    const categories = new Set(marketData.map(item => item.category).filter(Boolean) as string[])
    return Array.from(categories)
  }

  const getUniqueRarities = () => {
    const rarities = new Set(marketData.map(item => item.rarity).filter(Boolean) as number[])
    return Array.from(rarities)
  }

  const getUniqueOwners = () => {
    const owners = new Set(marketData.map(item => item.owner).filter(Boolean) as string[])
    return Array.from(owners).slice(0, 20) // Limit to first 20 owners
  }

  const toggleFavorite = (itemId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(itemId)) {
      newFavorites.delete(itemId)
    } else {
      newFavorites.add(itemId)
    }
    setFavorites(newFavorites)
  }

  const toggleWatchlist = (itemId: string) => {
    const newWatchlist = new Set(watchlist)
    if (newWatchlist.has(itemId)) {
      newWatchlist.delete(itemId)
    } else {
      newWatchlist.add(itemId)
    }
    setWatchlist(newWatchlist)
  }

  const toggleComparison = (itemId: string) => {
    const newComparison = new Set(comparisonItems)
    if (newComparison.has(itemId)) {
      newComparison.delete(itemId)
    } else if (newComparison.size < 4) { // Limit to 4 items for comparison
      newComparison.add(itemId)
    }
    setComparisonItems(newComparison)
  }

  const setPriceAlert = (itemId: string, price: number) => {
    const newAlerts = new Map(priceAlerts)
    newAlerts.set(itemId, price)
    setPriceAlerts(newAlerts)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return `${Math.floor(diffInDays / 7)}w ago`
  }

  const getPaginatedItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredData.slice(startIndex, endIndex)
  }

  const getTotalPages = () => {
    return Math.ceil(filteredData.length / itemsPerPage)
  }

  // Handle opening the create listing modal
  const handleCreateListing = (item: MarketItem) => {
    setItemToList({
      id: item.GAME_ITEM_ID_CID,
      name: item.name || `Item #${item.GAME_ITEM_ID_CID}`,
      quantity: 1, // Default quantity - could be dynamic based on inventory
      image: item.imageUrl,
      rarity: item.rarity
    })
    setShowCreateListingModal(true)
  }

  // Handle successful listing creation
  const handleListingCreated = (listingData: any) => {
    console.log('Listing created:', listingData)
    // Could add toast notification here
    // Could refresh marketplace data here
    setShowCreateListingModal(false)
    setItemToList(null)
  }

  return (
    <>
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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-black/90 border border-cyan-400/50 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Streamlined Header */}
            <div className="border-b border-cyan-400/20 p-4 bg-cyan-400/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ShoppingCart className="w-6 h-6 text-cyan-400" />
                  <div>
                    <h1 className="text-xl font-bold text-cyan-400 font-mono">
                      GIGAMARKET
                    </h1>
                    <p className="text-cyan-400/70 font-mono text-sm">
                      {filteredData.length} items • Digital Asset Trading
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <WalletConnect className="font-mono text-sm" />
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Streamlined Controls */}
            <div className="p-4 border-b border-cyan-400/20 bg-black/20">
              <div className="flex items-center gap-4 mb-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/60 border border-cyan-400/30 rounded font-mono text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Sort */}
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-')
                    setSortBy(field as any)
                    setSortOrder(order as 'asc' | 'desc')
                  }}
                  className="px-3 py-2 bg-black/60 border border-cyan-400/30 rounded font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="price-desc">Price ↓</option>
                  <option value="price-asc">Price ↑</option>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="rarity-desc">Rarity ↓</option>
                  <option value="rarity-asc">Rarity ↑</option>
                </select>

                {/* View Mode */}
                <div className="flex border border-cyan-400/30 rounded overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 font-mono text-sm ${viewMode === 'grid' ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400 hover:text-cyan-400'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 font-mono text-sm ${viewMode === 'list' ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400 hover:text-cyan-400'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Currency Toggle */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowUsdPrices(!showUsdPrices)}
                    className={`px-3 py-2 rounded border transition-colors font-mono text-sm ${
                      showUsdPrices 
                        ? 'bg-green-400/20 border-green-400/50 text-green-400' 
                        : 'bg-black/60 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10'
                    }`}
                  >
                    {showUsdPrices ? 'USD' : 'ETH'}
                  </button>
                  {ethPrice > 0 && (
                    <span className="text-xs text-gray-400 font-mono">
                      ETH: ${ethPrice.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Filter Tags */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 font-mono">Filters:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2 py-1 bg-black/60 border border-cyan-400/30 rounded font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {getUniqueCategories().map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={selectedRarity}
                  onChange={(e) => setSelectedRarity(e.target.value)}
                  className="px-2 py-1 bg-black/60 border border-cyan-400/30 rounded font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="all">All Rarities</option>
                  {getUniqueRarities().map(rarity => (
                    <option key={rarity} value={rarity}>{rarity}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-black/40 border border-gray-600 rounded"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-mono text-gray-400 mb-2">
                      Price Range ({showUsdPrices ? 'USD' : 'ETH'})
                      {showUsdPrices && ethPrice > 0 && (
                        <span className="ml-2 text-xs text-cyan-400">
                          (ETH: ${ethPrice.toFixed(0)})
                        </span>
                      )}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        placeholder={showUsdPrices ? "Min USD" : "Min ETH"}
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({...priceRange, min: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-black/60 border border-gray-600 rounded font-mono text-sm text-white focus:border-purple-400 focus:outline-none"
                        step={showUsdPrices ? "1" : "0.0001"}
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number"
                        placeholder={showUsdPrices ? "Max USD" : "Max ETH"}
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({...priceRange, max: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-black/60 border border-gray-600 rounded font-mono text-sm text-white focus:border-purple-400 focus:outline-none"
                        step={showUsdPrices ? "1" : "0.0001"}
                      />
                    </div>
                  </div>

                  {/* Owner Filter */}
                  <div>
                    <label className="block text-sm font-mono text-gray-400 mb-2">Owner</label>
                    <select
                      value={selectedOwner}
                      onChange={(e) => setSelectedOwner(e.target.value)}
                      className="w-full px-3 py-2 bg-black/60 border border-gray-600 rounded font-mono text-sm text-white focus:border-purple-400 focus:outline-none"
                    >
                      <option value="all">All Owners</option>
                      {getUniqueOwners().map(owner => (
                        <option key={owner} value={owner}>
                          {owner}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reset Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setSelectedCategory('all')
                        setSelectedRarity('all')
                        setPriceRange({ min: 0, max: 10 })
                        setSelectedOwner('all')
                        setShowFavorites(false)
                        setShowOnlyAvailable(false)
                        setSortBy('price')
                        setSortOrder('desc')
                      }}
                      className="w-full px-4 py-2 bg-red-400/20 border border-red-400/50 rounded font-mono text-sm text-red-400 hover:bg-red-400/30 transition-colors"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Market Items Grid */}
            <div className="p-6 max-h-[calc(90vh-300px)] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 border-4 border-purple-400/30 border-t-purple-400 rounded-full mx-auto mb-4"
                    />
                    <p className="text-purple-400 font-mono">LOADING LIVE MARKET DATA...</p>
                  </div>
                </div>
              ) : (
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
                  : "space-y-4"
                }>
                  {getPaginatedItems().map((item, index) => {
                    const CategoryIcon = getCategoryIcon(item.category || 'other')
                    const rarityStyle = getRarityCardStyling(item.rarity || 0)
                    
                    return (
                      <motion.div
                        key={item.GAME_ITEM_ID_CID}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        whileHover={{ scale: 1.03, y: -5 }}
                        className={`relative overflow-hidden rounded-xl cursor-pointer group transition-all duration-300 ${
                          viewMode === 'grid' ? 'p-5' : 'p-4 flex items-center space-x-4'
                        } ${!item.available ? 'opacity-60' : ''} ${
                          comparisonItems.has(item.GAME_ITEM_ID_CID.toString()) ? 'ring-2 ring-blue-400' : ''
                        } ${rarityStyle.border} ${rarityStyle.glow}`}
                        onClick={() => {
                          setSelectedItem(item)
                          setShowItemModal(true)
                        }}
                      >
                        {/* Subtle animated background overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Rarity corner accent */}
                        <div className={`absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-${rarityStyle.border.replace('border-', '')}/60`} />
                        
                        {viewMode === 'grid' ? (
                          <>
                            {/* Grid View - Enhanced Design */}
                            {/* Item Header with better styling */}
                            <div className="relative z-10 flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-2">
                                <div className={`p-1.5 rounded-lg bg-${rarityStyle.background} border border-${rarityStyle.border}`}>
                                  <CategoryIcon className={`w-3.5 h-3.5 text-${rarityStyle.border.replace('border-', '')}`} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-mono text-gray-300">#{item.GAME_ITEM_ID_CID}</span>
                                  <span className="text-xs font-mono text-gray-500">{item.type}</span>
                                </div>
                                {!item.available && (
                                  <span className="px-2 py-0.5 text-xs font-mono text-red-400 bg-red-400/20 border border-red-400/40 rounded">
                                    SOLD
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleFavorite(item.GAME_ITEM_ID_CID.toString())
                                  }}
                                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                                    favorites.has(item.GAME_ITEM_ID_CID.toString()) 
                                      ? 'text-red-400 bg-red-400/20 border border-red-400/40 hover:scale-110' 
                                      : 'text-gray-400 bg-gray-400/10 border border-gray-400/30 hover:text-red-400 hover:bg-red-400/10 hover:scale-110'
                                  }`}
                                >
                                  <Heart className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Rarity Badge - Prominent */}
                                                         <div className={`inline-flex items-center px-3 py-1.5 mb-4 bg-${rarityStyle.background} border border-${rarityStyle.border}/50 rounded-lg text-${rarityStyle.border.replace('border-', '')} font-mono text-xs font-bold`}>
                               <div className={`w-2 h-2 bg-${rarityStyle.border.replace('border-', '')} rounded-full mr-2 animate-pulse`} />
                               {(item.rarityName || getRarityName(item.rarity || 0) || 'COMMON').toUpperCase()}
                             </div>

                            {/* Item Image - Enhanced Container */}
                            <div className={`relative w-full h-16 mb-3 flex items-center justify-center bg-black/30 border border-${rarityStyle.border}/30 rounded-lg overflow-hidden group-hover:border-${rarityStyle.border}/50 transition-all duration-300`}>
                              <ItemTooltip itemId={item.GAME_ITEM_ID_CID} position="right">
                                <ItemIcon 
                                  itemId={item.GAME_ITEM_ID_CID}
                                  size="large"
                                  showRarity={true}
                                  className="group-hover:scale-110 transition-transform duration-300"
                                />
                              </ItemTooltip>
                              {/* Subtle glow effect */}
                              <div className={`absolute inset-0 bg-gradient-to-t from-${rarityStyle.border.replace('border-', '')}/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                            </div>

                            {/* Item Name - Enhanced Typography */}
                            <h4 className={`font-bold font-mono text-white mb-2 text-${rarityStyle.border.replace('border-', '')} group-hover:text-${rarityStyle.border.replace('border-', '')} transition-colors text-sm leading-tight`}>
                              {item.name}
                            </h4>



                            {/* Price Section - Enhanced Design */}
                            <div className="mb-4">
                              <div className="flex items-center justify-center mb-2">
                                <div className={`flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 border border-yellow-400/50 rounded-lg`}>
                                  <Coins className="w-4 h-4 text-yellow-400" />
                                  <span className="font-mono text-yellow-400 font-bold text-lg">
                                    {formatPrice(item.priceInEth || 0)}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Market Stats */}
                              <div className="flex items-center justify-between text-xs">
                                {item.priceChange !== undefined && (
                                  <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                                    item.priceChange >= 0 ? 'text-green-400 bg-green-400/20' : 'text-red-400 bg-red-400/20'
                                  }`}>
                                    {item.priceChange >= 0 ? (
                                      <TrendingUp className="w-3 h-3" />
                                    ) : (
                                      <TrendingDown className="w-3 h-3" />
                                    )}
                                    <span className="font-mono font-semibold">
                                      {item.priceChange >= 0 ? '+' : ''}{item.priceChange.toFixed(1)}%
                                    </span>
                                  </div>
                                )}
                                <span className="font-mono text-gray-400">
                                  Vol: {item.volume}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons - Enhanced Design */}
                            <div className="grid grid-cols-2 gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedItem(item)
                                  setShowItemModal(true)
                                }}
                                className={`flex items-center justify-center px-3 py-2 bg-${rarityStyle.border.replace('border-', '')}/20 border border-${rarityStyle.border}/50 rounded-lg font-mono text-xs text-${rarityStyle.border.replace('border-', '')} hover:bg-${rarityStyle.border.replace('border-', '')}/30 hover:scale-105 transition-all duration-200`}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                VIEW
                              </button>
                              <div className="flex space-x-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleComparison(item.GAME_ITEM_ID_CID.toString())
                                  }}
                                  className={`flex-1 p-2 rounded-lg font-mono text-xs transition-all duration-200 hover:scale-105 ${
                                    comparisonItems.has(item.GAME_ITEM_ID_CID.toString())
                                      ? 'bg-blue-400/30 border border-blue-400/50 text-blue-400'
                                      : 'bg-gray-400/20 border border-gray-400/50 text-gray-400 hover:bg-gray-400/30'
                                  }`}
                                >
                                  <BarChart3 className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleWatchlist(item.GAME_ITEM_ID_CID.toString())
                                  }}
                                  className={`flex-1 p-2 rounded-lg font-mono text-xs transition-all duration-200 hover:scale-105 ${
                                    watchlist.has(item.GAME_ITEM_ID_CID.toString())
                                      ? 'bg-yellow-400/30 border border-yellow-400/50 text-yellow-400'
                                      : 'bg-gray-400/20 border border-gray-400/50 text-gray-400 hover:bg-gray-400/30'
                                  }`}
                                >
                                  <Bell className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex flex-col space-y-2 mt-2">
                              {item.available && (
                                <button className="w-full px-3 py-2 bg-gradient-to-r from-green-400/20 to-emerald-400/20 border border-green-400/50 rounded-lg font-mono text-sm text-green-400 hover:bg-gradient-to-r hover:from-green-400/30 hover:to-emerald-400/30 hover:scale-105 transition-all duration-200">
                                  <ShoppingCart className="w-4 h-4 inline mr-2" />
                                  BUY NOW
                                </button>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCreateListing(item)
                                }}
                                className="w-full px-3 py-2 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 border border-cyan-400/50 rounded-lg font-mono text-sm text-cyan-400 hover:bg-gradient-to-r hover:from-cyan-400/30 hover:to-blue-400/30 hover:scale-105 transition-all duration-200"
                              >
                                <Plus className="w-4 h-4 inline mr-2" />
                                CREATE LISTING
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* List View */}
                            <div className="flex-shrink-0">
                              <ItemTooltip itemId={item.GAME_ITEM_ID_CID} position="right">
                                <ItemIcon 
                                  itemId={item.GAME_ITEM_ID_CID}
                                  size="medium"
                                  showRarity={true}
                                  className="w-16 h-16"
                                />
                              </ItemTooltip>
                            </div>

                            <div className="flex-grow min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-bold font-mono text-white group-hover:text-purple-400 transition-colors text-lg">
                                    {item.name}
                                  </h4>
                                  <div className="flex items-center space-x-4 mt-1">
                                    <span className="text-sm font-mono text-gray-400">#{item.GAME_ITEM_ID_CID}</span>
                                    <span className={`px-2 py-1 text-xs font-mono border rounded ${rarityStyle.border}`}>
                                      {(item.rarityName || getRarityName(item.rarity || 0) || 'COMMON').toUpperCase()}
                                    </span>
                                    <span className="text-sm font-mono text-gray-500">{item.type}</span>
                                    {!item.available && (
                                      <span className="text-sm font-mono text-red-400">SOLD OUT</span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-gray-400 font-mono mt-2 line-clamp-2">
                                      {item.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center space-x-6">
                                  {/* Price */}
                                  <div className="text-right">
                                    <div className="flex items-center space-x-2">
                                      <Coins className="w-5 h-5 text-yellow-400" />
                                      <span className="font-mono text-yellow-400 font-bold text-lg">
                                        {formatPrice(item.priceInEth || 0)}
                                      </span>
                                    </div>
                                    {item.priceChange !== undefined && (
                                      <div className={`flex items-center justify-end space-x-1 mt-1 ${
                                        item.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                                      }`}>
                                        {item.priceChange >= 0 ? (
                                          <TrendingUp className="w-3 h-3" />
                                        ) : (
                                          <TrendingDown className="w-3 h-3" />
                                        )}
                                        <span className="text-sm font-mono">
                                          {item.priceChange >= 0 ? '+' : ''}{item.priceChange.toFixed(1)}%
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleFavorite(item.GAME_ITEM_ID_CID.toString())
                                      }}
                                      className={`p-2 rounded transition-colors ${
                                        favorites.has(item.GAME_ITEM_ID_CID.toString()) 
                                          ? 'text-red-400 hover:text-red-300' 
                                          : 'text-gray-400 hover:text-red-400'
                                      }`}
                                    >
                                      <Heart className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleComparison(item.GAME_ITEM_ID_CID.toString())
                                      }}
                                      className={`p-2 rounded transition-colors ${
                                        comparisonItems.has(item.GAME_ITEM_ID_CID.toString())
                                          ? 'bg-blue-400/30 text-blue-400'
                                          : 'text-gray-400 hover:text-blue-400'
                                      }`}
                                    >
                                      <BarChart3 className="w-4 h-4" />
                                    </button>
                                    {item.available && (
                                      <button className="px-4 py-2 bg-green-400/20 border border-green-400/50 rounded font-mono text-sm text-green-400 hover:bg-green-400/30 transition-colors">
                                        <ShoppingCart className="w-4 h-4 inline mr-2" />
                                        BUY NOW
                                      </button>
                                    )}
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleCreateListing(item)
                                      }}
                                      className="px-4 py-2 bg-cyan-400/20 border border-cyan-400/50 rounded font-mono text-sm text-cyan-400 hover:bg-cyan-400/30 transition-colors"
                                    >
                                      <Plus className="w-4 h-4 inline mr-2" />
                                      CREATE LISTING
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {getTotalPages() > 1 && (
              <div className="border-t border-purple-400/20 p-4 bg-black/40">
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center space-x-2 px-4 py-2 bg-black/60 border border-gray-600 rounded font-mono text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(getTotalPages() - 4, currentPage - 2)) + i
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded font-mono text-sm transition-colors ${
                            currentPage === pageNum
                              ? 'bg-purple-400/30 border border-purple-400/50 text-purple-400'
                              : 'bg-black/60 border border-gray-600 text-gray-400 hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                    disabled={currentPage === getTotalPages()}
                    className="flex items-center space-x-2 px-4 py-2 bg-black/60 border border-gray-600 rounded font-mono text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Footer Stats */}
            <div className="border-t border-purple-400/20 p-4 bg-black/40">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-mono">
                {/* Left Stats */}
                <div className="space-y-2">
                  <div className="text-gray-400">
                    Showing {getPaginatedItems().length} of {filteredData.length} items
                  </div>
                  <div className="text-gray-400">
                    Page {currentPage} of {getTotalPages()}
                  </div>
                  <div className="text-gray-400">
                    {marketData.length} total items in database
                  </div>
                </div>

                {/* Center Stats */}
                <div className="space-y-2">
                  <div className="text-purple-400">
                    Total Volume: {formatPrice(filteredData.reduce((sum, item) => sum + (item.priceInEth || 0), 0))}
                  </div>
                  <div className="text-blue-400">
                    Avg Price: {filteredData.length > 0 ? formatPrice(filteredData.reduce((sum, item) => sum + (item.priceInEth || 0), 0) / filteredData.length) : 'N/A'}
                  </div>
                  <div className="text-green-400">
                    Available: {filteredData.filter(item => item.available).length} items
                  </div>
                </div>

                {/* Right Stats */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span className="text-red-400">Favorites: {favorites.size}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400">Watchlist: {watchlist.size}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-green-400">LIVE MARKET DATA</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Item Detail Modal */}
      {showItemModal && selectedItem && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-60 flex items-center justify-center p-4"
          onClick={() => setShowItemModal(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-black/95 border-2 border-purple-400/50 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              clipPath: 'polygon(20px 0%, 100% 0%, calc(100% - 20px) 100%, 0% 100%)'
            }}
          >
            {/* Modal Header */}
            <div className="border-b border-purple-400/30 p-6 bg-gradient-to-r from-purple-400/10 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <ItemIcon 
                    itemId={selectedItem.GAME_ITEM_ID_CID}
                    size="large"
                    showRarity={true}
                    className="w-16 h-16"
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-white font-mono">
                      {selectedItem.name}
                    </h2>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-gray-400 font-mono">#{selectedItem.GAME_ITEM_ID_CID}</span>
                      <span className={`px-2 py-1 text-xs font-mono border rounded ${getRarityCardStyling(selectedItem.rarity || 0).border}`}>
                        {(selectedItem.rarityName || getRarityName(selectedItem.rarity || 0) || 'COMMON').toUpperCase()}
                      </span>
                      <span className="text-gray-500 font-mono">{selectedItem.type}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowItemModal(false)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Details */}
                <div className="space-y-6">
                  {/* Description */}
                  {selectedItem.description && (
                    <div>
                      <h3 className="text-lg font-bold text-purple-400 font-mono mb-2">DESCRIPTION</h3>
                      <p className="text-gray-300 font-mono text-sm leading-relaxed">
                        {selectedItem.description}
                      </p>
                    </div>
                  )}

                  {/* Stats */}
                  {selectedItem.stats && (
                    <div>
                      <h3 className="text-lg font-bold text-purple-400 font-mono mb-4">STATS</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 border border-red-400/30 rounded p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <Sword className="w-5 h-5 text-red-400" />
                            <span className="text-red-400 font-mono text-sm">ATTACK</span>
                          </div>
                          <div className="text-2xl font-bold text-white font-mono">
                            {selectedItem.stats.attack}
                          </div>
                        </div>
                        <div className="bg-black/40 border border-blue-400/30 rounded p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <Shield className="w-5 h-5 text-blue-400" />
                            <span className="text-blue-400 font-mono text-sm">DEFENSE</span>
                          </div>
                          <div className="text-2xl font-bold text-white font-mono">
                            {selectedItem.stats.defense}
                          </div>
                        </div>
                        <div className="bg-black/40 border border-yellow-400/30 rounded p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            <span className="text-yellow-400 font-mono text-sm">SPEED</span>
                          </div>
                          <div className="text-2xl font-bold text-white font-mono">
                            {selectedItem.stats.speed}
                          </div>
                        </div>
                        <div className="bg-black/40 border border-purple-400/30 rounded p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                            <span className="text-purple-400 font-mono text-sm">MAGIC</span>
                          </div>
                          <div className="text-2xl font-bold text-white font-mono">
                            {selectedItem.stats.magic}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Attributes */}
                  {selectedItem.attributes && selectedItem.attributes.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-purple-400 font-mono mb-2">ATTRIBUTES</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.attributes.map((attr, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 bg-gray-400/20 border border-gray-400/50 rounded font-mono text-sm text-gray-300"
                          >
                            {attr}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Market Data */}
                <div className="space-y-6">
                  {/* Price Info */}
                  <div>
                    <h3 className="text-lg font-bold text-purple-400 font-mono mb-4">MARKET DATA</h3>
                    <div className="bg-black/40 border border-yellow-400/30 rounded p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 font-mono text-sm">CURRENT PRICE</span>
                        <div className="flex items-center space-x-2">
                          <Coins className="w-5 h-5 text-yellow-400" />
                          <span className="text-2xl font-bold text-yellow-400 font-mono">
                            {formatPrice(selectedItem.priceInEth || 0)}
                          </span>
                        </div>
                      </div>
                      {selectedItem.priceChange !== undefined && (
                        <div className={`flex items-center justify-end space-x-1 ${
                          selectedItem.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {selectedItem.priceChange >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="font-mono">
                            {selectedItem.priceChange >= 0 ? '+' : ''}{selectedItem.priceChange.toFixed(1)}% (24h)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/40 border border-gray-600 rounded p-3">
                        <div className="text-gray-400 font-mono text-xs mb-1">FLOOR PRICE</div>
                        <div className="text-white font-mono font-bold">
                          {formatPrice(selectedItem.floorPrice || 0)}
                        </div>
                      </div>
                      <div className="bg-black/40 border border-gray-600 rounded p-3">
                        <div className="text-gray-400 font-mono text-xs mb-1">AVG PRICE</div>
                        <div className="text-white font-mono font-bold">
                          {formatPrice(selectedItem.avgPrice || 0)}
                        </div>
                      </div>
                      <div className="bg-black/40 border border-gray-600 rounded p-3">
                        <div className="text-gray-400 font-mono text-xs mb-1">VOLUME (24H)</div>
                        <div className="text-white font-mono font-bold">
                          {formatPrice(selectedItem.tradingVolume24h || 0)}
                        </div>
                      </div>
                      <div className="bg-black/40 border border-gray-600 rounded p-3">
                        <div className="text-gray-400 font-mono text-xs mb-1">HOLDERS</div>
                        <div className="text-white font-mono font-bold">
                          {selectedItem.holders}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Listing Info */}
                  <div>
                    <h3 className="text-lg font-bold text-purple-400 font-mono mb-2">LISTING INFO</h3>
                    <div className="space-y-2 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Owner:</span>
                        <span className="text-white">{selectedItem.owner}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Listed:</span>
                        <span className="text-white">
                          {selectedItem.listingTime ? formatTimeAgo(selectedItem.listingTime) : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={selectedItem.available ? 'text-green-400' : 'text-red-400'}>
                          {selectedItem.available ? 'AVAILABLE' : 'SOLD OUT'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Supply:</span>
                        <span className="text-white">{selectedItem.totalSupply}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => toggleFavorite(selectedItem.GAME_ITEM_ID_CID.toString())}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded font-mono text-sm transition-colors ${
                          favorites.has(selectedItem.GAME_ITEM_ID_CID.toString())
                            ? 'bg-red-400/30 border border-red-400/50 text-red-400'
                            : 'bg-black/60 border border-gray-600 text-gray-400 hover:text-red-400'
                        }`}
                      >
                        <Heart className="w-4 h-4" />
                        <span>{favorites.has(selectedItem.GAME_ITEM_ID_CID.toString()) ? 'FAVORITED' : 'FAVORITE'}</span>
                      </button>
                      <button
                        onClick={() => toggleWatchlist(selectedItem.GAME_ITEM_ID_CID.toString())}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded font-mono text-sm transition-colors ${
                          watchlist.has(selectedItem.GAME_ITEM_ID_CID.toString())
                            ? 'bg-yellow-400/30 border border-yellow-400/50 text-yellow-400'
                            : 'bg-black/60 border border-gray-600 text-gray-400 hover:text-yellow-400'
                        }`}
                      >
                        <Bell className="w-4 h-4" />
                        <span>WATCH</span>
                      </button>
                    </div>
                    
                    {selectedItem.available && (
                      <button className="w-full px-6 py-4 bg-green-400/20 border border-green-400/50 rounded font-mono text-lg text-green-400 hover:bg-green-400/30 transition-colors">
                        <ShoppingCart className="w-5 h-5 inline mr-2" />
                        BUY NOW FOR {formatPrice(selectedItem.priceInEth || 0)}
                      </button>
                    )}
                    
                    <div className="grid grid-cols-3 gap-2">
                      <button className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-400/20 border border-blue-400/50 rounded font-mono text-xs text-blue-400 hover:bg-blue-400/30 transition-colors">
                        <Share className="w-3 h-3" />
                        <span>SHARE</span>
                      </button>
                      <button className="flex items-center justify-center space-x-1 px-3 py-2 bg-purple-400/20 border border-purple-400/50 rounded font-mono text-xs text-purple-400 hover:bg-purple-400/30 transition-colors">
                        <ExternalLink className="w-3 h-3" />
                        <span>VIEW</span>
                      </button>
                      <button className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-400/20 border border-gray-400/50 rounded font-mono text-xs text-gray-400 hover:bg-gray-400/30 transition-colors">
                        <Copy className="w-3 h-3" />
                        <span>COPY</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Create Listing Modal */}
    {showCreateListingModal && itemToList && (
      <CreateListingModal
        isOpen={showCreateListingModal}
        onClose={() => {
          setShowCreateListingModal(false)
          setItemToList(null)
        }}
        item={itemToList}
        onListingCreated={handleListingCreated}
      />
    )}
    </>
  )
}

export default Gigamarket