'use client'

import { AuthResponse } from '@/hooks/useAGWWallet'

// Security constants
const AUTH_STORAGE_KEY = 'gigaverse_agw_auth_data'

export class AGWAuthService {
  private static instance: AGWAuthService

  private constructor() {}

  public static getInstance(): AGWAuthService {
    if (!AGWAuthService.instance) {
      AGWAuthService.instance = new AGWAuthService()
    }
    return AGWAuthService.instance
  }

  /**
   * Get current JWT token from localStorage
   */
  public getJWT(): string | null {
    if (typeof window === 'undefined') return null
    
    const savedAuthData = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!savedAuthData) return null
    
    try {
      const authData: AuthResponse = JSON.parse(savedAuthData)
      // Check if token is not expired
      if (authData.expiresAt && Date.now() < authData.expiresAt) {
        return authData.jwt
      }
    } catch (error) {
      console.error('Error parsing AGW auth data:', error)
    }
    
    return null
  }

  /**
   * Get current authentication data from localStorage
   */
  public getAuthData(): AuthResponse | null {
    if (typeof window === 'undefined') return null
    
    const savedAuthData = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!savedAuthData) return null
    
    try {
      const authData: AuthResponse = JSON.parse(savedAuthData)
      // Check if token is not expired
      if (authData.expiresAt && Date.now() < authData.expiresAt) {
        return authData
      }
    } catch (error) {
      console.error('Error parsing AGW auth data:', error)
    }
    
    return null
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    const authData = this.getAuthData()
    return !!(authData && authData.expiresAt && Date.now() < authData.expiresAt)
  }

  /**
   * Get current wallet address
   */
  public getAddress(): string | null {
    const authData = this.getAuthData()
    return authData?.user?.caseSensitiveAddress || null
  }

  /**
   * Clear authentication data
   */
  public clearAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }
}

export const agwAuthService = AGWAuthService.getInstance() 