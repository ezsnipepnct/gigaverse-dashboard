'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Package, 
  Search,
  Sword,
  Shield,
  Beaker,
  Gem,
  Wrench,
  Scroll,
  Zap,
  Star,
  AlertCircle,
  CheckCircle,
  Filter,
  RefreshCw,
  Maximize2,
  Minimize2
} from 'lucide-react'
import ItemCard from './ItemCard'
import ItemIcon from './ItemIcon'
import ItemTooltip from './ItemTooltip'
import { itemMetadataService } from '../services/itemMetadata'
import { agwAuthService } from '@/lib/agw-auth'
import { marketPriceService } from '../services/marketPrices'

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  playerBalances: Record<string, number>
  onRefreshBalances: () => void
  balancesLoading: boolean
}

interface InventoryItem {
  id: string
  name: string
  quantity: number
  category: string
  rarity: number
  description?: string
  usedInRecipes?: string[]
  canCraft?: boolean
  soulbound?: boolean
}

const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"

// JWT Token management
const getJWTToken = () => {
  if (typeof window !== 'undefined') {
    return agwAuthService.getJWT() || ''
  }
  return ''
}

const InventoryModal: React.FC<InventoryModalProps> = ({ 
  isOpen, 
  onClose, 
  playerBalances, 
  onRefreshBalances, 
  balancesLoading 
}) => {
  const [gameItems, setGameItems] = useState<any[]>([])
  const [recipes, setRecipes] = useState<any[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'rarity'>('rarity')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [windowWidth, setWindowWidth] = useState(0)
  const [floorPriceMap, setFloorPriceMap] = useState<Record<string, number>>({})
  const [ethUsd, setEthUsd] = useState<number>(0)
  const [showUsdPrices, setShowUsdPrices] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(true)

  useEffect(() => {
    setMounted(true)
    
    // Set initial window width
    setWindowWidth(window.innerWidth)
    
    // Listen for window resize
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch game items and recipes for context
  useEffect(() => {
    if (isOpen) {
      fetchGameData()
      // Fetch market floor prices and ETH price (cached)
      ;(async () => {
        try {
          const [floors, eth] = await Promise.all([
            marketPriceService.getFloorMap(),
            marketPriceService.getEthUsd()
          ])
          setFloorPriceMap(floors)
          setEthUsd(eth)
        } catch (err) {
          console.error('Failed to load market data for inventory:', err)
        }
      })()
    }
  }, [isOpen])

  // Load inventory items when game data or player balances change
  useEffect(() => {
    if (gameItems.length > 0 && Object.keys(playerBalances).length > 0) {
      loadInventoryItems()
    }
  }, [gameItems, recipes, playerBalances])

  const loadInventoryItems = async () => {
    try {
      setLoading(true)
      const items = await getInventoryItems()
      setInventoryItems(items)
    } catch (error) {
      console.error('Failed to load inventory items:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGameData = async () => {
    try {
      setLoading(true)
      
      // Fetch game items for names and details
      const itemsResponse = await fetch('https://gigaverse.io/api/indexer/gameitems')
      const itemsData = await itemsResponse.json()
      setGameItems(itemsData.entities || [])

      // Fetch recipes to understand crafting relationships
      const jwtToken = getJWTToken()
      if (jwtToken) {
        const recipesResponse = await fetch(`https://gigaverse.io/api/offchain/recipes/player/${WALLET_ADDRESS}`)
        const recipesData = await recipesResponse.json()
        setRecipes(recipesData.entities || [])
      }
    } catch (error) {
      console.error('Failed to fetch game data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Transform player balances into inventory items with enhanced metadata support
  const getInventoryItems = async (): Promise<InventoryItem[]> => {
    const items: InventoryItem[] = []
    
    for (const [itemId, quantity] of Object.entries(playerBalances)) {
      if (quantity > 0) {
        const gameItem = gameItems.find(item => item.docId === itemId)
        const itemName = gameItem?.NAME_CID || `Item #${itemId}`
        
        // Enhanced categorization - these will be supplemented by real metadata
        let category = 'Materials'
        if (itemName.toLowerCase().includes('potion') || itemName.toLowerCase().includes('juice')) {
          category = 'Consumables'
        } else if (itemName.toLowerCase().includes('sword') || itemName.toLowerCase().includes('blade')) {
          category = 'Weapons'
        } else if (itemName.toLowerCase().includes('shield') || itemName.toLowerCase().includes('armor')) {
          category = 'Armor'
        } else if (itemName.toLowerCase().includes('crystal') || itemName.toLowerCase().includes('gem')) {
          category = 'Gems'
        } else if (itemName.toLowerCase().includes('scroll') || itemName.toLowerCase().includes('book')) {
          category = 'Scrolls'
        }

        // Basic rarity fallback (will be overridden by real metadata)
        let rarity = 0
        let soulbound = false
        let description = gameItem?.DESCRIPTION_CID || `A valuable ${category.toLowerCase().slice(0, -1)}`
        
        // Fetch real metadata from the service
        try {
          const metadata = await itemMetadataService.getItem(parseInt(itemId))
          if (metadata) {
            rarity = metadata.rarity
            soulbound = metadata.soulbound
            description = metadata.description || description
            category = metadata.category || category
          }
        } catch (error) {
          console.warn(`Failed to fetch metadata for item ${itemId}:`, error)
          // Use fallback values
          if (quantity >= 10000) {
            rarity = 0 // Common
          } else if (quantity >= 2000) {
            rarity = 1 // Uncommon
          } else if (quantity >= 500) {
            rarity = 2 // Rare
          } else if (quantity >= 100) {
            rarity = 3 // Epic
          } else if (quantity >= 20) {
            rarity = 4 // Legendary
          } else {
            rarity = 0 // Common
          }
        }

        // Check if used in recipes
        const usedInRecipes = recipes.filter(recipe => 
          recipe.INPUT_ID_CID_array?.includes(parseInt(itemId))
        ).map(recipe => recipe.NAME_CID || `Recipe #${recipe.docId}`)

        items.push({
          id: itemId,
          name: itemName,
          quantity,
          category,
          rarity,
          description,
          usedInRecipes,
          canCraft: usedInRecipes.length > 0,
          soulbound
        })
      }
    }

    return items
  }

  // Get unique categories for dropdown
  const getUniqueCategories = () => {
    const categories = new Set(inventoryItems.map(item => item.category))
    return Array.from(categories)
  }

  // Get filter options including soulbound
  const getFilterOptions = () => {
    const categories = getUniqueCategories()
    const options = [
      { value: 'all', label: 'All Categories' },
      ...categories.map(cat => ({ value: cat, label: cat })),
      { value: 'soulbound', label: 'Soulbound Items' },
      { value: 'tradeable', label: 'Tradeable Items' }
    ]
    return options
  }

  // Filter and sort items
  const filteredItems = inventoryItems
    .filter(item => {
      let matchesCategory = true
      
      if (selectedCategory === 'soulbound') {
        matchesCategory = item.soulbound === true
      } else if (selectedCategory === 'tradeable') {
        matchesCategory = item.soulbound === false
      } else if (selectedCategory !== 'all') {
        matchesCategory = item.category === selectedCategory
      }
      
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'quantity':
          comparison = a.quantity - b.quantity
          break
        case 'rarity':
          comparison = a.rarity - b.rarity
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const getTotalValue = () => {
    return inventoryItems.reduce((total, item) => total + item.quantity, 0)
  }

  const getEstimatedValueEth = () => {
    return inventoryItems.reduce((sum, item) => {
      const floor = floorPriceMap[item.id] || 0
      if (floor > 0) {
        return sum + floor * item.quantity
      }
      return sum
    }, 0)
  }

  const formatPrice = (priceEth: number) => {
    if (!priceEth || priceEth <= 0) return 'N/A'
    if (showUsdPrices && ethUsd > 0) {
      const usd = priceEth * ethUsd
      if (usd < 0.01) return `$${usd.toFixed(4)}`
      if (usd < 1) return `$${usd.toFixed(3)}`
      if (usd < 100) return `$${usd.toFixed(2)}`
      return `$${Math.round(usd).toLocaleString()}`
    }
    if (priceEth < 0.0001) {
      const exponent = Math.floor(Math.log10(priceEth))
      const mantissa = priceEth / Math.pow(10, exponent)
      return `${mantissa.toFixed(2)} × 10^${exponent} ETH`
    }
    if (priceEth < 0.001) return `${(priceEth * 1000).toFixed(2)} mETH`
    return `${priceEth.toFixed(4)} ETH`
  }

  // Calculate grid columns based on window width (matching Tailwind responsive classes)
  const getGridColumns = () => {
    if (windowWidth >= 1280) return 8      // xl:grid-cols-8
    if (windowWidth >= 1024) return 7      // lg:grid-cols-7
    if (windowWidth >= 768) return 6       // md:grid-cols-6
    if (windowWidth >= 640) return 5       // sm:grid-cols-5
    return 4                               // grid-cols-4
  }

  // Calculate tooltip position based on item index in grid
  const getTooltipPosition = (index: number) => {
    const columns = getGridColumns()
    const row = Math.floor(index / columns) + 1  // Row number (1-based)
    
    // Use 'bottom' position for items in top 2 rows to avoid cutoff
    return row <= 2 ? 'bottom' : 'top'
  }

  if (!mounted || !isOpen) return null

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
          className={`bg-gradient-to-br from-gray-900/95 to-black/95 border-2 border-cyan-400/50 rounded-xl ${
            isFullscreen ? 'w-[96vw] max-w-[96vw] h-[96vh] max-h-[96vh]' : 'max-w-5xl w-full max-h-[95vh]'
          } mx-4 backdrop-blur-md overflow-hidden shadow-2xl shadow-cyan-400/10`}
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.03) 0%, transparent 50%)`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Enhanced Style */}
          <div className="border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center justify-center w-12 h-12 bg-cyan-400/20 rounded-full"
                >
                  <Package className="w-6 h-6 text-cyan-400" />
                </motion.div>
                <div>
                  <h2 className="text-3xl font-bold font-mono text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-1 tracking-wide">INVENTORY</h2>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className="bg-black/40 border border-cyan-400/30 rounded px-3 py-2">
                      <div className="text-xs text-gray-400 font-mono">Items</div>
                      <div className="text-cyan-400 font-mono font-bold">{inventoryItems.length}</div>
                    </div>
                    <div className="bg-black/40 border border-cyan-400/30 rounded px-3 py-2">
                      <div className="text-xs text-gray-400 font-mono">Total Qty</div>
                      <div className="text-cyan-400 font-mono font-bold">{getTotalValue().toLocaleString()}</div>
                    </div>
                    <div className="bg-black/40 border border-yellow-400/30 rounded px-3 py-2">
                      <div className="text-xs text-gray-400 font-mono">Est. Value</div>
                      <div className="text-yellow-400 font-mono font-bold">{formatPrice(getEstimatedValueEth())}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Currency toggle */}
                <button
                  onClick={() => setShowUsdPrices(!showUsdPrices)}
                  className={`px-3 py-2 rounded border transition-colors font-mono text-xs ${
                    showUsdPrices 
                      ? 'bg-green-400/20 border-green-400/50 text-green-400' 
                      : 'bg-black/40 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10'
                  }`}
                  title="Toggle currency"
                >
                  {showUsdPrices ? 'USD' : 'ETH'}
                </button>
                {ethUsd > 0 && (
                  <span className="text-xs text-gray-400 font-mono">ETH: ${ethUsd.toFixed(0)}</span>
                )}
                {/* Fullscreen toggle */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-3 text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all duration-200 border border-transparent hover:border-cyan-400/30"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={onRefreshBalances}
                  disabled={balancesLoading}
                  className="p-3 text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all duration-200 border border-transparent hover:border-cyan-400/30"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-5 h-5 ${balancesLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-3 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200 border border-transparent hover:border-red-400/30"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search and Filter - Match CraftingStation Style */}
            <div className="flex items-center space-x-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-cyan-400/20 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none transition-colors font-mono text-sm"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-gray-900/50 border border-cyan-400/20 rounded-lg text-white focus:border-cyan-400 focus:outline-none transition-colors font-mono text-sm"
              >
                {getFilterOptions().map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-')
                  setSortBy(field as 'name' | 'quantity' | 'rarity')
                  setSortOrder(order as 'asc' | 'desc')
                }}
                className="px-4 py-2 bg-gray-900/50 border border-cyan-400/20 rounded-lg text-white focus:border-cyan-400 focus:outline-none transition-colors font-mono text-sm"
              >
                <option value="rarity-desc">Rarity ↓</option>
                <option value="rarity-asc">Rarity ↑</option>
                <option value="quantity-desc">Quantity ↓</option>
                <option value="quantity-asc">Quantity ↑</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
          </div>

          {/* Main Content - Grid View Only */}
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-220px)]">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-16 h-16 border-3 border-cyan-400/20 border-t-cyan-400 rounded-full mx-auto mb-4 shadow-lg"
                  />
                  <p className="text-cyan-400 font-mono text-lg font-semibold tracking-wide">LOADING INVENTORY...</p>
                  <p className="text-gray-500 font-mono text-sm mt-2">Fetching your items</p>
                </div>
              </div>
            ) : (
              <>
                {filteredItems.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-12 gap-4">
                    {filteredItems.map((item, index) => (
                      <ItemTooltip
                        key={item.id}
                        itemId={parseInt(item.id)}
                        position={getTooltipPosition(index) as 'top' | 'bottom'}
                        floorPriceEth={floorPriceMap[item.id]}
                        showUsdPrice={showUsdPrices}
                        ethUsd={ethUsd}
                      >
                        <div className="group">
                          {/* Item Card Container */}
                          <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3 hover:bg-gray-800/60 hover:border-cyan-400/40 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-400/10">
                            {/* Icon Container */}
                            <div className="relative flex justify-center mb-2">
                              <ItemIcon
                                itemId={parseInt(item.id)}
                                size="large"
                                showRarity
                                onClick={(itemMetadata) => {
                                  if (itemMetadata) {
                                    console.log('Item clicked:', itemMetadata)
                                  }
                                }}
                                className="transition-transform duration-200 group-hover:scale-110"
                              />
                              {/* Crafting indicator */}
                              {item.canCraft && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-gray-800 shadow-sm" />
                              )}
                            </div>
                            
                            {/* Quantity Badge */}
                            <div className="flex justify-center">
                              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 min-w-[24px] text-center shadow-sm">
                                {item.quantity > 999 ? `${Math.floor(item.quantity / 1000)}k` : item.quantity}
                              </div>
                            </div>
                          </div>
                        </div>
                      </ItemTooltip>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="bg-gray-800/30 rounded-full p-6 w-24 h-24 mx-auto mb-6 border border-gray-700/50">
                      <Package className="w-12 h-12 text-gray-500 mx-auto" />
                    </div>
                    <p className="text-gray-400 font-mono text-lg font-semibold mb-2">No items found</p>
                    {searchTerm && (
                      <p className="text-gray-500 font-mono text-sm">
                        Try adjusting your search or category filter
                      </p>
                    )}
                    {!searchTerm && selectedCategory === 'all' && (
                      <p className="text-gray-500 font-mono text-sm">
                        Your inventory appears to be empty
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default InventoryModal 