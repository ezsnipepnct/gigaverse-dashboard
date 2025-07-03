import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json()
    
    // Get JWT token from Authorization header
    const authorization = request.headers.get('Authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No valid authorization token provided' }, { status: 401 })
    }
    
    const jwtToken = authorization.substring(7) // Remove 'Bearer ' prefix
    
    // Mock energy claim logic
    const claimResult = {
      success: true,
      energyClaimed: amount,
      newTotal: 420, // Mock value
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(claimResult)
  } catch (error) {
    console.error('Error claiming energy:', error)
    return NextResponse.json({ error: 'Failed to claim energy' }, { status: 500 })
  }
} 