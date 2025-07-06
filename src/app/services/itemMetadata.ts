import { ItemMetadata, ItemError, ParsedItemMetadata, ItemCacheEntry } from '../types/item';

class ItemMetadataService {
  private cache = new Map<number, ItemCacheEntry>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // Increased to 10 minutes
  private readonly BASE_URL = 'https://gigaverse.io/api/metadata/gameItem';
  private batchQueue = new Set<number>();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // Reduced to 50ms for faster processing
  private readonly MAX_CONCURRENT_REQUESTS = 6; // Parallel loading limit

  // Enhanced common items list for better preloading
  private readonly COMMON_ITEMS = [
    // Crafting materials
    131, 158, 200, 5, 4, 6, 1, 2, 3, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    // Equipment and weapons
    50, 100, 150, 250, 300, 400, 500, 600, 700, 800, 900, 1000,
    // Consumables
    25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    // Special items
    101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115
  ];

  private preloadInitiated = false;
  private requestQueue: Array<{itemId: number, resolve: Function, reject: Function}> = [];
  private activeRequests = 0;

  constructor() {
    // Clear cache on startup to ensure fresh data with corrected parsing
    this.clearAllCache();
    
    // Preload common items after a short delay
    setTimeout(() => {
      this.preloadCommonItems();
    }, 500); // Reduced delay
  }

  /**
   * Preload commonly used items in parallel batches
   */
  private async preloadCommonItems() {
    if (this.preloadInitiated) return;
    this.preloadInitiated = true;

    console.log(`[ItemMetadataService] Starting preload of ${this.COMMON_ITEMS.length} common items...`);
    
    try {
      // Process items in parallel batches
      const batchSize = this.MAX_CONCURRENT_REQUESTS;
      for (let i = 0; i < this.COMMON_ITEMS.length; i += batchSize) {
        const batch = this.COMMON_ITEMS.slice(i, i + batchSize);
        
        // Load batch in parallel
        const batchPromises = batch.map(itemId => 
          this.loadItemData(itemId).catch(error => {
            console.warn(`[ItemMetadataService] Failed to preload item ${itemId}:`, error);
            return null;
          })
        );
        
        await Promise.all(batchPromises);
        
        // Small delay between batches to avoid overwhelming the server
        if (i + batchSize < this.COMMON_ITEMS.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`[ItemMetadataService] Preloaded ${this.cache.size} common items`);
    } catch (error) {
      console.error('[ItemMetadataService] Error preloading common items:', error);
    }
  }

  /**
   * Preload specific items (e.g., for a recipe)
   */
  async preloadItems(itemIds: number[]) {
    console.log(`[ItemMetadataService] Preloading ${itemIds.length} specific items...`);
    
    // Filter out already cached items
    const uncachedItems = itemIds.filter(id => !this.isCached(id));
    
    if (uncachedItems.length === 0) {
      console.log('[ItemMetadataService] All items already cached');
      return;
    }

    console.log(`[ItemMetadataService] Loading ${uncachedItems.length} uncached items...`);
    
    try {
      // Process in parallel batches
      const batchSize = this.MAX_CONCURRENT_REQUESTS;
      for (let i = 0; i < uncachedItems.length; i += batchSize) {
        const batch = uncachedItems.slice(i, i + batchSize);
        
        const batchPromises = batch.map(itemId => 
          this.loadItemData(itemId).catch(error => {
            console.warn(`[ItemMetadataService] Failed to preload item ${itemId}:`, error);
            return null;
          })
        );
        
        await Promise.all(batchPromises);
      }
      
      console.log(`[ItemMetadataService] Preloaded ${uncachedItems.length} items`);
    } catch (error) {
      console.error('[ItemMetadataService] Error preloading items:', error);
    }
  }

  /**
   * Process request queue with concurrency control
   */
  private async processRequestQueue() {
    while (this.requestQueue.length > 0 && this.activeRequests < this.MAX_CONCURRENT_REQUESTS) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      this.activeRequests++;
      
      try {
        const item = await this.loadItemData(request.itemId);
        request.resolve(item);
      } catch (error) {
        request.reject(error);
      } finally {
        this.activeRequests--;
        // Process next items in queue
        if (this.requestQueue.length > 0) {
          setTimeout(() => this.processRequestQueue(), 10);
        }
      }
    }
  }

