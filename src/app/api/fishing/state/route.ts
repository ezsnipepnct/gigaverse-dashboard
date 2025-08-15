import { NextRequest, NextResponse } from 'next/server'

// Extract wallet address from JWT token
function extractWalletFromJWT(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.wallet || null
  } catch (error) {
    console.error('Error extracting wallet from JWT:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const walletAddress = extractWalletFromJWT(token)
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Invalid JWT token or missing wallet address' }, { status: 401 })
    }

    console.log('🎣 Fetching fishing progress with auth header:', `Bearer ${token.substring(0, 20)}...`)

    const response = await fetch(`https://gigaverse.io/api/fishing/state/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    console.log('🌐 Gigaverse fishing API response status:', response.status)
    console.log('🌐 Gigaverse fishing API response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      console.error('Failed to fetch fishing state from Gigaverse API:', response.status)
      return NextResponse.json({ error: 'Failed to fetch fishing state' }, { status: response.status })
    }

    const data = await response.json()
    console.log('✅ Fishing state API response:', JSON.stringify(data, null, 2))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching fishing state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 