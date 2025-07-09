import { NextRequest, NextResponse } from 'next/server'

// Potion type definitions based on CLI bot implementation
const POTION_TYPES = {
  // Health Potions
  131: { name: 'Big Heal Juice', heal: 20, type: 'health' },
  155: { name: 'Mid Heal Juice', heal: 12, type: 'health' },
  151: { name: 'Lil Heal Juice', heal: 6, type: 'health' },
  
  // Other Consumables
  132: { name: 'Big Charge Juice', heal: 0, type: 'charge' },
  156: { name: 'Mid Charge Juice', heal: 0, type: 'charge' },
  130: { name: 'Big Boom Juice', heal: 0, type: 'damage' },
  154: { name: 'Mid Boom Juice', heal: 0, type: 'damage' },
  150: { name: 'Lil Boom Juice', heal: 0, type: 'damage' },
  157: { name: 'Mid Armor Juice', heal: 0, type: 'defense' },
  133: { name: 'Transfuser', heal: 0, type: 'special' }
} as const

interface PotionUsageAnalysis {
  shouldUse: boolean
  potionSlot?: number
  potionInfo?: {
    item_id: number
    heal_amount: number
    name: string
    efficiency: number
  }
  reasoning: string
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      console.log('❌ No authorization header provided for potions')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    console.log('🧪 Fetching potion inventory with auth header:', authHeader.substring(0, 20) + '...')

    // Extract token from Bearer header
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

