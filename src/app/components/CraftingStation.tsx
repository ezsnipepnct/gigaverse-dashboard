'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Sparkles,
  CheckCircle,
  Package,
  Zap,
  Star,
  Search,
  Plus,
  Minus,
  Flame,
  AlertCircle,
  RefreshCw,
  Wrench,
  Battery
} from 'lucide-react'
import ItemIcon from './ItemIcon'
import ItemTooltip from './ItemTooltip'
import { itemMetadataService } from '../services/itemMetadata'

interface CraftingStationProps {
  isOpen: boolean
  onClose: () => void
}

interface Recipe {
  _id: string
  ID_CID: string
  NAME_CID: string
  DESCRIPTION_CID?: string
  RARITY_CID?: number
  TYPE_CID?: string
  CATEGORY_CID?: string
  SUCCESS_RATE_CID?: number
  ENERGY_CID?: number
  REQUIREMENTS_CID?: Array<{
    itemId: number
    amount: number
    name: string
  }>
  REWARDS_CID?: Array<{
    itemId: number
    amount: number
    name: string
  }>
  unlocked: boolean
}

interface CraftingInstance {
  _id: string
  docId: string
  COMPLETE_CID: boolean
  ID_CID: string
  PLAYER_CID: string
  NOOB_TOKEN_CID: number
  START_TIMESTAMP_CID: number
  END_TIMESTAMP_CID: number
  SUCCESS_CID: boolean
  LOOT_ID_CID_array?: number[]
  LOOT_AMOUNT_CID_array?: number[]
}

const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"
const NOOB_ID = 21424

const getJWTToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jwt_token') || ''
  }
  return ''
}

