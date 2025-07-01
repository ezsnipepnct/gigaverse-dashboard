import { NextRequest, NextResponse } from 'next/server'

const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"

// JWT Token management - now gets token from request headers
const getJWTToken = (request: NextRequest) => {
  // First try to get from Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Fallback to hardcoded token for backward compatibility
  const hardcodedToken = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwidXNlciI6eyJfaWQiOiI2N2I5MjE1YTEwOGFlZGRiNDA5YTdlNzMiLCJ3YWxsZXRBZGRyZXNzIjoiMHhiMGQ5MGQ1MmM3Mzg5ODI0ZDRiMjJjMDZiY2RjY2Q3MzRlMzE2MmI3IiwidXNlcm5hbWUiOiIweGIwZDkwRDUyQzczODk4MjRENEIyMmMwNmJjZGNjRDczNEUzMTYyYjciLCJjYXNlU2Vuc2l0aXZlQWRkcmVzcyI6IjB4YjBkOTBENTJDNzM4OTgyNEQ0QjIyYzA2YmNkY0NENzM0RTMxNjJiNyIsIl9fdiI6MH0sImdhbWVBY2NvdW50Ijp7Im5vb2IiOnsiX2lkIjoiNjdiOTIxNzRlM2MzOWRjYTZmZGFkZjA5IiwiZG9jSWQiOiIyMTQyNCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiTEFTVF9UUkFOU0ZFUl9USU1FX0NJRCI6MTc0MDE4NTk2NCwiY3JlYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMi45NDZaIiwidXBkYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMy4xNjVaIiwiTEVWRUxfQ0lEIjoxLCJJU19OT09CX0NJRCI6dHJ1ZSwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJPV05FUl9DSUQiOiIweGIwZDkwZDUyYzczODk4MjRkNGIyMmMwNmJjZGNjZDczNGUzMTYyYjciLCJhbGxvd2VkVG9DcmVhdGVBY2NvdW50Ijp0cnVlLCJjYW5FbnRlckdhbWUiOnRydWUsIm5vb2JQYXNzQmFsYW5jZSI6MCwibGFzdE5vb2JJZCI6NzM4ODQsIm1heE5vb2JJZCI6MTAwMDB9LCJleHAiOjE3NTAxMTY0MzF9.M26R6pDnFSSIbMXHa6kOhT_Hrjn3U7nkm_sGv0rY0uY"
  return hardcodedToken
}

async function getSortedROMs(request: NextRequest) {
  const jwtToken = getJWTToken(request)
  const url = `https://gigaverse.io/api/roms/player/${WALLET_ADDRESS.toLowerCase()}`
  
  console.log(`Fetching ROMs for wallet: ${WALLET_ADDRESS}`)
  
  const response = await fetch(url, {
    headers: {
      'accept': '*/*',
      'content-type': 'application/json',
      'authorization': `Bearer ${jwtToken}`
    }
  })
  
  if (!response.ok) {
    console.error(`Failed to fetch ROM data: ${response.status}`)
    return []
  }
  
  const data = await response.json()
  const roms = []
  
  for (const entity of data.entities || []) {
    const stats = entity.factoryStats || {}
    const rom = {
      RomID: entity.docId,
      Energy: stats.energyCollectable || 0,
      Dust: stats.dustCollectable || 0,
      Shards: stats.shardCollectable || 0
    }
    roms.push(rom)
  }
  
  // Sort by energy (highest first)
  return roms.sort((a, b) => (b.Energy || 0) - (a.Energy || 0))
}

async function claimEnergyFromROMs(sortedROMs: any[], threshold: number = 200, request: NextRequest) {
  const jwtToken = getJWTToken(request)
  const url = "https://gigaverse.io/api/roms/factory/claim"
  let totalClaimed = 0
  const claimedROMs = []
  
  console.log("=== Claiming Energy ===")
  
  for (const rom of sortedROMs) {
    const energy = rom.Energy || 0
    if (energy < 10) {
      console.log(`Skipping ROM ${rom.RomID} (energy: ${energy}) - below minimum threshold.`)
      continue
    }
    
    if (totalClaimed >= threshold) {
      console.log(`Reached energy threshold (${threshold}). Stopping claims.`)
      break
    }
    
    const payload = { romId: rom.RomID, claimId: "energy" }
    
    console.log(`Claiming energy from ROM ${rom.RomID} (${energy} energy)...`)
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'content-type': 'application/json',
          'authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(payload)
      })
      
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          console.log(`✅ Claimed ${energy} energy from ROM ${rom.RomID}`)
          totalClaimed += energy
          claimedROMs.push({ id: rom.RomID, amount: energy })
        } else {
          console.error(`❌ Failed to claim energy from ROM ${rom.RomID}: ${response.status}`)
        }
      } else {
        console.error(`❌ Failed to claim energy from ROM ${rom.RomID}: ${response.status}`)
      }
    } catch (error) {
      console.error(`❌ Error claiming energy from ROM ${rom.RomID}:`, error)
    }
  }
  
  console.log(`Total energy claimed: ${totalClaimed}`)
  
  return { total: totalClaimed, claimed_roms: claimedROMs }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { threshold = 200 } = body
    
    console.log("📦 RESOURCE CLAIMING PROCESS 📦")
    console.log("Fetching ROM data...")
    
    const sortedROMs = await getSortedROMs(request)
    
    if (!sortedROMs || sortedROMs.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No ROM data available"
      })
    }
    
    console.log(`✅ Found ${sortedROMs.length} ROMs`)
    
    const energyResult = await claimEnergyFromROMs(sortedROMs, threshold, request)
    
    console.log("📦 CLAIMING PROCESS COMPLETE 📦")
    
    return NextResponse.json({
      success: true,
      energy: energyResult,
      message: `Successfully claimed ${energyResult.total} energy from ${energyResult.claimed_roms.length} ROMs`
    })
    
  } catch (error) {
    console.error('Energy claiming error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 