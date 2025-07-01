'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wrench, 
  Zap, 
  Shield, 
  Sword, 
  X, 
  Plus, 
  Sparkles,
  ArrowRight,
  Flame,
  Snowflake,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  Beaker,
  Star,
  Gem,
  RefreshCw,
  Play,
  Pause,
  Timer
} from 'lucide-react'

interface CraftingStationProps {
  isOpen: boolean
  onClose: () => void
}

interface GameItem {
  _id: string
  docId: string
  NAME_CID: string
  MAX_SUPPLY_CID?: number
  MINT_COUNT_CID?: number
  BURN_COUNT_CID?: number
  IS_SOULBOUND_CID?: boolean
}

interface Recipe {
  _id: string
  ID_CID: string
  NAME_CID: string
  DESCRIPTION_CID?: string
  RARITY_CID?: number
  TYPE_CID?: string
  FACTION_CID?: number
  COST_CID?: number
  DURATION_CID?: number
  REQUIREMENTS_CID?: any[]
  REWARDS_CID?: any[]
  CATEGORY_CID?: string
  LEVEL_REQUIRED_CID?: number
  SUCCESS_RATE_CID?: number
  ENERGY_CID?: number
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
const NOOB_ID = 21424 // This should be dynamic based on user's selected Noob

// JWT Token management
const getJWTToken = () => {
  // Updated JWT token for testing
  const hardcodedToken = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwidXNlciI6eyJfaWQiOiI2N2I5MjE1YTEwOGFlZGRiNDA5YTdlNzMiLCJ3YWxsZXRBZGRyZXNzIjoiMHhiMGQ5MGQ1MmM3Mzg5ODI0ZDRiMjJjMDZiY2RjY2Q3MzRlMzE2MmI3IiwidXNlcm5hbWUiOiIweGIwZDkwRDUyQzczODk4MjRENEIyMmMwNmJjZGNDRDczNEUzMTYyYjciLCJjYXNlU2Vuc2l0aXZlQWRkcmVzcyI6IjB4YjBkOTBENTJDNzM4OTgyNEQ0QjIyYzA2YmNkY0NENzM0RTMxNjJiNyIsIl9fdiI6MH0sImdhbWVBY2NvdW50Ijp7Im5vb2IiOnsiX2lkIjoiNjdiOTIxNzRlM2MzOWRjYTZmZGFkZjA5IiwiZG9jSWQiOiIyMTQyNCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiTEFTVF9UUkFOU0ZFUl9USU1FX0NJRCI6MTc0MDE4NTk2NCwiY3JlYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMi45NDZaIiwidXBkYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMy4xNjVaIiwiTEVWRUxfQ0lEIjoxLCJJU19OT09CX0NJRCI6dHJ1ZSwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJPV05FUl9DSUQiOiIweGIwZDkwZDUyYzczODk4MjRkNGIyMmMwNmJjZGNjZDczNGUzMTYyYjcifSwiYWxsb3dlZFRvQ3JlYXRlQWNjb3VudCI6dHJ1ZSwiY2FuRW50ZXJHYW1lIjp0cnVlLCJub29iUGFzc0JhbGFuY2UiOjAsImxhc3ROb29iSWQiOjczODg0LCJtYXhOb29iSWQiOjEwMDAwfSwiZXhwIjoxNzUwMTE2NDMxfQ.M26R6pDnFSSIbMXHa6kOhT_Hrjn3U7nkm_sGv0rY0uY"
  
  // For testing, return the hardcoded token
  if (hardcodedToken) {
    return hardcodedToken
  }
  
  // Fallback to localStorage if no hardcoded token
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jwt_token') || localStorage.getItem('authToken') || ''
  }
  return ''
}

