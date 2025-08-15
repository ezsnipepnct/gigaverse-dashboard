// Lightweight client-side market price service with caching

type FloorPriceMap = Record<string, number>

class MarketPriceService {
  private floorPrices: FloorPriceMap | null = null
  private floorUpdatedAt = 0
  private ethPriceUsd: number | null = null
  private ethUpdatedAt = 0

  private readonly FLOOR_TTL_MS = 10 * 60 * 1000
  private readonly ETH_TTL_MS = 5 * 60 * 1000

  async getFloorMap(): Promise<FloorPriceMap> {
    const now = Date.now()
    if (this.floorPrices && now - this.floorUpdatedAt < this.FLOOR_TTL_MS) {
      return this.floorPrices
    }

    const response = await fetch('https://gigaverse.io/api/marketplace/item/floor/all')
    if (!response.ok) {
      console.error('[MarketPriceService] Failed to fetch floor prices:', response.status)
      this.floorPrices = {}
      this.floorUpdatedAt = now
      return this.floorPrices
    }

    const data = await response.json()
    const map: FloorPriceMap = {}
    const entities: any[] = data?.entities || []
    for (const ent of entities) {
      const id = ent.GAME_ITEM_ID_CID
      const wei = ent.ETH_MINT_PRICE_CID
      if (typeof id === 'number' && typeof wei === 'number' && wei > 0) {
        const priceEth = wei / 1e18
        map[id.toString()] = priceEth
      }
    }

    this.floorPrices = map
    this.floorUpdatedAt = now
    return map
  }

  async getEthUsd(): Promise<number> {
    const now = Date.now()
    if (this.ethPriceUsd && now - this.ethUpdatedAt < this.ETH_TTL_MS) {
      return this.ethPriceUsd
    }
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      const price = data?.ethereum?.usd
      if (typeof price === 'number' && price > 0) {
        this.ethPriceUsd = price
        this.ethUpdatedAt = now
        return price
      }
    } catch (err) {
      console.error('[MarketPriceService] Failed to fetch ETH price:', err)
    }
    // Fallback
    this.ethPriceUsd = 3000
    this.ethUpdatedAt = now
    return this.ethPriceUsd
  }
}

export const marketPriceService = new MarketPriceService()


