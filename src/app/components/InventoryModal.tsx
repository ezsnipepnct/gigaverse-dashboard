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
  ArrowUpDown
} from 'lucide-react'
import ItemCard from './ItemCard'
import ItemIcon from './ItemIcon'
import ItemTooltip from './ItemTooltip'

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
}

const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"

// JWT Token management
const getJWTToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jwt_token') || ''
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
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'rarity'>('quantity')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards')

  // Fetch game items and recipes for context
  useEffect(() => {
    if (isOpen) {
      fetchGameData()
    }
  }, [isOpen])

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
  const getInventoryItems = (): InventoryItem[] => {
    const items: InventoryItem[] = []
    
    Object.entries(playerBalances).forEach(([itemId, quantity]) => {
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
          description: gameItem?.DESCRIPTION_CID || `A valuable ${category.toLowerCase().slice(0, -1)}`,
          usedInRecipes,
          canCraft: usedInRecipes.length > 0
        })
      }
    })

    return items
  }

  const inventoryItems = getInventoryItems()

  // Get unique categories - will be enhanced by real metadata
  const categories = [
    { id: 'all', name: 'All Items', icon: Package, count: inventoryItems.length },
    { id: 'Consumables', name: 'Consumables', icon: Beaker, count: inventoryItems.filter(i => i.category === 'Consumables').length },
    { id: 'Materials', name: 'Materials', icon: Wrench, count: inventoryItems.filter(i => i.category === 'Materials').length },
    { id: 'Weapons', name: 'Weapons', icon: Sword, count: inventoryItems.filter(i => i.category === 'Weapons').length },
    { id: 'Armor', name: 'Armor', icon: Shield, count: inventoryItems.filter(i => i.category === 'Armor').length },
    { id: 'Gems', name: 'Gems', icon: Gem, count: inventoryItems.filter(i => i.category === 'Gems').length },
    { id: 'Scrolls', name: 'Scrolls', icon: Scroll, count: inventoryItems.filter(i => i.category === 'Scrolls').length },
  ].filter(cat => cat.count > 0 || cat.id === 'all')

  // Filter and sort items
  const filteredItems = inventoryItems
    .filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
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

  const getRarityColor = (rarity: number) => {
    switch (rarity) {
      case 5: return 'text-red-400 border-red-400/50 bg-red-400/10' // Mythic
      case 4: return 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10' // Legendary
      case 3: return 'text-purple-400 border-purple-400/50 bg-purple-400/10' // Epic
      case 2: return 'text-blue-400 border-blue-400/50 bg-blue-400/10' // Rare
      case 1: return 'text-green-400 border-green-400/50 bg-green-400/10' // Uncommon
      case 0: 
      default: return 'text-gray-400 border-gray-400/50 bg-gray-400/10' // Common
    }
  }

  const getRarityName = (rarity: number) => {
    switch (rarity) {
      case 5: return 'MYTHIC'
      case 4: return 'LEGENDARY'
      case 3: return 'EPIC'
      case 2: return 'RARE'
      case 1: return 'UNCOMMON'
      case 0:
      default: return 'COMMON'
    }
  }

  const getTotalValue = () => {
    return inventoryItems.reduce((total, item) => total + item.quantity, 0)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
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
          className="bg-black/90 border border-cyan-400/50 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Enhanced Header */}
          <div className="border-b border-cyan-400/20 p-4 bg-cyan-400/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Package className="w-6 h-6 text-cyan-400" />
                <div>
                  <h2 className="text-xl font-bold text-cyan-400 font-mono">
                    ENHANCED INVENTORY
                  </h2>
                  <p className="text-cyan-400/70 font-mono text-sm">
                    {inventoryItems.length} items • {getTotalValue().toLocaleString()} total • With Metadata
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Enhanced Controls */}
          <div className="p-4 border-b border-cyan-400/20 bg-black/20">
            <div className="flex items-center gap-4">
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

              {/* View Mode Toggle */}
              <div className="flex border border-cyan-400/30 rounded overflow-hidden">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 font-mono text-xs transition-colors ${
                    viewMode === 'cards' 
                      ? 'bg-cyan-400/20 text-cyan-400' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  CARDS
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 font-mono text-xs transition-colors border-l border-cyan-400/30 ${
                    viewMode === 'grid' 
                      ? 'bg-cyan-400/20 text-cyan-400' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  GRID
                </button>
              </div>

              {/* Sort */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-')
                  setSortBy(field as 'name' | 'quantity' | 'rarity')
                  setSortOrder(order as 'asc' | 'desc')
                }}
                className="px-3 py-2 bg-black/60 border border-cyan-400/30 rounded font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="quantity-desc">Quantity ↓</option>
                <option value="quantity-asc">Quantity ↑</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="rarity-desc">Rarity ↓</option>
                <option value="rarity-asc">Rarity ↑</option>
              </select>

              {/* Refresh */}
              <button
                onClick={onRefreshBalances}
                disabled={balancesLoading}
                className="p-2 bg-cyan-400/20 border border-cyan-400/50 rounded text-cyan-400 hover:bg-cyan-400/30 transition-colors disabled:opacity-50 font-mono text-sm"
                title="Refresh"
              >
                <Package className={`w-4 h-4 ${balancesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex h-[calc(90vh-180px)]">
            {/* Compact Category Sidebar */}
            <div className="w-48 border-r border-cyan-400/20 bg-black/10 p-3">
              <h3 className="text-sm font-bold text-cyan-400 font-mono mb-3">CATEGORIES</h3>
              <div className="space-y-1">
                {categories.map(category => {
                  const Icon = category.icon
                  const isSelected = selectedCategory === category.id
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`
                        w-full p-2 rounded border transition-all duration-200 font-mono text-left text-sm
                        ${isSelected 
                          ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400' 
                          : 'border-transparent hover:border-cyan-400/30 text-gray-400 hover:text-cyan-400'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4" />
                          <span className="truncate">{category.name}</span>
                        </div>
                        <span className="text-xs bg-gray-700/50 px-1.5 py-0.5 rounded">
                          {category.count}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Enhanced Items Display */}
            <div className="flex-1 p-4 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full mx-auto mb-3"
                    />
                    <p className="text-cyan-400 font-mono text-sm">LOADING METADATA...</p>
                  </div>
                </div>
              ) : (
                <>
                  {viewMode === 'cards' ? (
                    // Enhanced Card View with real metadata
                    <div className="space-y-3">
                      {filteredItems.map(item => (
                        <ItemCard
                          key={item.id}
                          itemId={parseInt(item.id)}
                          quantity={item.quantity}
                          showDescription
                          onClick={(itemMetadata) => {
                            if (itemMetadata) {
                              console.log('Item clicked:', itemMetadata)
                              // Could open detailed item modal here
                            }
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    // Enhanced Grid View with tooltips
                    <div className="grid grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-3">
                      {filteredItems.map(item => (
                        <ItemTooltip key={item.id} itemId={parseInt(item.id)} position="top">
                          <div className="relative">
                            <ItemIcon
                              itemId={parseInt(item.id)}
                              size="medium"
                              showRarity
                              onClick={(itemMetadata) => {
                                if (itemMetadata) {
                                  console.log('Item clicked:', itemMetadata)
                                }
                              }}
                            />
                            {/* Quantity overlay */}
                            <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-white text-xs font-bold rounded px-1 min-w-[16px] text-center">
                              {item.quantity > 999 ? `${Math.floor(item.quantity / 1000)}k` : item.quantity}
                            </div>
                            {/* Crafting indicator */}
                            {item.canCraft && (
                              <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-400 rounded-full border border-gray-800" />
                            )}
                          </div>
                        </ItemTooltip>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!loading && filteredItems.length === 0 && (
                <div className="text-center py-16">
                  <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 font-mono">No items found</p>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Info Footer */}
          <div className="border-t border-cyan-400/20 p-3 bg-black/20">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400">
              <span>Enhanced with Gigaverse Metadata API</span>
              <span>Hover items in grid mode for detailed tooltips</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default InventoryModal 