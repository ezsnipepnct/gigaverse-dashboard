import { NextRequest, NextResponse } from 'next/server'

const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"

interface ROM {
  romId: string
  energy: number
  maxEnergy: number
  percentage: number
}

interface ClaimResult {
  success: boolean
  totalClaimed: number
  claimedRoms: Array<{ id: string; amount: number }>
  errors: Array<{ id: string; error: string }>
}

async function getSortedRoms(jwtToken: string): Promise<ROM[]> {
  console.log(`Fetching ROMs for wallet: ${WALLET_ADDRESS}`)
  
  const response = await fetch(`https://gigaverse.io/api/roms/player/${WALLET_ADDRESS.toLowerCase()}`, {
    headers: {
      'accept': '*/*',
      'content-type': 'application/json',
      'authorization': `Bearer ${jwtToken}`,
      'origin': 'https://gigaverse.io',
      'referer': 'https://gigaverse.io/play',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    }
  })
  
  if (!response.ok) {
    console.error(`Failed to fetch ROM data: ${response.status}`)
    return []
  }
  
  const data = await response.json()
  const roms: ROM[] = []
  
  for (const entity of data.entities || []) {
    const stats = entity.factoryStats || {}
    const energy = stats.energyCollectable || 0
    const maxEnergy = stats.maxEnergy || 0
    
    if (maxEnergy > 0) {  // Only include ROMs with valid maxEnergy
      roms.push({
        romId: entity.docId,
        energy: energy,
        maxEnergy: maxEnergy,
        percentage: energy / maxEnergy
      })
    }
  }
  
  // Sort ROMs by percentage full (highest first) - this prioritizes full ROMs
  const sortedRoms = roms.sort((a, b) => b.percentage - a.percentage)
  
  console.log(`Found ${sortedRoms.length} ROMs. Top 5 by energy percentage:`)
  sortedRoms.slice(0, 5).forEach(rom => {
    console.log(`  ROM ${rom.romId}: ${rom.energy}/${rom.maxEnergy} (${(rom.percentage * 100).toFixed(1)}%)`)
  })
  
  return sortedRoms
}

async function claimEnergyFromRom(romId: string, jwtToken: string): Promise<{ success: boolean; error?: string }> {
  const payload = { romId: romId, claimId: "energy" }
  
  try {
    const response = await fetch("https://gigaverse.io/api/roms/factory/claim", {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'authorization': `Bearer ${jwtToken}`,
        'origin': 'https://gigaverse.io',
        'referer': 'https://gigaverse.io/play',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(payload)
    })
    
    if (response.ok) {
      const result = await response.json()
      return { success: result.success || true }
    } else {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function claimEnergy(jwtToken: string, threshold: number = 200): Promise<ClaimResult> {
  console.log('\n=== Claiming Energy ===')
  
  const sortedRoms = await getSortedRoms(jwtToken)
  
  if (sortedRoms.length === 0) {
    return {
      success: false,
      totalClaimed: 0,
      claimedRoms: [],
      errors: [{ id: 'general', error: 'No ROM data available' }]
    }
  }
  
  let totalClaimed = 0
  const claimedRoms: Array<{ id: string; amount: number }> = []
  const errors: Array<{ id: string; error: string }> = []
  
  for (const rom of sortedRoms) {
    const energy = rom.energy
    
    if (energy < 10) {  // Skip if energy is too low
      console.log(`  Skipping ROM ${rom.romId} (energy: ${energy}) - below minimum threshold.`)
      continue
    }
    
    // Check if claiming this ROM would exceed our target threshold
    if (totalClaimed + energy > threshold) {
      console.log(`  Skipping ROM ${rom.romId} (${energy} energy) - would exceed threshold (${totalClaimed} + ${energy} > ${threshold})`)
      continue
    }
    
    console.log(`  Claiming energy from ROM ${rom.romId} (${energy} energy, ${(rom.percentage * 100).toFixed(1)}% full)...`)
    
    const result = await claimEnergyFromRom(rom.romId, jwtToken)
    
    if (result.success) {
      console.log(`  ✅ Claimed ${energy} energy from ROM ${rom.romId}`)
      totalClaimed += energy
      claimedRoms.push({ id: rom.romId, amount: energy })
      
      // Check if we've reached our target exactly
      if (totalClaimed >= threshold) {
        console.log(`  Reached energy threshold (${threshold}). Stopping claims.`)
        break
      }
    } else {
      console.log(`  ❌ Failed to claim energy from ROM ${rom.romId}: ${result.error}`)
      errors.push({ id: rom.romId, error: result.error || 'Unknown error' })
    }
    
    // Delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log(`\nTotal energy claimed: ${totalClaimed}`)
  
  return {
    success: totalClaimed > 0 || errors.length === 0,
    totalClaimed,
    claimedRoms,
    errors
  }
}

export async function POST(request: NextRequest) {
  try {
    const { threshold = 200 } = await request.json()
    
    // Get JWT token from Authorization header
    const authorization = request.headers.get('Authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No valid authorization token provided' }, { status: 401 })
    }
    
    const jwtToken = authorization.substring(7) // Remove 'Bearer ' prefix
    
    console.log(`Starting energy claim process with threshold: ${threshold}`)
    
    const result = await claimEnergy(jwtToken, threshold)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        energy: {
          total: result.totalClaimed,
          claimed_roms: result.claimedRoms
        },
        errors: result.errors.length > 0 ? result.errors : undefined
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Energy claiming failed',
        details: result.errors
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error claiming energy:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to claim energy',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 