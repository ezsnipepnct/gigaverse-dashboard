import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    console.log('Proxying crafting request:', body)
    
    const response = await fetch('https://gigaverse.io/api/offchain/recipes/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    
    console.log('Gigaverse API response:', response.status, data)
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to start crafting', details: data },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Crafting proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 