import { NextRequest, NextResponse } from 'next/server'

const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet') || WALLET_ADDRESS
    
    // Get JWT token from request headers or use hardcoded fallback
    const authHeader = request.headers.get('authorization')
    const jwtToken = authHeader?.replace('Bearer ', '') || ''
    
    if (!jwtToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'JWT token required' 
      }, { status: 401 })
    }
    
    console.log(`Fetching ROM data for wallet: ${wallet}`)
    
    const response = await fetch(`https://gigaverse.io/api/roms/player/${wallet.toLowerCase()}`, {
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
      console.error(`ROM API error: ${response.status}`)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to fetch ROM data: ${response.status}` 
      }, { status: response.status })
    }
    
    const data = await response.json()
    console.log('ROM API response:', data)
    
    // Process ROM data
    const roms = []
    let totalEnergy = 0
    let totalShards = 0
    let totalDust = 0
    let totalClaimableEnergy = 0
    let totalClaimableShards = 0
    let totalClaimableDust = 0
    
    for (const entity of data.entities || []) {
      const stats = entity.factoryStats || {}
      
      // Extract actual production rates from factoryStats
      // Based on the real API response structure
      const weeklyEnergyRate = stats.maxEnergy || 0  // Max energy capacity per week
      const weeklyShardRate = stats.shardProductionPerWeek || 0
      const weeklyDustRate = stats.dustProductionPerWeek || 0
      
      // Currently claimable amounts
      const energyClaimable = stats.energyCollectable || 0
      const shardsClaimable = stats.shardCollectable || 0
      const dustClaimable = stats.dustCollectable || 0
      
      const rom = {
        romId: entity.docId,
        name: entity.name || `ROM #${entity.docId}`,
        tier: stats.tier || 'Bronze',
        rarity: stats.tier || 'Common',
        // Actual weekly production rates from API
        energyRate: weeklyEnergyRate,
        shardsRate: weeklyShardRate,
        dustRate: weeklyDustRate,
        // Currently claimable amounts
        energyClaimable: energyClaimable,
        shardsClaimable: shardsClaimable,
        dustClaimable: dustClaimable,
        // Last claim timestamp
        lastClaim: stats.lastClaimTimestamp || entity.LAST_TRANSFER_TIME_CID || 0,
        // Additional metadata from factoryStats
        image: entity.image || '',
        description: entity.description || `${stats.tier} ROM - ${stats.memory} - ${stats.faction}`,
        memory: stats.memory || '',
        faction: stats.faction || '',
        serialNumber: stats.serialNumber || ''
      }
      
      roms.push(rom)
      
      // Add to totals
      totalEnergy += weeklyEnergyRate
      totalShards += weeklyShardRate
      totalDust += weeklyDustRate
      totalClaimableEnergy += energyClaimable
      totalClaimableShards += shardsClaimable
      totalClaimableDust += dustClaimable
    }
    
    // Sort ROMs by energy production (highest first)
    roms.sort((a, b) => b.energyRate - a.energyRate)
    
    const summary = {
      totalRoms: roms.length,
      totalWeeklyProduction: {
        energy: totalEnergy,
        shards: totalShards,
        dust: totalDust
      },
      totalClaimable: {
        energy: totalClaimableEnergy,
        shards: totalClaimableShards,
        dust: totalClaimableDust
      },
      dailyProduction: {
        energy: Math.round(totalEnergy / 7),
        shards: Math.round(totalShards / 7),
        dust: Math.round(totalDust / 7)
      }
    }
    
    return NextResponse.json({
      success: true,
      roms,
      summary
    })
    
  } catch (error) {
    console.error('Error fetching ROM data:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 