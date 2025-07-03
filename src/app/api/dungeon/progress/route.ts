import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    console.log('Fetching dungeon progress')

    const response = await fetch('https://gigaverse.io/api/game/dungeon/today', {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'authorization': authHeader
      }
    })

    if (!response.ok) {
      console.error('Dungeon progress API error:', response.status, response.statusText)
      return NextResponse.json({ error: 'Failed to fetch dungeon progress' }, { status: response.status })
    }

    const data = await response.json()
    console.log('Dungeon progress API response:', data)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching dungeon progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 