const CraftingStation: React.FC<CraftingStationProps> = ({ isOpen, onClose }) => {
  const [gameItems, setGameItems] = useState<GameItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [craftingInstances, setCraftingInstances] = useState<CraftingInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [crafting, setCrafting] = useState(false)
  const [craftingProgress, setCraftingProgress] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [mounted, setMounted] = useState(false)
  const [craftingQuantity, setCraftingQuantity] = useState(1)
  const [currentCraftIndex, setCurrentCraftIndex] = useState(0)
  const [craftingDelay, setCraftingDelay] = useState(2000) // 2 seconds default
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [playerBalances, setPlayerBalances] = useState<Record<string, number>>({})
  const [balancesLoading, setBalancesLoading] = useState(false)

  // Fix hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch game items and recipes when component opens
  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchPlayerBalances = async () => {
    try {
      setBalancesLoading(true)
      const jwtToken = getJWTToken()
      if (!jwtToken) {
        console.log('No JWT token available for fetching balances')
        return
      }

      console.log('Fetching player balances...')
      const response = await fetch(`/api/player/balances?wallet=${WALLET_ADDRESS}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.balances) {
          setPlayerBalances(data.balances)
          console.log('Player balances loaded:', Object.keys(data.balances).length, 'items')
        }
      } else {
        console.error('Failed to fetch player balances:', response.status)
      }
    } catch (error) {
      console.error('Error fetching player balances:', error)
    } finally {
      setBalancesLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch player balances first
      await fetchPlayerBalances()
      
      // Fetch all recipe definitions
      console.log('Fetching recipe definitions...')
      const allRecipesResponse = await fetch('https://gigaverse.io/api/offchain/recipes')
      const allRecipesData = await allRecipesResponse.json()
      const allRecipes = allRecipesData.entities || []
      console.log('All recipes loaded:', allRecipes.length)
      
      // Fetch player's available recipes
      console.log('Fetching player recipes...')
      const playerRecipesResponse = await fetch(`https://gigaverse.io/api/offchain/recipes/player/${WALLET_ADDRESS}`)
      const playerRecipesData = await playerRecipesResponse.json()
      const playerRecipes = playerRecipesData.entities || []
      console.log('Player recipes loaded:', playerRecipes.length)
      
      // Create a map of player's available recipe IDs
      const playerRecipeIds = new Set(playerRecipes.map((pr: any) => pr.ID_CID))
      console.log('Player recipe IDs:', Array.from(playerRecipeIds))
      console.log('Total recipes from API:', allRecipes.length)
      console.log('Sample recipe docIds:', allRecipes.slice(0, 5).map((r: any) => r.docId))
      
      // Filter recipes to only show ones the player can craft
      const availableRecipes = allRecipes.filter((recipe: any) => {
        // Direct match with player recipe IDs
        return playerRecipeIds.has(recipe.docId) || playerRecipeIds.has(recipe.ID_CID)
      })
      
      console.log('Available recipes for player:', availableRecipes.length)
      
      // Convert to our format
      const formattedRecipes = availableRecipes.map((recipe: any) => ({
        _id: recipe.docId,
        ID_CID: recipe.docId,
        NAME_CID: recipe.NAME_CID,
        DESCRIPTION_CID: `Craft ${recipe.NAME_CID}`,
        RARITY_CID: recipe.TIER_CID || 1,
        TYPE_CID: 'Consumable',
        FACTION_CID: recipe.FACTION_CID_array?.[0] || 0,
        COST_CID: 0,
        DURATION_CID: 0, // Instant crafting
        CATEGORY_CID: recipe.TAG_CID_array?.includes('crafting') ? 'Alchemy' : 
                     recipe.TAG_CID_array?.includes('workbench') ? 'Smithing' : 'General',
        LEVEL_REQUIRED_CID: 1,
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
        })) || []
      }))
      
      if (formattedRecipes.length > 0) {
        setRecipes(formattedRecipes)
        console.log('Set formatted recipes:', formattedRecipes.length)
      } else {
        console.log('No available recipes found, using mock data')
        setRecipes(getMockRecipes())
      }
      
      // Fetch game items for additional context
      try {
        const itemsResponse = await fetch('https://gigaverse.io/api/indexer/gameitems')
        const itemsData = await itemsResponse.json()
        setGameItems(itemsData.entities || [])
        console.log('Game items loaded:', itemsData.entities?.length || 0)
      } catch (itemError) {
        console.log('Could not fetch game items:', itemError)
      }
      
    } catch (error) {
      console.error('Failed to fetch crafting data:', error)
      // Fallback to mock data
      console.log('Using mock data as fallback')
      setRecipes(getMockRecipes())
    } finally {
      setLoading(false)
    }
  }

  const getMockRecipes = (): Recipe[] => [
    {
      _id: '1',
      ID_CID: 'Recipe#9#Faction_5',
      NAME_CID: 'Health Potion',
      DESCRIPTION_CID: 'Restores health over time',
      RARITY_CID: 1,
      TYPE_CID: 'Consumable',
      FACTION_CID: 5,
      COST_CID: 50,
      DURATION_CID: 0, // Instant
      CATEGORY_CID: 'Alchemy',
      LEVEL_REQUIRED_CID: 1,
      SUCCESS_RATE_CID: 95,
      REQUIREMENTS_CID: [
        { itemId: 131, amount: 2, name: 'Herb Extract' },
        { itemId: 158, amount: 1, name: 'Pure Water' }
      ],
      REWARDS_CID: [
        { itemId: 200, amount: 1, name: 'Health Potion' }
      ]
    },
    {
      _id: '2',
      ID_CID: 'Recipe#15#Faction_1',
      NAME_CID: 'Steel Blade',
      DESCRIPTION_CID: 'A sharp steel weapon',
      RARITY_CID: 2,
      TYPE_CID: 'Weapon',
      FACTION_CID: 1,
      COST_CID: 150,
      DURATION_CID: 0, // Instant
      CATEGORY_CID: 'Smithing',
      LEVEL_REQUIRED_CID: 5,
      SUCCESS_RATE_CID: 80,
      REQUIREMENTS_CID: [
        { itemId: 5, amount: 3, name: 'Steel Pipe' },
        { itemId: 4, amount: 5, name: 'Bolt' }
      ],
      REWARDS_CID: [
        { itemId: 201, amount: 1, name: 'Steel Blade' }
      ]
    },
    {
      _id: '3',
      ID_CID: 'Recipe#22#Faction_3',
      NAME_CID: 'Void Crystal',
      DESCRIPTION_CID: 'A mysterious crystal with void energy',
      RARITY_CID: 4,
      TYPE_CID: 'Material',
      FACTION_CID: 3,
      COST_CID: 500,
      DURATION_CID: 0, // Instant
      CATEGORY_CID: 'Enchanting',
      LEVEL_REQUIRED_CID: 15,
      SUCCESS_RATE_CID: 60,
      REQUIREMENTS_CID: [
        { itemId: 6, amount: 10, name: 'Void Seed' },
        { itemId: 9, amount: 5, name: 'Vortex Residue' },
        { itemId: 8, amount: 2, name: 'Temporal Hourglass' }
      ],
      REWARDS_CID: [
        { itemId: 202, amount: 1, name: 'Void Crystal' }
      ]
    }
  ]

  const startCrafting = async () => {
    if (!selectedRecipe) return
    
    // Pre-craft validation
    const craftCheck = canCraftQuantity(selectedRecipe, craftingQuantity)
    if (!craftCheck.canCraft) {
      const missingItemsText = craftCheck.missingItems
        .map(item => `${item.name}: need ${item.needed}, have ${item.have}`)
        .join('\n')
      setErrorMessage(`Cannot craft ${craftingQuantity} items - insufficient materials:\n\n${missingItemsText}`)
      return
    }
    
    try {
      setCrafting(true)
      setCraftingProgress(0)
      setCurrentCraftIndex(0)
      setErrorMessage(null)
      setSuccessMessage(null)
      
      const jwtToken = getJWTToken()
      
      // Check if we have a JWT token
      if (!jwtToken) {
        console.error('No JWT token found. Please login first.')
        setErrorMessage('Authentication required. Please login to start crafting.')
        setCrafting(false)
        return
      }
      
      // If crafting quantity is 1, just do it instantly
      if (craftingQuantity === 1) {
        const payload = {
          recipeId: selectedRecipe.ID_CID,
          noobId: NOOB_ID,
          gearInstanceId: "",
          nodeIndex: 0
        }
        
        console.log('Starting single craft with payload:', payload)
        
        // Use our Next.js API route to avoid CORS issues
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
          console.error('Crafting API error:', response.status, errorText)
          throw new Error(`Crafting failed: ${response.status} - ${errorText}`)
        }
        
        const result = await response.json()
        console.log('Crafting response:', result)
        
        if (result.entities && result.entities.length > 0) {
          const instance = result.entities[0]
          setCraftingInstances(prev => [...prev, instance])
          setCraftingProgress(100)
          setSuccessMessage(`Successfully crafted ${selectedRecipe.NAME_CID}!`)
          
          // Refresh balances to show updated quantities
          fetchPlayerBalances()
          
          setTimeout(() => {
            setCrafting(false)
            setCraftingProgress(0)
            setSuccessMessage(null)
          }, 3000) // Show success for 3 seconds
        } else {
          console.error('No crafting instance returned:', result)
          setErrorMessage('Failed to start crafting. Please try again.')
          setCrafting(false)
        }
      } else {
        // Multiple quantity crafting - show progress
        console.log(`Starting batch craft: ${craftingQuantity} items`)
        
        for (let i = 0; i < craftingQuantity; i++) {
          setCurrentCraftIndex(i + 1)
          setCraftingProgress(((i + 1) / craftingQuantity) * 100)
          
          const payload = {
            recipeId: selectedRecipe.ID_CID,
            noobId: NOOB_ID,
            gearInstanceId: "",
            nodeIndex: 0
          }
          
          console.log(`Crafting item ${i + 1}/${craftingQuantity}`)
          
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
            console.error(`Crafting API error for item ${i + 1}:`, response.status, errorText)
            
            // Parse error details if possible
            let detailedError = `Crafting failed on item ${i + 1}/${craftingQuantity}`
            let isInsufficientMaterials = false
            
            try {
              const errorObj = JSON.parse(errorText)
              if (errorObj.details && errorObj.details.message) {
                detailedError += `\n\nReason: ${errorObj.details.message}`
                
                // Check if it's a material shortage (common patterns)
                const message = errorObj.details.message.toLowerCase()
                if (message.includes('insufficient') || 
                    message.includes('need') || 
                    message.includes('have 0') ||
                    message.includes('balance')) {
                  isInsufficientMaterials = true
                }
              }
            } catch (e) {
              // Error text wasn't JSON, use as is
              detailedError += `\n\nError: ${errorText}`
            }
            
            // If it's insufficient materials, stop the batch immediately
            if (isInsufficientMaterials) {
              detailedError += `\n\n❌ Stopping batch crafting - insufficient materials to continue.`
              setErrorMessage(detailedError)
              break
            }
            
            // For other errors, stop batch crafting and show error
            setErrorMessage(detailedError + `\n\n⚠️ Stopping batch crafting due to error.`)
            break
          }
          
          const result = await response.json()
          
          if (result.entities && result.entities.length > 0) {
            const instance = result.entities[0]
            setCraftingInstances(prev => [...prev, instance])
          }
          
          // Delay between crafts to avoid rate limiting and energy issues
          if (i < craftingQuantity - 1) {
            await new Promise(resolve => setTimeout(resolve, craftingDelay))
          }
        }
        
        // Finished batch crafting
        const completedItems = currentCraftIndex
        if (completedItems > 0) {
          setSuccessMessage(`Successfully crafted ${completedItems} ${selectedRecipe.NAME_CID}${completedItems > 1 ? 's' : ''}!`)
          
          // Refresh balances to show updated quantities
          fetchPlayerBalances()
        }
        setTimeout(() => {
          setCrafting(false)
          setCraftingProgress(0)
          setCurrentCraftIndex(0)
          if (completedItems > 0) {
            setSuccessMessage(null)
          }
        }, 3000)
      }
      
    } catch (error) {
      console.error('Failed to start crafting:', error)
      setErrorMessage(`Crafting failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setCrafting(false)
      setCraftingProgress(0)
      setCurrentCraftIndex(0)
    }
  }

  const getRarityColor = (rarity: number) => {
    switch (rarity) {
      case 5: return 'text-red-400 border-red-400 bg-red-400/10' // Mythic
      case 4: return 'text-yellow-400 border-yellow-400 bg-yellow-400/10' // Legendary
      case 3: return 'text-purple-400 border-purple-400 bg-purple-400/10' // Epic
      case 2: return 'text-blue-400 border-blue-400 bg-blue-400/10' // Rare
      case 1: return 'text-green-400 border-green-400 bg-green-400/10' // Uncommon
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
      default: return 'COMMON'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'alchemy': return Beaker
      case 'smithing': return Sword
      case 'enchanting': return Sparkles
      case 'engineering': return Wrench
      default: return Package
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'weapon': return Sword
      case 'armor': return Shield
      case 'consumable': return Beaker
      case 'material': return Gem
      default: return Package
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  const filteredRecipes = recipes.filter(recipe => {
    const recipeName = recipe.NAME_CID || ''
    const recipeCategory = recipe.CATEGORY_CID || ''
    
    const matchesSearch = recipeName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || recipeCategory.toLowerCase() === selectedCategory.toLowerCase()
    
    return matchesSearch && matchesCategory
  })

  const getUniqueCategories = () => {
    const categories = new Set(recipes.map(recipe => recipe.CATEGORY_CID).filter(Boolean).filter(cat => cat && cat.trim() !== ''))
    return Array.from(categories)
  }

  const getPlayerBalance = (itemId: string | number): number => {
    return playerBalances[itemId.toString()] || 0
  }

  const getMaxCraftableQuantity = (recipe: Recipe): number => {
    if (!recipe.REQUIREMENTS_CID || recipe.REQUIREMENTS_CID.length === 0) {
      return 100 // No requirements, can craft up to max
    }

    let maxQuantity = 100
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

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null
  }

  return (
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
                    <Wrench className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-cyan-400 font-mono tracking-wider neon-pulse">
                      GIGAVERSE CRAFTING
                    </h2>
                    <p className="text-cyan-300/70 font-mono">REAL BLOCKCHAIN CRAFTING SYSTEM</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={fetchPlayerBalances}
                    disabled={balancesLoading}
                    className="p-2 bg-green-400/20 border border-green-400/50 rounded text-green-400 hover:bg-green-400/30 transition-colors disabled:opacity-50"
                    title="Refresh Inventory"
                  >
                    <Package className={`w-5 h-5 ${balancesLoading ? 'animate-pulse' : ''}`} />
                  </button>
                  <button
                    onClick={fetchData}
                    className="p-2 bg-cyan-400/20 border border-cyan-400/50 rounded text-cyan-400 hover:bg-cyan-400/30 transition-colors"
                    title="Refresh All Data"
                  >
                    <RefreshCw className="w-5 h-5" />
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
              <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 min-w-64">
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 bg-black/60 border border-gray-600 rounded font-mono text-sm text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-black/60 border border-gray-600 rounded font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {getUniqueCategories().map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                {/* Stats */}
                <div className="flex items-center space-x-4 text-sm font-mono">
                  <span className="text-gray-400">
                    Recipes: <span className="text-cyan-400">{filteredRecipes.length}</span>
                  </span>
                  <span className="text-gray-400">
                    Inventory: <span className="text-green-400">{Object.keys(playerBalances).length} items</span>
                  </span>
                  <span className="text-gray-400">
                    Active: <span className="text-orange-400">{craftingInstances.length}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* Recipe List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xl font-bold text-cyan-400 font-mono mb-4">
                  AVAILABLE RECIPES ({recipes.length} total, {filteredRecipes.length} filtered)
                </h3>
                
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full mx-auto mb-4"
                      />
                      <p className="text-cyan-400 font-mono">LOADING RECIPES...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRecipes.map((recipe) => {
                      const isSelected = selectedRecipe?.ID_CID === recipe.ID_CID
                      const CategoryIcon = getCategoryIcon(recipe.CATEGORY_CID || '')
                      const TypeIcon = getTypeIcon(recipe.TYPE_CID || '')
                      

                      
                      return (
                        <motion.div
                          key={recipe._id}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => setSelectedRecipe(recipe)}
                          className={`
                            p-4 border-2 bg-black/40 backdrop-blur-sm cursor-pointer transition-all duration-300 rounded
                            ${isSelected 
                              ? 'border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-400/20' 
                              : 'border-gray-600 hover:border-cyan-400/50'
                            }
                          `}
                          style={{
                            clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)'
                          }}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <div className="p-2 bg-cyan-400/20 border border-cyan-400/50 rounded">
                                <CategoryIcon className="w-5 h-5 text-cyan-400" />
                              </div>
                              <div className="p-2 bg-gray-400/20 border border-gray-400/50 rounded">
                                <TypeIcon className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-bold font-mono text-cyan-400">
                                  {recipe.NAME_CID || `Recipe ${recipe._id}` || 'Unknown Recipe'}
                                </h4>
                                <span className={`px-2 py-1 text-xs font-mono border rounded ${getRarityColor(recipe.RARITY_CID || 0)}`}>
                                  {getRarityName(recipe.RARITY_CID || 0)}
                                </span>
                                {recipe.CATEGORY_CID && (
                                  <span className="px-2 py-1 text-xs font-mono bg-gray-400/20 border border-gray-400/50 rounded text-gray-300">
                                    {recipe.CATEGORY_CID}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-4 text-sm font-mono text-gray-400">
                                <div className="flex items-center space-x-1">
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                  <span className="text-green-400">INSTANT</span>
                                </div>
                                {recipe.SUCCESS_RATE_CID && (
                                  <div className="flex items-center space-x-1">
                                    <Star className="w-3 h-3" />
                                    <span>{recipe.SUCCESS_RATE_CID}%</span>
                                  </div>
                                )}
                                {recipe.LEVEL_REQUIRED_CID && (
                                  <div className="flex items-center space-x-1">
                                    <Zap className="w-3 h-3" />
                                    <span>Lv.{recipe.LEVEL_REQUIRED_CID}</span>
                                  </div>
                                )}
                              </div>
                              
                              {recipe.DESCRIPTION_CID && (
                                <p className="text-xs text-gray-500 font-mono mt-1 line-clamp-1">
                                  {recipe.DESCRIPTION_CID}
                                </p>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <div className="text-green-400 font-mono text-sm">
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                READY
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Crafting Panel */}
              <div className="space-y-6">
                {selectedRecipe ? (
                  <>
                    {/* Selected Recipe Details */}
                    <div className="bg-black/60 border border-cyan-400/30 p-4 rounded">
                      <h4 className="text-cyan-400 font-mono font-bold mb-4 flex items-center space-x-2">
                        <Package className="w-4 h-4" />
                        <span>RECIPE DETAILS</span>
                      </h4>
                      
                      <div className="space-y-3 text-sm font-mono">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Name:</span>
                          <span className="text-white">{selectedRecipe.NAME_CID}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Type:</span>
                          <span className="text-white">{selectedRecipe.TYPE_CID || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Category:</span>
                          <span className="text-white">{selectedRecipe.CATEGORY_CID || 'General'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Crafting:</span>
                          <span className="text-green-400">INSTANT</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Success Rate:</span>
                          <span className="text-green-400">{selectedRecipe.SUCCESS_RATE_CID || 100}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Energy Cost:</span>
                          <span className="text-orange-400">{selectedRecipe.ENERGY_CID || 0} ⚡</span>
                        </div>
                      </div>
                    </div>

                    {/* Requirements */}
                    {selectedRecipe.REQUIREMENTS_CID && selectedRecipe.REQUIREMENTS_CID.length > 0 && (
                      <div className="bg-black/60 border border-yellow-400/30 p-4 rounded">
                        <h4 className="text-yellow-400 font-mono font-bold mb-4 flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>MATERIALS REQUIRED</span>
                        </h4>
                        <div className="space-y-3">
                          {selectedRecipe.REQUIREMENTS_CID.map((req: any, index: number) => {
                            const available = getPlayerBalance(req.itemId)
                            const needed = req.amount || 1
                            const hasEnough = available >= needed
                            
                            return (
                              <div key={index} className="flex items-center justify-between">
                                <span className="text-gray-300 font-mono text-sm">{req.name || `Item #${req.itemId}`}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-400 font-mono text-xs">
                                    need {needed}
                                  </span>
                                  <span className={`font-mono text-sm ${hasEnough ? 'text-green-400' : 'text-red-400'}`}>
                                    have {available.toLocaleString()}
                                  </span>
                                  {hasEnough ? (
                                    <span className="text-green-400">✓</span>
                                  ) : (
                                    <span className="text-red-400">✗</span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Rewards */}
                    {selectedRecipe.REWARDS_CID && selectedRecipe.REWARDS_CID.length > 0 && (
                      <div className="bg-black/60 border border-green-400/30 p-4 rounded">
                        <h4 className="text-green-400 font-mono font-bold mb-4 flex items-center space-x-2">
                          <Star className="w-4 h-4" />
                          <span>REWARDS</span>
                        </h4>
                        <div className="space-y-2">
                          {selectedRecipe.REWARDS_CID.map((reward: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-gray-300 font-mono text-sm">{reward.name || `Item #${reward.itemId}`}</span>
                              <span className="text-green-400 font-mono text-sm">
                                x{reward.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity Selector */}
                    <div className="bg-black/60 border border-cyan-400/30 p-4 rounded">
                      <h4 className="text-cyan-400 font-mono font-bold mb-4 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4" />
                          <span>QUANTITY</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          Max: {getMaxCraftableQuantity(selectedRecipe)}
                        </span>
                      </h4>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => setCraftingQuantity(Math.max(1, craftingQuantity - 1))}
                          disabled={crafting}
                          className="w-8 h-8 bg-gray-700 border border-gray-600 rounded text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <div className="flex-1 text-center">
                          <input
                            type="number"
                            min="1"
                            max={getMaxCraftableQuantity(selectedRecipe)}
                            value={craftingQuantity}
                            onChange={(e) => {
                              const maxCraftable = getMaxCraftableQuantity(selectedRecipe)
                              setCraftingQuantity(Math.max(1, Math.min(maxCraftable, parseInt(e.target.value) || 1)))
                            }}
                            disabled={crafting}
                            className="w-16 px-2 py-1 bg-black/60 border border-gray-600 rounded font-mono text-center text-white focus:border-cyan-400 focus:outline-none disabled:opacity-50"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const maxCraftable = getMaxCraftableQuantity(selectedRecipe)
                            setCraftingQuantity(Math.min(maxCraftable, craftingQuantity + 1))
                          }}
                          disabled={crafting}
                          className="w-8 h-8 bg-gray-700 border border-gray-600 rounded text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                        <button
                          onClick={() => setCraftingQuantity(getMaxCraftableQuantity(selectedRecipe))}
                          disabled={crafting || getMaxCraftableQuantity(selectedRecipe) === 0}
                          className="px-3 py-1 bg-cyan-400/20 border border-cyan-400/50 rounded text-cyan-400 hover:bg-cyan-400/30 transition-colors font-mono text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          MAX
                        </button>
                      </div>
                      
                      {/* Batch crafting warning */}
                      {craftingQuantity > 1 && (
                        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded">
                          <p className="text-yellow-400 font-mono text-xs flex items-center space-x-2">
                            <AlertCircle className="w-3 h-3" />
                            <span>
                              ⚠️ Batch crafting will stop automatically if you run out of materials. 
                              Each item costs {selectedRecipe.ENERGY_CID || 3} energy.
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Crafting Progress */}
                    {crafting && (
                      <div className="bg-black/60 border border-orange-400/30 p-4 rounded">
                        <h4 className="text-orange-400 font-mono font-bold mb-4 flex items-center space-x-2">
                          <Flame className="w-4 h-4 animate-pulse" />
                          <span>CRAFTING IN PROGRESS</span>
                        </h4>
                        <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden mb-4">
                          <motion.div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-600 to-orange-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${craftingProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <Timer className="w-4 h-4 text-orange-400" />
                          <span className="text-orange-400 font-mono text-sm">
                            {craftingQuantity === 1 
                              ? `${Math.round(craftingProgress)}% COMPLETE`
                              : `${currentCraftIndex}/${craftingQuantity} ITEMS (${Math.round(craftingProgress)}%)`
                            }
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-900/30 border border-red-400/50 p-4 rounded"
                      >
                        <h4 className="text-red-400 font-mono font-bold mb-2 flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>CRAFTING ERROR</span>
                        </h4>
                        <p className="text-red-300 font-mono text-sm whitespace-pre-line">
                          {errorMessage}
                        </p>
                        <button
                          onClick={() => setErrorMessage(null)}
                          className="mt-3 px-3 py-1 bg-red-400/20 border border-red-400/50 rounded text-red-400 hover:bg-red-400/30 transition-colors font-mono text-xs"
                        >
                          DISMISS
                        </button>
                      </motion.div>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-green-900/30 border border-green-400/50 p-4 rounded"
                      >
                        <h4 className="text-green-400 font-mono font-bold mb-2 flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>CRAFTING SUCCESS</span>
                        </h4>
                        <p className="text-green-300 font-mono text-sm">
                          {successMessage}
                        </p>
                      </motion.div>
                    )}

                    {/* Craft Button */}
                    {(() => {
                      const craftCheck = canCraftQuantity(selectedRecipe, craftingQuantity)
                      const canCraft = craftCheck.canCraft
                      
                      return (
                        <button
                          onClick={startCrafting}
                          disabled={crafting || !canCraft}
                          className={`
                            w-full p-4 border-2 font-mono font-bold tracking-wider transition-all duration-300 rounded
                            ${crafting 
                              ? 'border-orange-400 text-orange-400 bg-orange-400/10' 
                              : canCraft
                                ? 'border-green-400 text-green-400 hover:bg-green-400/10 hover:shadow-lg hover:shadow-green-400/20'
                                : 'border-red-400 text-red-400 bg-red-400/10'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                          `}
                          style={{
                            clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)'
                          }}
                        >
                          {crafting ? (
                            <div className="flex items-center justify-center space-x-2">
                              <Flame className="w-5 h-5 animate-pulse" />
                              <span>
                                {craftingQuantity === 1 ? 'CRAFTING...' : `CRAFTING ${craftingQuantity} ITEMS...`}
                              </span>
                            </div>
                          ) : !canCraft ? (
                            <div className="flex items-center justify-center space-x-2">
                              <AlertCircle className="w-5 h-5" />
                              <span>INSUFFICIENT MATERIALS</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <Play className="w-5 h-5" />
                              <span>
                                {craftingQuantity === 1 ? 'START CRAFTING' : `CRAFT ${craftingQuantity} ITEMS`}
                              </span>
                              <ArrowRight className="w-5 h-5" />
                            </div>
                          )}
                        </button>
                      )
                    })()}
                  </>
                ) : (
                  <div className="bg-black/60 border border-gray-600 p-8 rounded text-center">
                    <Wrench className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-mono">SELECT A RECIPE TO BEGIN</p>
                    <p className="text-gray-500 font-mono text-sm mt-2">
                      Choose from {filteredRecipes.length} available recipes
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-cyan-400/20 p-4 bg-black/40">
              <div className="flex items-center justify-between text-sm font-mono">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400">
                    Wallet: <span className="text-cyan-400">{WALLET_ADDRESS.slice(0, 6)}...{WALLET_ADDRESS.slice(-4)}</span>
                  </span>
                  <span className="text-gray-400">
                    Noob ID: <span className="text-cyan-400">{NOOB_ID}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400">LIVE BLOCKCHAIN DATA</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CraftingStation 