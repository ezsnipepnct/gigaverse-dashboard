import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet')
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    // Get JWT token from Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }

    console.log(`Fetching balances for wallet: ${walletAddress}`)
    
    const response = await fetch(`https://gigaverse.io/api/importexport/balances/${walletAddress}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Balances API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Failed to fetch balances: ${response.status}` },
        { status: response.status }
      )
    }

    const data: { entities?: Array<{ ID_CID: string; BALANCE_CID: number }> } = await response.json()
    console.log(`Found ${data.entities?.length || 0} item balances`)

    // Transform the data into a more usable format
    const balances: Record<string, number> = {}
    if (data.entities) {
      for (const item of data.entities) {
        if (!item) continue
        balances[item.ID_CID] = item.BALANCE_CID || 0
      }
    }

    return NextResponse.json({
      success: true,
      balances,
      raw: data
    })

  } catch (error) {
    console.error('Balances API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player balances' },
      { status: 500 }
    )
  }
} 