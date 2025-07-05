import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Get JWT token from Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authorization token required' 
      }, { status: 401 })
    }
    
    console.log('Proxying recipe trade request:', body)
    
    const response = await fetch('https://gigaverse.io/api/offchain/recipes/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://gigaverse.io',
        'Referer': 'https://gigaverse.io/play',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    console.log('Recipe trade response:', response.status, data)

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: data.message || data.error || `HTTP ${response.status}`,
        details: data
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      ...data
    })

  } catch (error) {
    console.error('Recipe trade API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 