const CraftingStation: React.FC<CraftingStationProps> = ({ isOpen, onClose }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [craftingInstances, setCraftingInstances] = useState<CraftingInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [crafting, setCrafting] = useState(false)
  const [craftingProgress, setCraftingProgress] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [craftingQuantity, setCraftingQuantity] = useState(1)
  const [currentCraftIndex, setCurrentCraftIndex] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [playerBalances, setPlayerBalances] = useState<Record<string, number>>({})
  const [mounted, setMounted] = useState(false)
  const [showLockedRecipes, setShowLockedRecipes] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  // Add preloading effect for recipe items
  useEffect(() => {
    if (selectedRecipe) {
      // Preload all item images for the selected recipe
      const allItemIds = [
        ...(selectedRecipe.REQUIREMENTS_CID?.map(req => req.itemId) || []),
        ...(selectedRecipe.REWARDS_CID?.map(reward => reward.itemId) || [])
      ];
      
      if (allItemIds.length > 0) {
        console.log(`[CraftingStation] Preloading ${allItemIds.length} items for recipe ${selectedRecipe.NAME_CID}`);
        itemMetadataService.preloadItems(allItemIds).catch(console.error);
      }
    }
  }, [selectedRecipe]);

  const fetchPlayerBalances = async () => {
    try {
      const jwtToken = getJWTToken()
      if (!jwtToken) return

      const response = await fetch(`/api/player/balances?wallet=${WALLET_ADDRESS}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.balances) {
          setPlayerBalances(data.balances)
        }
      }
    } catch (error) {
      console.error('Error fetching player balances:', error)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      await fetchPlayerBalances()
      
      // Fetch all recipes
      const allRecipesResponse = await fetch('https://gigaverse.io/api/offchain/recipes')
      const allRecipesData = await allRecipesResponse.json()
      const allRecipes = allRecipesData.entities || []
      
      // Fetch player recipes to determine what's unlocked
      const playerRecipesResponse = await fetch(`https://gigaverse.io/api/offchain/recipes/player/${WALLET_ADDRESS}`)
      const playerRecipesData = await playerRecipesResponse.json()
      const playerRecipes = playerRecipesData.entities || []
      
      const playerRecipeIds = new Set(playerRecipes.map((pr: any) => pr.ID_CID))
      
      // Format all recipes with unlock status
      const formattedRecipes = allRecipes.map((recipe: any) => {
        const isUnlocked = playerRecipeIds.has(recipe.docId) || playerRecipeIds.has(recipe.ID_CID)
        
        return {
          _id: recipe.docId,
          ID_CID: recipe.docId,
          NAME_CID: recipe.NAME_CID,
          DESCRIPTION_CID: `Craft ${recipe.NAME_CID}`,
          RARITY_CID: recipe.TIER_CID || 1,
          TYPE_CID: 'Consumable',
          CATEGORY_CID: recipe.TAG_CID_array?.includes('crafting') ? 'Alchemy' : 
                       recipe.TAG_CID_array?.includes('workbench') ? 'Smithing' : 'General',
          SUCCESS_RATE_CID: recipe.SUCCESS_RATE_CID || 100,
          ENERGY_CID: recipe.ENERGY_CID || 0,
          REQUIREMENTS_CID: recipe.INPUT_NAMES_CID_array?.map((name: string, index: number) => ({
            itemId: recipe.INPUT_ID_CID_array?.[index] || 0,
            amount: recipe.INPUT_AMOUNT_CID_array?.[index] || 1,
            name: name
          })) || [],
          REWARDS_CID: recipe.LOOT_ID_CID_array?.map((id: number, index: number) => ({
            itemId: id,
            amount: recipe.LOOT_AMOUNT_CID_array?.[index] || 1,
            name: `Item #${id}`
          })) || [],
          unlocked: isUnlocked
        }
      })
      
      if (formattedRecipes.length > 0) {
        setRecipes(formattedRecipes)
      } else {
        setRecipes(getMockRecipes())
      }
      
    } catch (error) {
      console.error('Failed to fetch crafting data:', error)
      setRecipes(getMockRecipes())
    } finally {
      setLoading(false)
    }
  }

  const getMockRecipes = (): Recipe[] => [
    {
      _id: '1',
      ID_CID: 'health-potion',
      NAME_CID: 'Health Potion',
      DESCRIPTION_CID: 'Restores health over time',
      RARITY_CID: 1,
      TYPE_CID: 'Consumable',
      CATEGORY_CID: 'Alchemy',
      SUCCESS_RATE_CID: 95,
      ENERGY_CID: 5,
      REQUIREMENTS_CID: [
        { itemId: 131, amount: 2, name: 'Herb Extract' },
        { itemId: 158, amount: 1, name: 'Pure Water' }
      ],
      REWARDS_CID: [
        { itemId: 200, amount: 1, name: 'Health Potion' }
      ],
      unlocked: true
    },
    {
      _id: '2',
      ID_CID: 'steel-blade',
      NAME_CID: 'Steel Blade',
      DESCRIPTION_CID: 'A sharp steel weapon',
      RARITY_CID: 2,
      TYPE_CID: 'Weapon',
      CATEGORY_CID: 'Smithing',
      SUCCESS_RATE_CID: 80,
      ENERGY_CID: 10,
      REQUIREMENTS_CID: [
        { itemId: 5, amount: 3, name: 'Steel Pipe' },
        { itemId: 4, amount: 5, name: 'Bolt' }
      ],
      REWARDS_CID: [
        { itemId: 201, amount: 1, name: 'Steel Blade' }
      ],
      unlocked: true
    },
    {
      _id: '3',
      ID_CID: 'void-crystal',
      NAME_CID: 'Void Crystal',
      DESCRIPTION_CID: 'A mysterious crystal with void energy',
      RARITY_CID: 4,
      TYPE_CID: 'Material',
      CATEGORY_CID: 'Enchanting',
      SUCCESS_RATE_CID: 60,
      ENERGY_CID: 25,
      REQUIREMENTS_CID: [
        { itemId: 6, amount: 10, name: 'Void Seed' },
        { itemId: 9, amount: 5, name: 'Vortex Residue' }
      ],
      REWARDS_CID: [
        { itemId: 202, amount: 1, name: 'Void Crystal' }
      ],
      unlocked: false
    }
  ]

  const startCrafting = async () => {
    if (!selectedRecipe) return
    
    const craftCheck = canCraftQuantity(selectedRecipe, craftingQuantity)
    if (!craftCheck.canCraft) {
      setErrorMessage('Insufficient materials for crafting')
      return
    }
    
    try {
      setCrafting(true)
      setCraftingProgress(0)
      setErrorMessage(null)
      setSuccessMessage(null)
      
      const jwtToken = getJWTToken()
      if (!jwtToken) {
        setErrorMessage('Please login to start crafting')
        setCrafting(false)
        return
      }
      
      for (let i = 0; i < craftingQuantity; i++) {
        setCurrentCraftIndex(i + 1)
        setCraftingProgress(((i + 1) / craftingQuantity) * 100)
        
        const payload = {
          recipeId: selectedRecipe.ID_CID,
          noobId: NOOB_ID,
          gearInstanceId: "",
          nodeIndex: 0
        }
        
        const response = await fetch('/api/crafting/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
          },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Crafting failed: ${errorText}`)
        }
        
        const result = await response.json()
        if (result.entities && result.entities.length > 0) {
          const instance = result.entities[0]
          setCraftingInstances(prev => [...prev, instance])
        }
        
        // Small delay between crafts
        if (i < craftingQuantity - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      setSuccessMessage(`Successfully crafted ${craftingQuantity}x ${selectedRecipe.NAME_CID}!`)
      fetchPlayerBalances()
      
      setTimeout(() => {
        setCrafting(false)
        setCraftingProgress(0)
        setSuccessMessage(null)
      }, 3000)
      
    } catch (error) {
      console.error('Crafting error:', error)
      setErrorMessage('Crafting failed. Please try again.')
      setCrafting(false)
    }
  }

  const getRarityColor = (rarity: number) => {
    switch (rarity) {
      case 0: return 'text-gray-400'
      case 1: return 'text-green-400'
      case 2: return 'text-blue-400'
      case 3: return 'text-purple-400'
      case 4: return 'text-yellow-400'
      case 5: return 'text-violet-400'
      default: return 'text-gray-400'
    }
  }

  const getRarityName = (rarity: number) => {
    switch (rarity) {
      case 0: return 'COMMON'
      case 1: return 'UNCOMMON'
      case 2: return 'RARE'
      case 3: return 'EPIC'
      case 4: return 'LEGENDARY'
      case 5: return 'RELIC'
      default: return 'COMMON'
    }
  }

  const getPlayerBalance = (itemId: string | number): number => {
    return playerBalances[itemId.toString()] || 0
  }

  const getMaxCraftableQuantity = (recipe: Recipe): number => {
    if (!recipe.REQUIREMENTS_CID || recipe.REQUIREMENTS_CID.length === 0) {
      return 99
    }

    let maxQuantity = 99
    for (const requirement of recipe.REQUIREMENTS_CID) {
      const available = getPlayerBalance(requirement.itemId)
      const needed = requirement.amount || 1
      const possibleFromThisItem = Math.floor(available / needed)
      maxQuantity = Math.min(maxQuantity, possibleFromThisItem)
    }

    return Math.max(0, maxQuantity)
  }

  const canCraftQuantity = (recipe: Recipe, quantity: number): { canCraft: boolean, missingItems: Array<{itemId: number, name: string, needed: number, have: number}> } => {
    if (!recipe.REQUIREMENTS_CID || recipe.REQUIREMENTS_CID.length === 0) {
      return { canCraft: true, missingItems: [] }
    }

    const missingItems: Array<{itemId: number, name: string, needed: number, have: number}> = []
    
    for (const requirement of recipe.REQUIREMENTS_CID) {
      const available = getPlayerBalance(requirement.itemId)
      const needed = (requirement.amount || 1) * quantity
      
      if (available < needed) {
        missingItems.push({
          itemId: requirement.itemId,
          name: requirement.name || `Item #${requirement.itemId}`,
          needed,
          have: available
        })
      }
    }

    return {
      canCraft: missingItems.length === 0,
      missingItems
    }
  }

  const getUniqueCategories = () => {
    const categories = new Set(recipes.map(recipe => recipe.CATEGORY_CID).filter(Boolean))
    return Array.from(categories)
  }

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.NAME_CID?.toLowerCase().includes(searchTerm.toLowerCase()) || false
    const matchesCategory = selectedCategory === 'all' || recipe.CATEGORY_CID === selectedCategory
    const matchesUnlockFilter = showLockedRecipes || recipe.unlocked
    return matchesSearch && matchesCategory && matchesUnlockFilter
  })

  if (!mounted) return null

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-black/90 border-2 border-cyan-400/50 rounded-xl max-w-7xl w-full mx-4 backdrop-blur-md max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-cyan-400/20 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="inline-flex items-center justify-center w-12 h-12 bg-cyan-400/20 rounded-full"
                  >
                    <Wrench className="w-6 h-6 text-cyan-400" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold font-mono text-cyan-400 mb-1">CRAFTING STATION</h2>
                    <p className="text-gray-400 font-mono text-sm">Create items from materials</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={fetchData}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                    title="Refresh Data"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex items-center space-x-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search recipes..."
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
                  <option value="all">All Categories</option>
                  {getUniqueCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                
                {/* Show Locked Recipes Toggle */}
                <div className="flex items-center space-x-3 px-3 py-2 bg-gray-900/50 border border-cyan-400/20 rounded-lg">
                  <span className="text-cyan-400 font-mono text-sm">Show Locked</span>
                  <button
                    onClick={() => setShowLockedRecipes(!showLockedRecipes)}
                    className={`
                      relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none
                      ${showLockedRecipes ? 'bg-cyan-400/30' : 'bg-gray-600/50'}
                    `}
                  >
                    <motion.div
                      animate={{ x: showLockedRecipes ? 24 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className={`
                        absolute top-1 w-4 h-4 rounded-full shadow-lg
                        ${showLockedRecipes ? 'bg-cyan-400' : 'bg-gray-400'}
                      `}
                    />
                  </button>
                  <span className={`font-mono text-xs ${showLockedRecipes ? 'text-cyan-400' : 'text-gray-400'}`}>
                    {showLockedRecipes ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex h-[calc(90vh-200px)]">
              {/* Recipe List */}
              <div className="flex-1 p-6 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full mx-auto mb-4"
                      />
                      <p className="text-cyan-400 font-mono text-sm">LOADING RECIPES...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRecipes.map((recipe) => (
                      <motion.div
                        key={recipe._id}
                        whileHover={{ scale: recipe.unlocked ? 1.01 : 1 }}
                        onClick={() => recipe.unlocked && setSelectedRecipe(recipe)}
                        className={`
                          p-4 rounded-lg transition-all duration-200 border relative
                          ${!recipe.unlocked 
                            ? 'bg-gray-800/30 border-gray-700/50 opacity-60 cursor-not-allowed' 
                            : selectedRecipe?._id === recipe._id
                              ? 'bg-cyan-400/10 border-cyan-400/50 shadow-lg cursor-pointer'
                              : 'bg-gray-900/30 border-gray-600/30 hover:bg-gray-900/50 hover:border-cyan-400/30 cursor-pointer'
                          }
                        `}
                      >
                        {/* Lock/Unlock Indicator */}
                        <div className="absolute top-2 right-2">
                          {recipe.unlocked ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6 bg-green-400/20 rounded-full flex items-center justify-center"
                            >
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            </motion.div>
                          ) : (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6 bg-red-400/20 rounded-full flex items-center justify-center"
                            >
                              <X className="w-4 h-4 text-red-400" />
                            </motion.div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pr-8">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded ${recipe.unlocked ? 'bg-cyan-400/20' : 'bg-gray-600/20'}`}>
                              <Package className={`w-5 h-5 ${recipe.unlocked ? 'text-cyan-400' : 'text-gray-500'}`} />
                            </div>
                            <div>
                              <h3 className={`font-mono font-bold text-lg ${recipe.unlocked ? 'text-cyan-400' : 'text-gray-500'}`}>
                                {recipe.NAME_CID}
                              </h3>
                              <p className={`font-mono text-xs ${recipe.unlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                                {recipe.DESCRIPTION_CID}
                              </p>
                              <div className="flex items-center space-x-4 mt-1">
                                <div className="flex items-center space-x-1">
                                  <Zap className={`w-3 h-3 ${recipe.unlocked ? 'text-yellow-400' : 'text-gray-500'}`} />
                                  <span className={`font-mono text-xs ${recipe.unlocked ? 'text-yellow-400' : 'text-gray-500'}`}>
                                    {recipe.ENERGY_CID || 0}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Star className={`w-3 h-3 ${recipe.unlocked ? 'text-green-400' : 'text-gray-500'}`} />
                                  <span className={`font-mono text-xs ${recipe.unlocked ? 'text-green-400' : 'text-gray-500'}`}>
                                    {recipe.SUCCESS_RATE_CID || 100}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className={`font-mono text-xs uppercase ${recipe.unlocked ? 'text-green-400' : 'text-red-400'}`}>
                              {recipe.unlocked ? 'UNLOCKED' : 'LOCKED'}
                            </div>
                            {recipe.unlocked ? (
                              <CheckCircle className="w-4 h-4 text-green-400 mx-auto mt-1" />
                            ) : (
                              <X className="w-4 h-4 text-red-400 mx-auto mt-1" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Crafting Panel */}
              <div className="w-96 border-l border-cyan-400/20 p-6 overflow-y-auto">
                {selectedRecipe ? (
                  <div className="space-y-6">
                    {/* Recipe Header */}
                    <div className="text-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                          selectedRecipe.unlocked ? 'bg-cyan-400/20' : 'bg-gray-600/20'
                        }`}
                      >
                        <Sparkles className={`w-8 h-8 ${selectedRecipe.unlocked ? 'text-cyan-400' : 'text-gray-500'}`} />
                      </motion.div>
                      <h3 className={`text-xl font-bold font-mono mb-2 ${selectedRecipe.unlocked ? 'text-cyan-400' : 'text-gray-500'}`}>
                        {selectedRecipe.NAME_CID}
                      </h3>
                      <p className={`font-mono text-sm ${selectedRecipe.unlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                        {selectedRecipe.DESCRIPTION_CID}
                      </p>
                      
                      {/* Lock Status */}
                      {!selectedRecipe.unlocked && (
                        <div className="mt-4 p-3 bg-red-400/10 rounded-lg border border-red-400/30">
                          <div className="flex items-center justify-center space-x-2">
                            <X className="w-4 h-4 text-red-400" />
                            <span className="text-red-400 font-mono text-sm">RECIPE LOCKED</span>
                          </div>
                          <p className="text-red-400 font-mono text-xs mt-1">
                            Complete requirements to unlock this recipe
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Recipe Stats */}
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-cyan-400/20">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-cyan-400 font-mono text-xs uppercase">Energy Cost</div>
                          <div className="text-yellow-400 font-mono text-lg font-bold">
                            {(selectedRecipe.ENERGY_CID || 0) * craftingQuantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-cyan-400 font-mono text-xs uppercase">Success Rate</div>
                          <div className="text-green-400 font-mono text-lg font-bold">
                            {selectedRecipe.SUCCESS_RATE_CID || 100}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Materials Required */}
                    {selectedRecipe.REQUIREMENTS_CID && selectedRecipe.REQUIREMENTS_CID.length > 0 && (
                      <div>
                        <h4 className="text-cyan-400 font-mono text-sm font-bold mb-3 uppercase">Materials Required</h4>
                        <div className="space-y-3">
                          {selectedRecipe.REQUIREMENTS_CID.map((req, index) => {
                            const available = getPlayerBalance(req.itemId)
                            const needed = req.amount * craftingQuantity
                            const hasEnough = available >= needed
                            
                            return (
                              <div key={index} className={`
                                p-3 rounded-lg border transition-all duration-200
                                ${hasEnough ? 'bg-green-400/10 border-green-400/30' : 'bg-red-400/10 border-red-400/30'}
                              `}>
                                <div className="flex items-center space-x-3">
                                  <ItemTooltip itemId={req.itemId} position="right">
                                    <ItemIcon 
                                      itemId={req.itemId} 
                                      size="small" 
                                      showRarity
                                      className="flex-shrink-0"
                                    />
                                  </ItemTooltip>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-white font-mono text-sm truncate">{req.name}</span>
                                      {hasEnough ? (
                                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 ml-2" />
                                      ) : (
                                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 ml-2" />
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <div className={`text-xs font-mono ${hasEnough ? 'text-green-400' : 'text-red-400'}`}>
                                        {available.toLocaleString()} / {needed.toLocaleString()}
                                      </div>
                                      <div className="text-xs font-mono text-cyan-400">
                                        x{needed.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Enhanced Rewards */}
                    {selectedRecipe.REWARDS_CID && selectedRecipe.REWARDS_CID.length > 0 && (
                      <div>
                        <h4 className="text-cyan-400 font-mono text-sm font-bold mb-3 uppercase">Rewards</h4>
                        <div className="space-y-3">
                          {selectedRecipe.REWARDS_CID.map((reward, index) => (
                            <div key={index} className="p-3 bg-gray-900/50 rounded-lg border border-cyan-400/20 hover:border-cyan-400/40 transition-all duration-200">
                              <div className="flex items-center space-x-3">
                                <ItemTooltip itemId={reward.itemId} position="right">
                                  <ItemIcon 
                                    itemId={reward.itemId} 
                                    size="small" 
                                    showRarity
                                    className="flex-shrink-0"
                                  />
                                </ItemTooltip>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-white font-mono text-sm truncate">{reward.name}</span>
                                    <span className="text-cyan-400 font-mono text-sm font-bold flex-shrink-0 ml-2">
                                      x{reward.amount * craftingQuantity}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <div className="text-xs font-mono text-gray-400">
                                      Item ID: {reward.itemId}
                                    </div>
                                    <div className="text-xs font-mono text-green-400">
                                      +{(reward.amount * craftingQuantity).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity Selector */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-cyan-400 font-mono text-sm font-bold uppercase">Quantity</h4>
                        <span className="text-yellow-400 font-mono text-lg font-bold">
                          x{craftingQuantity}
                        </span>
                      </div>
                      
                      <div className="relative mb-4">
                        <input
                          type="range"
                          min="1"
                          max={getMaxCraftableQuantity(selectedRecipe)}
                          step="1"
                          value={craftingQuantity}
                          onChange={(e) => setCraftingQuantity(Number(e.target.value))}
                          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider-cyan"
                          disabled={crafting}
                        />
                        
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-cyan-600/30 to-yellow-400/30 rounded-full pointer-events-none transform -translate-y-1/2" />
                        
                        <motion.div
                          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-400 to-yellow-400 rounded-full pointer-events-none transform -translate-y-1/2"
                          animate={{
                            width: `${((craftingQuantity - 1) / (getMaxCraftableQuantity(selectedRecipe) - 1)) * 100}%`
                          }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs font-mono text-gray-400">
                        <span>1</span>
                        <span className="text-cyan-400">Crafting quantity</span>
                        <span>{getMaxCraftableQuantity(selectedRecipe)}</span>
                      </div>
                    </div>

                    {/* Crafting Progress */}
                    {crafting && (
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-cyan-400/20">
                        <div className="text-center mb-3">
                          <div className="text-cyan-400 font-mono text-xs uppercase">Crafting Progress</div>
                          <div className="text-white font-mono text-lg font-bold">
                            {craftingQuantity === 1 ? `${Math.round(craftingProgress)}%` : `${currentCraftIndex}/${craftingQuantity}`}
                          </div>
                        </div>
                        
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300"
                            initial={{ width: 0 }}
                            animate={{ width: `${craftingProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Messages */}
                    {errorMessage && (
                      <div className="bg-red-400/10 rounded-lg p-3 border border-red-400/30">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 font-mono text-sm">{errorMessage}</span>
                        </div>
                      </div>
                    )}

                    {successMessage && (
                      <div className="bg-green-400/10 rounded-lg p-3 border border-green-400/30">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 font-mono text-sm">{successMessage}</span>
                        </div>
                      </div>
                    )}

                    {/* Craft Button */}
                    <button
                      onClick={startCrafting}
                      disabled={crafting || !selectedRecipe.unlocked || !canCraftQuantity(selectedRecipe, craftingQuantity).canCraft}
                      className={`
                        w-full py-3 px-4 rounded-lg font-mono font-bold transition-all duration-200 border-2
                        ${crafting
                          ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/50'
                          : !selectedRecipe.unlocked
                            ? 'bg-gray-800/50 text-gray-400 border-gray-600/30 cursor-not-allowed'
                            : canCraftQuantity(selectedRecipe, craftingQuantity).canCraft
                              ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/50 hover:bg-cyan-400/20 hover:border-cyan-400'
                              : 'bg-gray-800/50 text-gray-400 border-gray-600/30 cursor-not-allowed'
                        }
                      `}
                    >
                      {!selectedRecipe.unlocked ? (
                        <div className="flex items-center justify-center space-x-2">
                          <X className="w-4 h-4" />
                          <span>RECIPE LOCKED</span>
                        </div>
                      ) : crafting ? (
                        <div className="flex items-center justify-center space-x-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"
                          />
                          <span>CRAFTING...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <span>CRAFT {craftingQuantity > 1 ? `${craftingQuantity}x ` : ''}{selectedRecipe.NAME_CID}</span>
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            ⚡
                          </motion.div>
                        </div>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="p-4 bg-cyan-400/20 rounded-full mb-4">
                      <Package className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-bold font-mono text-cyan-400 mb-2">SELECT RECIPE</h3>
                    <p className="text-gray-400 font-mono text-sm">
                      Choose a recipe to begin crafting
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CraftingStation 