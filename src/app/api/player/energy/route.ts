import { NextRequest, NextResponse } from 'next/server'

// Single source of truth for the wallet we display on the dashboard
const WALLET_ADDRESS = '0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.log('❌ No authorization header provided for player energy')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
    console.log('⚡ Fetching player energy for', WALLET_ADDRESS)

    // Primary endpoint: offchain energy by wallet (most reliable for current/max)
    const offchainUrl = `https://gigaverse.io/api/offchain/player/energy/${WALLET_ADDRESS}`
    const offchainRes = await fetch(offchainUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'accept': '*/*',
        'content-type': 'application/json'
      }
    })
    console.log('🌐 Offchain energy status:', offchainRes.status)

    let energyValue: number | undefined
    let maxEnergy: number | undefined
    let regenPerHour: number | undefined
    let isPlayerJuiced: boolean | undefined

    if (offchainRes.ok) {
      const offData = await offchainRes.json()
      console.log('🔍 Offchain energy payload:', JSON.stringify(offData).slice(0, 400))

      // Preferred: normalized structure with entities[].parsedData
      const parsed = offData?.entities?.[0]?.parsedData
      if (parsed) {
        energyValue = parsed.energyValue ?? parsed.energy ?? 0
        maxEnergy = parsed.maxEnergy ?? 420
        regenPerHour = parsed.regenPerHour ?? parsed.regenerationRate ?? 0
        isPlayerJuiced = parsed.isPlayerJuiced ?? false
      } else {
        // Fallback: try direct keys if structure differs
        energyValue = offData.energy ?? offData.currentEnergy ?? offData.value ?? offData.Energy ?? 0
        maxEnergy = offData.maxEnergy ?? offData.max ?? 420
        regenPerHour = offData.regenPerHour ?? offData.regenerationRate ?? 0
        isPlayerJuiced = offData.isPlayerJuiced ?? false
      }
    } else {
      console.warn('Offchain energy fetch failed; will try player endpoint as fallback.')
    }

    // Secondary endpoint (legacy): may return a document list; keep as fallback
    if (energyValue === undefined || maxEnergy === undefined) {
      const legacyRes = await fetch('https://gigaverse.io/api/player/energy', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': '*/*'
        }
      })
      console.log('🌐 Legacy player energy status:', legacyRes.status)
      if (legacyRes.ok) {
        const legacy = await legacyRes.json()
        // If this returns entities[].parsedData, pass through as-is
        if (legacy?.entities?.[0]?.parsedData) {
          return NextResponse.json(legacy)
        }
      }
    }

    // Build unified response in entities[].parsedData shape for the UI
    const unified = {
      entities: [
        {
          ENERGY_CID: 0,
          TIMESTAMP_CID: Date.now(),
          parsedData: {
            energyValue: Number(energyValue ?? 0),
            maxEnergy: Number(maxEnergy ?? 420),
            regenPerHour: Number(regenPerHour ?? 0),
            isPlayerJuiced: Boolean(isPlayerJuiced ?? false)
          }
        }
      ]
    }
    return NextResponse.json(unified)
  } catch (error) {
    console.error('💥 Error fetching player energy:', error)
    // Last-resort safe default to prevent UI noise
    const fallback = {
      entities: [
        {
          ENERGY_CID: 0,
          TIMESTAMP_CID: Date.now(),
          parsedData: { energyValue: 0, maxEnergy: 420, regenPerHour: 0, isPlayerJuiced: false }
        }
      ]
    }
    return NextResponse.json(fallback)
  }
}