    // Make the API call to get player inventory
    const response = await fetch('https://gigaverse.io/api/player/inventory', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      }
    })

    console.log('🌐 Gigaverse API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Potion inventory API error:', response.status, response.statusText)

      // Return mock potion data for development
      const mockPotions = {
        inventory: [
          { itemId: 131, balance: 5, name: 'Big Heal Juice', type: 'health', heal: 20 },
          { itemId: 155, balance: 3, name: 'Mid Heal Juice', type: 'health', heal: 12 },
          { itemId: 151, balance: 2, name: 'Lil Heal Juice', type: 'health', heal: 6 },
          { itemId: 132, balance: 4, name: 'Big Charge Juice', type: 'charge', heal: 0 },
          { itemId: 130, balance: 1, name: 'Big Boom Juice', type: 'damage', heal: 0 }
        ]
      }
      
      console.log('📊 Returning mock potion data:', mockPotions)
      return NextResponse.json(mockPotions)
    }

    const data = await response.json()
    
    // Filter and enhance potion data
    const potions = data.inventory?.filter((item: any) => 
      POTION_TYPES[item.itemId as keyof typeof POTION_TYPES]
    ).map((item: any) => {
      const potionInfo = POTION_TYPES[item.itemId as keyof typeof POTION_TYPES]
      return {
        ...item,
        ...potionInfo
      }
    }) || []

    console.log('✅ Filtered potion inventory:', potions)

    return NextResponse.json({ potions })
  } catch (error) {
    console.error('💥 Error fetching potion inventory:', error)
    
    // Return mock data for development
    const mockPotions = {
      potions: [
        { itemId: 131, balance: 5, name: 'Big Heal Juice', type: 'health', heal: 20 },
        { itemId: 155, balance: 3, name: 'Mid Heal Juice', type: 'health', heal: 12 },
        { itemId: 151, balance: 2, name: 'Lil Heal Juice', type: 'health', heal: 6 },
        { itemId: 132, balance: 4, name: 'Big Charge Juice', type: 'charge', heal: 0 },
        { itemId: 130, balance: 1, name: 'Big Boom Juice', type: 'damage', heal: 0 }
      ]
    }
    
    console.log('📊 Returning fallback mock potion data due to error:', mockPotions)
    return NextResponse.json(mockPotions)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, gameState, selectedPotions, entityData } = await request.json()
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

    console.log(`🧪 Potion API - Action: ${action}`)

    if (action === 'analyze_usage') {
      // Analyze whether to use a potion based on game state
      if (!gameState || !entityData) {
        return NextResponse.json({ error: 'Missing game state or entity data' }, { status: 400 })
      }

      const analysis = analyzePotionUsage(gameState, entityData)
      
      console.log('🔍 Potion usage analysis:', analysis)
      
      return NextResponse.json({
        success: true,
        analysis
      })
    }

    if (action === 'select_for_run') {
      // Handle potion selection for a dungeon run
      if (!selectedPotions || !Array.isArray(selectedPotions)) {
        return NextResponse.json({ error: 'Invalid potion selection' }, { status: 400 })
      }

      // Validate selected potions
      const validatedPotions = selectedPotions.map((potionId: number) => {
        if (potionId === 0) return 0 // Empty slot
        
        const potionInfo = POTION_TYPES[potionId as keyof typeof POTION_TYPES]
        if (!potionInfo) {
          throw new Error(`Unknown potion ID: ${potionId}`)
        }
        
        return potionId
      })

      console.log('✅ Validated potion selection:', validatedPotions)

      return NextResponse.json({
        success: true,
        selectedPotions: validatedPotions,
        potionDetails: validatedPotions.map(id => 
          id === 0 ? null : POTION_TYPES[id as keyof typeof POTION_TYPES]
        )
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (error) {
    console.error('Potion API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

// Smart potion usage analysis based on CLI bot logic
function analyzePotionUsage(gameState: any, entityData: any): PotionUsageAnalysis {
  const availablePotions = extractAvailablePotions(entityData)
  
  if (Object.keys(availablePotions).length === 0) {
    return {
      shouldUse: false,
      reasoning: 'No potions available'
    }
  }

  const healthPotions = Object.entries(availablePotions).filter(([_, potion]) => 
    POTION_TYPES[potion.item_id as keyof typeof POTION_TYPES]?.type === 'health'
  )

  if (healthPotions.length === 0) {
    return {
      shouldUse: false,
      reasoning: 'No health potions available'
    }
  }

  // Calculate risk factors
  const deathRisk = calculateDeathRisk(gameState)
  const healthRatio = gameState.player_health / gameState.player_max_health
  const effectiveHealth = gameState.player_health + gameState.player_shield
  
  // Get enemy's highest damage potential
  const maxEnemyDamage = Math.max(...Object.values(gameState.enemy_move_stats).map((s: any) => s.damage))
  
  // Find best health potion to use
  let bestPotion: any = null
  let bestSlot = -1
  let bestEfficiency = 0
  
  for (const [slot, potionInfo] of healthPotions) {
    const healAmount = POTION_TYPES[potionInfo.item_id as keyof typeof POTION_TYPES]?.heal || 0
    const efficiency = calculateHealingEfficiency(gameState, healAmount)
    
    if (efficiency > bestEfficiency) {
      bestEfficiency = efficiency
      bestPotion = potionInfo
      bestSlot = parseInt(slot)
    }
  }

  if (!bestPotion) {
    return {
      shouldUse: false,
      reasoning: 'No suitable health potion found'
    }
  }

  // Current enemy position (assuming 4 enemies per floor)
  const currentEnemyNumber = ((gameState.current_floor - 1) * 4) + gameState.current_room
  const isFinalBoss = (gameState.current_floor === 4 && gameState.current_room === 4)

  // ULTRA-CONSERVATIVE POTION LOGIC - SAVE FOR FINAL BOSS
  
  // ABSOLUTE EMERGENCY: Will die in the NEXT attack (immediate death)
  if (effectiveHealth <= maxEnemyDamage) {
    return {
      shouldUse: true,
      potionSlot: bestSlot,
      potionInfo: {
        item_id: bestPotion.item_id,
        heal_amount: POTION_TYPES[bestPotion.item_id as keyof typeof POTION_TYPES]?.heal || 0,
        name: POTION_TYPES[bestPotion.item_id as keyof typeof POTION_TYPES]?.name || 'Unknown',
        efficiency: bestEfficiency
      },
      reasoning: `💀 ABSOLUTE EMERGENCY: ${effectiveHealth} ≤ ${maxEnemyDamage} enemy damage - WILL DIE NEXT ATTACK!`
    }
  }

  // EARLY GAME (Enemies 1-15): ONLY use if absolutely required to prevent death
  if (!isFinalBoss) {
    // Only use if will die in next 2 attacks AND health is critically low (< 25%)
    if (effectiveHealth <= maxEnemyDamage * 2 && healthRatio < 0.25) {
      return {
        shouldUse: true,
        potionSlot: bestSlot,
        potionInfo: {
          item_id: bestPotion.item_id,
          heal_amount: POTION_TYPES[bestPotion.item_id as keyof typeof POTION_TYPES]?.heal || 0,
          name: POTION_TYPES[bestPotion.item_id as keyof typeof POTION_TYPES]?.name || 'Unknown',
          efficiency: bestEfficiency
        },
        reasoning: `🚨 EARLY GAME EMERGENCY: Enemy #${currentEnemyNumber}/16, Health ${(healthRatio*100).toFixed(1)}% < 25%, could die in 2 hits - ABSOLUTELY REQUIRED!`
      }
    } else {
      return {
        shouldUse: false,
        reasoning: `⏸️ EARLY GAME HOLD: Enemy #${currentEnemyNumber}/16, Health ${(healthRatio*100).toFixed(1)}%, saving for final boss (survives: ${effectiveHealth} > ${maxEnemyDamage})`
      }
    }
  }

  // FINAL BOSS (Floor 4 Room 4): Can use strategic logic
  console.log('👑 FINAL BOSS FIGHT: Floor 4 Room 4 - Strategic potion usage allowed')
  
  // More aggressive on final boss - use if health < 60% or risky situation
  if (healthRatio < 0.6 || effectiveHealth <= maxEnemyDamage * 2) {
    return {
      shouldUse: true,
      potionSlot: bestSlot,
      potionInfo: {
        item_id: bestPotion.item_id,
        heal_amount: POTION_TYPES[bestPotion.item_id as keyof typeof POTION_TYPES]?.heal || 0,
        name: POTION_TYPES[bestPotion.item_id as keyof typeof POTION_TYPES]?.name || 'Unknown',
        efficiency: bestEfficiency
      },
      reasoning: `🔴 FINAL BOSS STRATEGY: Health ${(healthRatio*100).toFixed(1)}% or risky situation - USING POTION!`
    }
  } else {
    return {
      shouldUse: false,
      reasoning: `⏸️ FINAL BOSS HOLD: Health sufficient for final encounter`
    }
  }
}

// Helper functions
function extractAvailablePotions(entityData: any): { [slot: number]: { item_id: number } } {
  const consumables = entityData.GAME_ITEM_ID_CID_array || []
  const potions: { [slot: number]: { item_id: number } } = {}
  
  consumables.forEach((itemId: number, index: number) => {
    if (itemId !== 0) {
      potions[index] = { item_id: itemId }
    }
  })
  
  return potions
}

function calculateDeathRisk(gameState: any): number {
  const playerEffectiveHealth = gameState.player_health + gameState.player_shield
  const maxEnemyDamage = Math.max(...Object.values(gameState.enemy_move_stats).map((s: any) => s.damage))
  
  if (playerEffectiveHealth <= maxEnemyDamage) {
    return 1.0  // Critical - could die in one hit
  } else if (playerEffectiveHealth <= maxEnemyDamage * 2) {
    return 0.8  // High risk - could die in two hits
  } else if (playerEffectiveHealth <= maxEnemyDamage * 3) {
    return 0.4  // Medium risk
  } else {
    return 0.1  // Low risk
  }
}

function calculateHealingEfficiency(gameState: any, healAmount: number): number {
  const currentHealth = gameState.player_health
  const maxHealth = gameState.player_max_health
  
  const missingHealth = maxHealth - currentHealth
  if (missingHealth <= 0) {
    return 0.0  // No healing needed
  }
  
  const usableHealing = Math.min(healAmount, missingHealth)
  return usableHealing / healAmount
} 