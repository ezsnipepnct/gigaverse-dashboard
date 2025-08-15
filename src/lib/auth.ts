// Simple authentication service for Gigaverse API
export interface AuthResponse {
  success: boolean
  jwt: string
  gameAccount: {
    noob: any
    allowedToCreateAccount: boolean
    canEnterGame: boolean
    noobPassBalance: number
    lastNoobId: number
    maxNoobId: number
  }
  user: {
    _id: string
    walletAddress: string
    username: string
    caseSensitiveAddress: string
    __v: number
  }
  expiresAt: number
}

export interface AuthPayload {
  signature: string
  address: string
  message: string
  timestamp: number
}

// Ethereum provider interface
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>
  isMetaMask?: boolean
}

export class AuthService {
  private static instance: AuthService
  private jwt: string | null = null
  private authData: AuthResponse | null = null

  private constructor() {
    // Load JWT from localStorage on initialization
    if (typeof window !== 'undefined') {
      const savedJWT = localStorage.getItem('jwt_token')
      const savedAuthData = localStorage.getItem('auth_data')
      
      if (savedJWT && savedAuthData) {
        try {
          const parsedAuthData = JSON.parse(savedAuthData)
          // Check if token is not expired
          if (parsedAuthData.expiresAt && Date.now() < parsedAuthData.expiresAt) {
            this.jwt = savedJWT
            this.authData = parsedAuthData
            console.log('Restored valid JWT token from localStorage')
          } else {
            console.log('Stored JWT token is expired, clearing...')
            this.clearAuth()
          }
        } catch (error) {
          console.error('Error parsing stored auth data:', error)
          this.clearAuth()
        }
      }
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Check if MetaMask is available
   */
  public isMetaMaskAvailable(): boolean {
    return typeof window !== 'undefined' && 
           typeof (window as any).ethereum !== 'undefined' && 
           !!(window as any).ethereum.isMetaMask
  }

  /**
   * Connect wallet and authenticate with Gigaverse
   */
  public async connect(): Promise<AuthResponse> {
    if (!this.isMetaMaskAvailable()) {
      throw new Error('MetaMask not found. Please install MetaMask to continue.')
    }

    try {
      const ethereum = (window as any).ethereum as EthereumProvider
      
      // Request account access
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      }) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.')
      }

      const address = accounts[0]
      console.log('Connected to wallet:', address)

      // Create message to sign
      const timestamp = Date.now()
      const message = `Login to Gigaverse at ${timestamp}`

      console.log('Signing message:', message)

      // Request signature
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      }) as string

      console.log('Signature obtained, authenticating with Gigaverse...')

      // Authenticate with Gigaverse API
      const authPayload: AuthPayload = {
        signature,
        address,
        message,
        timestamp
      }

      const response = await fetch('https://gigaverse.io/api/user/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authPayload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const authData: AuthResponse = await response.json()

      if (!authData.success) {
        throw new Error('Authentication failed: Invalid response from server')
      }

      // Store authentication data
      this.jwt = authData.jwt
      this.authData = authData

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('jwt_token', authData.jwt)
        localStorage.setItem('auth_data', JSON.stringify(authData))
      }

      console.log('Successfully authenticated with Gigaverse!')
      return authData

    } catch (error) {
      console.error('Authentication error:', error)
      this.clearAuth()
      throw error
    }
  }

  /**
   * Disconnect and clear authentication
   */
  public disconnect(): void {
    this.clearAuth()
    console.log('Disconnected from Gigaverse')
  }

  /**
   * Get current JWT token
   */
  public getJWT(): string | null {
    return this.jwt
  }

  /**
   * Get current authentication data
   */
  public getAuthData(): AuthResponse | null {
    return this.authData
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!(this.jwt && this.authData && Date.now() < this.authData.expiresAt)
  }

  /**
   * Get current wallet address
   */
  public getAddress(): string | null {
    return this.authData?.user?.caseSensitiveAddress || null
  }

  /**
   * Clear authentication data
   */
  private clearAuth(): void {
    this.jwt = null
    this.authData = null
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwt_token')
      localStorage.removeItem('auth_data')
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance() 