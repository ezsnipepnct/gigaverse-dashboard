import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      console.log('❌ No authorization header provided for dungeon progress')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    console.log('🎯 Fetching dungeon progress with auth header:', authHeader.substring(0, 20) + '...')

    // Extract token from Bearer header
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

    // Make the API call exactly like Postman
    const response = await fetch('https://gigaverse.io/api/game/dungeon/today', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      }
    })

    console.log('🌐 Gigaverse API response status:', response.status)
    console.log('🌐 Gigaverse API response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Dungeon progress API error:', response.status, response.statusText)
      console.error('❌ Error response body:', errorText)

      // Return mock data that matches the real API structure
      const mockData = {
        dayProgressEntities: [],
        dungeonDataEntities: [
          {
            ID_CID: 1,
            NAME_CID: "Dungetron 5000",
            ENERGY_CID: 40,
            UINT256_CID: 10,
            CHECKPOINT_CID: -1,
            juicedMaxRunsPerDay: 12
          },
          {
            ID_CID: 2,
            NAME_CID: "Gigus Dungeon",
            ENERGY_CID: 200,
            UINT256_CID: 30,
            CHECKPOINT_CID: -1,
            juicedMaxRunsPerDay: 30
          },
          {
            ID_CID: 3,
            NAME_CID: "Dungetron Underhaul",
            ENERGY_CID: 40,
            UINT256_CID: 8,
            CHECKPOINT_CID: 2,
            juicedMaxRunsPerDay: 9
          }
        ]
      }
      
      console.log('📊 Returning mock dungeon data:', mockData)
      return NextResponse.json(mockData)
    }

    const data = await response.json()
    console.log('✅ Dungeon progress API response:', JSON.stringify(data, null, 2))

    return NextResponse.json(data)
  } catch (error) {
    console.error('💥 Error fetching dungeon progress:', error)
    
    // Return mock data that matches the real API structure
    const mockData = {
      dayProgressEntities: [],
      dungeonDataEntities: [
        {
          ID_CID: 1,
          NAME_CID: "Dungetron 5000",
          ENERGY_CID: 40,
          UINT256_CID: 10,
          CHECKPOINT_CID: -1,
          juicedMaxRunsPerDay: 12
        },
        {
          ID_CID: 2,
          NAME_CID: "Gigus Dungeon",
          ENERGY_CID: 200,
          UINT256_CID: 30,
          CHECKPOINT_CID: -1,
          juicedMaxRunsPerDay: 30
        },
        {
          ID_CID: 3,
          NAME_CID: "Dungetron Underhaul",
          ENERGY_CID: 40,
          UINT256_CID: 8,
          CHECKPOINT_CID: 2,
          juicedMaxRunsPerDay: 9
        }
      ]
    }
    
    console.log('📊 Returning fallback mock data due to error:', mockData)
    return NextResponse.json(mockData)
  }
} 