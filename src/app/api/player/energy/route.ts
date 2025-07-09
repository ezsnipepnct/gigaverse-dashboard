import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      console.log('❌ No authorization header provided for player energy')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    console.log('⚡ Fetching player energy with auth header:', authHeader.substring(0, 20) + '...')

    // Extract token from Bearer header
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

    // Make the API call to get player energy
    const response = await fetch('https://gigaverse.io/api/player/energy', {
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
      console.error('❌ Player energy API error:', response.status, response.statusText)
      console.error('❌ Error response body:', errorText)

      // Return mock data for development
      const mockData = {
        energy: 1000, // Default energy for testing
        maxEnergy: 1000,
        lastRegenTime: Date.now()
      }
      
      console.log('📊 Returning mock energy data:', mockData)
      return NextResponse.json(mockData)
    }

    const data = await response.json()
    console.log('✅ Player energy API response:', JSON.stringify(data, null, 2))

    return NextResponse.json(data)
  } catch (error) {
    console.error('💥 Error fetching player energy:', error)
    
    // Return mock data for development
    const mockData = {
      energy: 1000, // Default energy for testing
      maxEnergy: 1000,
      lastRegenTime: Date.now()
    }
    
    console.log('📊 Returning fallback mock energy data due to error:', mockData)
    return NextResponse.json(mockData)
  }
} 