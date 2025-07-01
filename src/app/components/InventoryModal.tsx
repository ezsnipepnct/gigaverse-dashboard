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
  const hardcodedToken = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwidXNlciI6eyJfaWQiOiI2N2I5MjE1YTEwOGFlZGRiNDA5YTdlNzMiLCJ3YWxsZXRBZGRyZXNzIjoiMHhiMGQ5MGQ1MmM3Mzg5ODI0ZDRiMjJjMDZiY2RjY2Q3MzRlMzE2MmI3IiwidXNlcm5hbWUiOiIweGIwZDkwRDUyQzczODk4MjRENEIyMmMwNmJjZGNjZDczNEUzMTYyYjciLCJjYXNlU2Vuc2l0aXZlQWRkcmVzcyI6IjB4YjBkOTBENTJDNzM4OTgyNEQ0QjIyYzA2YmNkY0NENzM0RTMxNjJiNyIsIl9fdiI6MH0sImdhbWVBY2NvdW50Ijp7Im5vb2IiOnsiX2lkIjoiNjdiOTIxNzRlM2MzOWRjYTZmZGFkZjA5IiwiZG9jSWQiOiIyMTQyNCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiTEFTVF9UUkFOU0ZFUl9USU1FX0NJRCI6MTc0MDE4NTk2NCwiY3JlYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMi45NDZaIiwidXBkYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMy4xNjVaIiwiTEVWRUxfQ0lEIjoxLCJJU19OT09CX0NJRCI6dHJ1ZSwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJPV05FUl9DSUQiOiIweGIwZDkwZDUyYzczODk4MjRkNGIyMmMwNmJjZGNjZDczNGUzMTYyYjcifSwiYWxsb3dlZFRvQ3JlYXRlQWNjb3VudCI6dHJ1ZSwiY2FuRW50ZXJHYW1lIjp0cnVlLCJub29iUGFzc0JhbGFuY2UiOjAsImxhc3ROb29iSWQiOjczODg0LCJtYXhOb29iSWQiOjEwMDAwfSwiZXhwIjoxNzUwMTE2NDMxfQ.M26R6pDnFSSIbMXHa6kOhT_Hrjn3U7nkm_sGv0rY0uY"
  
  if (hardcodedToken) {
    return hardcodedToken
  }
  
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jwt_token') || localStorage.getItem('authToken') || ''
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

  // Transform player balances into inventory items
  const getInventoryItems = (): InventoryItem[] => {
    const items: InventoryItem[] = []
    
    Object.entries(playerBalances).forEach(([itemId, quantity]) => {
      if (quantity > 0) {
        const gameItem = gameItems.find(item => item.docId === itemId)
        const itemName = gameItem?.NAME_CID || `Item #${itemId}`
        
        // Categorize items based on ID ranges and names
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

        // Determine rarity based on quantity (corrected logic)
        let rarity = 0 // Default to common
        
        // Fixed quantity-based rarity - higher quantities = more common
        if (quantity >= 10000) {
          rarity = 0 // Common - very abundant
        } else if (quantity >= 2000) {
          rarity = 1 // Uncommon
        } else if (quantity >= 500) {
          rarity = 2 // Rare
        } else if (quantity >= 100) {
          rarity = 3 // Epic
        } else if (quantity >= 20) {
          rarity = 4 // Legendary
        } else {
          rarity = 0 // Common - very low quantities are usually common materials you haven't collected much of
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

  // Get unique categories
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
      case 5: return 'text-red-400 border-red-400 bg-red-400/10' // Mythic
      case 4: return 'text-yellow-400 border-yellow-400 bg-yellow-400/10' // Legendary
      case 3: return 'text-purple-400 border-purple-400 bg-purple-400/10' // Epic
      case 2: return 'text-blue-400 border-blue-400 bg-blue-400/10' // Rare
      case 1: return 'text-green-400 border-green-400 bg-green-400/10' // Uncommon
      case 0: 
      default: return 'text-gray-400 border-gray-400 bg-gray-400/10' // Common
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

  const getRarestItem = () => {
    return inventoryItems.reduce((rarest, item) => 
      item.rarity > rarest.rarity ? item : rarest, 
      inventoryItems[0] || { name: 'None', rarity: 0 }
    )
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
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-black/90 border-2 border-cyan-400/50 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden"
          style={{
            clipPath: 'polygon(20px 0%, 100% 0%, calc(100% - 20px) 100%, 0% 100%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-cyan-400/30 p-6 bg-gradient-to-r from-cyan-400/10 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-cyan-400/20 border border-cyan-400/50 rounded-full">
                  <Package className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-cyan-400 font-mono tracking-wider neon-pulse">
                    GIGAVERSE INVENTORY
                  </h2>
                  <p className="text-cyan-300/70 font-mono">
                    {inventoryItems.length} unique items • {getTotalValue().toLocaleString()} total quantity
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={onRefreshBalances}
                  disabled={balancesLoading}
                  className="p-2 bg-green-400/20 border border-green-400/50 rounded text-green-400 hover:bg-green-400/30 transition-colors disabled:opacity-50"
                  title="Refresh Inventory"
                >
                  <Package className={`w-5 h-5 ${balancesLoading ? 'animate-pulse' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 border-b border-cyan-400/20 bg-black/40">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {/* Search */}
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/60 border border-gray-600 rounded font-mono text-sm text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Sort */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-')
                  setSortBy(field as 'name' | 'quantity' | 'rarity')
                  setSortOrder(order as 'asc' | 'desc')
                }}
                className="px-4 py-2 bg-black/60 border border-gray-600 rounded font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="quantity-desc">Quantity (High to Low)</option>
                <option value="quantity-asc">Quantity (Low to High)</option>
                <option value="name-asc">Name (A to Z)</option>
                <option value="name-desc">Name (Z to A)</option>
                <option value="rarity-desc">Rarity (High to Low)</option>
                <option value="rarity-asc">Rarity (Low to High)</option>
              </select>

              {/* Stats */}
              <div className="flex items-center space-x-4 text-sm font-mono">
                <span className="text-gray-400">
                  Showing: <span className="text-cyan-400">{filteredItems.length}</span>
                </span>
                <span className="text-gray-400">
                  Rarest: <span className="text-yellow-400">{getRarestItem().name}</span>
                </span>
              </div>
            </div>

            {/* Rarity Legend */}
            <div className="bg-black/60 border border-gray-600/50 rounded p-3">
              <h4 className="text-gray-300 font-mono text-xs mb-2 flex items-center">
                <Star className="w-3 h-3 mr-1" />
                RARITY LEGEND
              </h4>
              <div className="flex flex-wrap gap-3 text-xs font-mono">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 border border-gray-400 bg-gray-400/10 rounded"></div>
                  <span className="text-gray-400">COMMON</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 border border-green-400 bg-green-400/10 rounded"></div>
                  <span className="text-green-400">UNCOMMON</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 border border-blue-400 bg-blue-400/10 rounded"></div>
                  <span className="text-blue-400">RARE</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 border border-purple-400 bg-purple-400/10 rounded"></div>
                  <span className="text-purple-400">EPIC</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 border border-yellow-400 bg-yellow-400/10 rounded"></div>
                  <span className="text-yellow-400">LEGENDARY</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 border border-red-400 bg-red-400/10 rounded"></div>
                  <span className="text-red-400">MYTHIC</span>
                </div>
                <div className="flex items-center space-x-1 ml-4">
                  <div className="w-3 h-3 border-2 border-green-400 rounded animate-pulse"></div>
                  <span className="text-green-400">CRAFTING MATERIAL</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(90vh-280px)]">
            {/* Category Sidebar */}
            <div className="w-64 border-r border-cyan-400/20 bg-black/20 p-4">
              <h3 className="text-lg font-bold text-cyan-400 font-mono mb-4">CATEGORIES</h3>
              <div className="space-y-2">
                {categories.map((category) => {
                  const Icon = category.icon
                  const isSelected = selectedCategory === category.id
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`
                        w-full p-3 rounded border-2 transition-all duration-300 font-mono text-left
                        ${isSelected 
                          ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400' 
                          : 'border-gray-600 hover:border-cyan-400/50 text-gray-300 hover:text-cyan-400'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Icon className="w-5 h-5" />
                          <span className="text-sm">{category.name}</span>
                        </div>
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                          {category.count}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Items Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full mx-auto mb-4"
                    />
                    <p className="text-cyan-400 font-mono">LOADING INVENTORY...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {filteredItems.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      className={`
                        p-4 border-2 bg-black/40 backdrop-blur-sm rounded transition-all duration-300 min-h-[140px] flex flex-col
                        ${getRarityColor(item.rarity)}
                        ${item.canCraft ? 'ring-2 ring-green-400/30' : ''}
                      `}
                      style={{
                        clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)'
                      }}
                    >
                      <div className="mb-3">
                        {/* Item Header with Name and Quantity */}
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold font-mono text-sm line-clamp-2 flex-1 pr-2">
                            {item.name}
                          </h4>
                          <div className="text-right flex-shrink-0 min-w-0">
                            <div className="text-lg font-bold font-mono text-cyan-400 break-all">
                              {item.quantity.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">QTY</div>
                          </div>
                        </div>
                        
                        {/* Rarity and Category Tags */}
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <span className={`px-2 py-1 text-xs font-mono border rounded ${getRarityColor(item.rarity)}`}>
                            {getRarityName(item.rarity)}
                          </span>
                          <span className="px-2 py-1 text-xs font-mono bg-gray-700 rounded">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-xs text-gray-400 font-mono mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* Spacer to push crafting info to bottom */}
                      <div className="flex-1"></div>

                      {item.canCraft && item.usedInRecipes && item.usedInRecipes.length > 0 && (
                        <div className="border-t border-green-400/30 pt-3 mt-auto">
                          <div className="flex items-center space-x-2 mb-1">
                            <Wrench className="w-3 h-3 text-green-400" />
                            <span className="text-xs font-mono text-green-400">CRAFTING MATERIAL</span>
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            Used in {item.usedInRecipes.length} recipe{item.usedInRecipes.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {!loading && filteredItems.length === 0 && (
                <div className="text-center py-16">
                  <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 font-mono">No items found matching your criteria</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default InventoryModal 