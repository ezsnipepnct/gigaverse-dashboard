import { NextRequest, NextResponse } from 'next/server'

const WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    console.log('Fetching energy for wallet:', WALLET_ADDRESS)
    
    const response = await fetch(`https://gigaverse.io/api/offchain/player/energy/${WALLET_ADDRESS}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Energy API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch energy', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Energy API response:', data)
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Energy proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 