  /**
   * Get item with smart caching and queue management
   */
  async getItem(itemId: number): Promise<ParsedItemMetadata | null> {
    // Check cache first
    if (this.isCached(itemId)) {
      console.log(`[ItemMetadataService] Cache hit for item ${itemId}`);
      return this.cache.get(itemId)?.data || null;
    }

    console.log(`[ItemMetadataService] Cache miss for item ${itemId}, queuing request`);
    
    // Add to queue if not already processing
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ itemId, resolve, reject });
      this.processRequestQueue();
    });
  }

  /**
   * Load item data with retry logic
   */
  private async loadItemData(itemId: number): Promise<ParsedItemMetadata | null> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ItemMetadataService] Loading item ${itemId} (attempt ${attempt}/${maxRetries})`);
        
        const response = await fetch(`${this.BASE_URL}/${itemId}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'GigaverseDashboard/1.0'
          },
          // Add timeout
          signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: ItemMetadata = await response.json();
        const parsedData = this.parseItemMetadata(data);
        
        // Cache the result
        this.cache.set(itemId, {
          data: parsedData,
          timestamp: Date.now()
        });

        console.log(`[ItemMetadataService] Successfully loaded item ${itemId}`);
        return parsedData;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`[ItemMetadataService] Attempt ${attempt} failed for item ${itemId}:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[ItemMetadataService] Retrying item ${itemId} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`[ItemMetadataService] Failed to load item ${itemId} after ${maxRetries} attempts:`, lastError);
    return null;
  }

  /**
   * Enhanced batch loading with smart queuing
   */
  private queueBatchRequest(itemId: number) {
    this.batchQueue.add(itemId);
    
    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    // Set new timeout
    this.batchTimeout = setTimeout(() => {
      this.processBatchQueue();
    }, this.BATCH_DELAY);
  }

  /**
   * Process batch queue with parallel loading
   */
  private async processBatchQueue() {
    if (this.batchQueue.size === 0) return;

    const itemIds = Array.from(this.batchQueue);
    this.batchQueue.clear();
    
    console.log(`[ItemMetadataService] Processing batch of ${itemIds.length} items`);
    
    // Process in parallel with concurrency limit
    const batchSize = this.MAX_CONCURRENT_REQUESTS;
    for (let i = 0; i < itemIds.length; i += batchSize) {
      const batch = itemIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(itemId => 
        this.loadItemData(itemId).catch(error => {
          console.warn(`[ItemMetadataService] Batch load failed for item ${itemId}:`, error);
          return null;
        })
      );
      
      await Promise.all(batchPromises);
    }
  }

  /**
   * Check if item is cached and not expired
   */
  private isCached(itemId: number): boolean {
    const entry = this.cache.get(itemId);
    if (!entry) return false;
    
    const isExpired = Date.now() - entry.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(itemId);
      return false;
    }
    
    return true;
  }

  /**
   * Parse raw item metadata with enhanced error handling
   */
  private parseItemMetadata(data: ItemMetadata): ParsedItemMetadata {
    try {
      // Enhanced rarity parsing - check attributes first, then fallback to direct property
      let rarityLevel = 0;
      
      if (data.attributes) {
        const rarityAttribute = data.attributes.find(attr => attr.trait_type === 'Rarity');
        if (rarityAttribute && rarityAttribute.value) {
          const parsedRarity = parseInt(rarityAttribute.value, 10);
          if (!isNaN(parsedRarity)) {
            rarityLevel = parsedRarity;
          }
        }
      } else if (typeof data.rarity === 'number') {
        rarityLevel = data.rarity;
      }
      
      const rarityColor = this.getRarityColor(rarityLevel);
      const rarityName = this.getRarityName(rarityLevel);
      
      // Debug logging for rarity parsing
      if (data.attributes) {
        const rarityAttribute = data.attributes.find(attr => attr.trait_type === 'Rarity');
        console.log(`[ItemMetadataService] Item ${data.id}: parsed rarity ${rarityLevel} from attribute value "${rarityAttribute?.value}"`);
      } else {
        console.log(`[ItemMetadataService] Item ${data.id}: using fallback rarity ${rarityLevel}`);
      }

      // Enhanced type parsing
      let itemType = 'Unknown';
      if (data.attributes) {
        const typeAttribute = data.attributes.find(attr => attr.trait_type === 'Type');
        if (typeAttribute && typeAttribute.value) {
          itemType = typeAttribute.value;
        }
      } else if (data.type) {
        itemType = data.type;
      }

      // Enhanced soulbound parsing
      let isSoulbound = false;
      if (data.attributes) {
        const soulboundAttribute = data.attributes.find(attr => attr.trait_type === 'Soulbound');
        if (soulboundAttribute && soulboundAttribute.value) {
          isSoulbound = soulboundAttribute.value.toLowerCase() === 'true';
        }
      } else if (data.soulbound !== undefined) {
        isSoulbound = Boolean(data.soulbound);
      }

      return {
        id: data.id,
        name: data.name || `Item #${data.id}`,
        description: data.description || '',
        icon: data.icon || '',
        image: data.image || data.icon || '',
        rarity: rarityLevel,
        rarityColor,
        rarityName,
        type: itemType,
        soulbound: isSoulbound,
        // Additional metadata
        category: data.category || 'Miscellaneous',
        subcategory: data.subcategory || '',
        tags: data.tags || [],
        value: data.value || 0,
        weight: data.weight || 0,
        stackable: data.stackable !== false, // Default to true
        tradeable: !isSoulbound // Inverse of soulbound
      };
    } catch (error) {
      console.error('[ItemMetadataService] Error parsing item metadata:', error);
      
      // Return minimal fallback data
      return {
        id: data.id,
        name: `Item #${data.id}`,
        description: 'Error loading item data',
        icon: '',
        image: '',
        rarity: 0,
        rarityColor: 'gray',
        rarityName: 'Common',
        type: 'Unknown',
        soulbound: false,
        category: 'Miscellaneous',
        subcategory: '',
        tags: [],
        value: 0,
        weight: 0,
        stackable: true,
        tradeable: true
      };
    }
  }

  /**
   * Get rarity color with enhanced mapping
   */
  private getRarityColor(rarity: number): string {
    const rarityColors = {
      0: 'gray',    // Common
      1: 'green',   // Uncommon
      2: 'blue',    // Rare
      3: 'purple',  // Epic
      4: 'yellow',  // Legendary
      5: 'orange',  // Mythic (if it exists)
      6: 'red'      // Artifact (if it exists)
    };
    
    return rarityColors[rarity as keyof typeof rarityColors] || 'gray';
  }

  /**
   * Get rarity name with enhanced mapping
   */
  private getRarityName(rarity: number): string {
    const rarityNames = {
      0: 'Common',
      1: 'Uncommon',
      2: 'Rare',
      3: 'Epic',
      4: 'Legendary',
      5: 'Mythic',
      6: 'Artifact'
    };
    
    return rarityNames[rarity as keyof typeof rarityNames] || 'Common';
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      commonItemsPreloaded: this.preloadInitiated,
      activeRequests: this.activeRequests,
      queueSize: this.requestQueue.length,
      batchQueueSize: this.batchQueue.size
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    let cleared = 0;
    
    for (const [itemId, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(itemId);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`[ItemMetadataService] Cleared ${cleared} expired cache entries`);
    }
  }

  /**
   * Clear all cache entries (useful when fixing parsing logic)
   */
  clearAllCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[ItemMetadataService] Cleared all ${size} cache entries`);
  }
}

// Create singleton instance
export const itemMetadataService = new ItemMetadataService();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).itemMetadataService = itemMetadataService;
} 