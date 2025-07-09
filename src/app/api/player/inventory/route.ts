import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      console.log('❌ No authorization header provided for inventory')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    console.log('🎒 Fetching player inventory with auth header:', authHeader.substring(0, 20) + '...')

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
      console.error('❌ Player inventory API error:', response.status, response.statusText)
      console.error('❌ Error response body:', errorText)

      // Return mock inventory data for development
      const mockData = {
        inventory: [
          { itemId: 131, balance: 5, name: 'Big Heal Juice', type: 'health', heal: 20 },
          { itemId: 155, balance: 3, name: 'Mid Heal Juice', type: 'health', heal: 12 },
          { itemId: 151, balance: 2, name: 'Lil Heal Juice', type: 'health', heal: 6 },
          { itemId: 132, balance: 4, name: 'Big Charge Juice', type: 'charge', heal: 0 },
          { itemId: 130, balance: 1, name: 'Big Boom Juice', type: 'damage', heal: 0 }
        ]
      }
      
      console.log('📊 Returning mock inventory data:', mockData)
      return NextResponse.json(mockData)
    }

    const data = await response.json()
    console.log('✅ Player inventory API response:', JSON.stringify(data, null, 2))

    return NextResponse.json(data)
  } catch (error) {
    console.error('💥 Error fetching player inventory:', error)
    
    // Return mock data for development
    const mockData = {
      inventory: [
        { itemId: 131, balance: 5, name: 'Big Heal Juice', type: 'health', heal: 20 },
        { itemId: 155, balance: 3, name: 'Mid Heal Juice', type: 'health', heal: 12 },
        { itemId: 151, balance: 2, name: 'Lil Heal Juice', type: 'health', heal: 6 },
        { itemId: 132, balance: 4, name: 'Big Charge Juice', type: 'charge', heal: 0 },
        { itemId: 130, balance: 1, name: 'Big Boom Juice', type: 'damage', heal: 0 }
      ]
    }
    
    console.log('📊 Returning fallback mock inventory data due to error:', mockData)
    return NextResponse.json(mockData)
  }
} 