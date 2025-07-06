import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { romId, claimId } = body
    
    // Validate required fields
    if (!romId || !claimId) {
      return NextResponse.json({
        success: false,
        error: 'romId and claimId are required'
      }, { status: 400 })
    }
    
    // Validate claimId
    if (!['energy', 'dust', 'shard'].includes(claimId)) {
      return NextResponse.json({
        success: false,
        error: 'claimId must be one of: energy, dust, shard'
      }, { status: 400 })
    }
    
    // Get JWT token from Authorization header
    const authorization = request.headers.get('Authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'No valid authorization token provided' 
      }, { status: 401 })
    }
    
    const jwtToken = authorization.substring(7) // Remove 'Bearer ' prefix
    
    console.log(`Claiming ${claimId} from ROM ${romId}`)
    
    // Make the claim request to Gigaverse API
    const payload = { romId, claimId }
    
    const response = await fetch("https://gigaverse.io/api/roms/factory/claim", {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'authorization': `Bearer ${jwtToken}`,
        'origin': 'https://gigaverse.io',
        'referer': 'https://gigaverse.io/play',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to claim ${claimId} from ROM ${romId}:`, response.status, errorText)
      return NextResponse.json({
        success: false,
        error: `Failed to claim ${claimId}: ${response.status}`,
        details: errorText
      }, { status: response.status })
    }
    
    const result = await response.json()
    console.log(`Successfully claimed ${claimId} from ROM ${romId}:`, result)
    
    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${claimId} from ROM ${romId}`,
      data: result
    })
    
  } catch (error) {
    console.error('ROM claim API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 