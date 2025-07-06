export interface ItemAttribute {
  trait_type: string;
  value?: string;
}

export interface ItemMetadata {
  id: number;
  name: string;
  description: string;
  image: string;  // Full size image URL
  icon: string;   // Icon size image URL
  attributes?: ItemAttribute[];
  rarity?: number;
  type?: string;
  soulbound?: boolean;
  category?: string;
  subcategory?: string;
  tags?: string[];
  value?: number;
  weight?: number;
  stackable?: boolean;
}

export interface ItemError {
  message: string;
}

// Parsed convenience interface for easier use in components
export interface ParsedItemMetadata {
  id: number;
  name: string;
  description: string;
  image: string;
  icon: string;
  rarity: number;           // 0-4 scale
  type: string;             // Consumable, Material, Collectable, etc.
  soulbound: boolean;       // True if account-bound
  rarityName: string;       // Common, Uncommon, Rare, Epic, Legendary
  rarityColor: string;      // Tailwind color class for styling
  // Additional metadata
  category: string;
  subcategory: string;
  tags: string[];
  value: number;
  weight: number;
  stackable: boolean;
  tradeable: boolean;
}

// Utility type for component props
export interface ItemDisplayProps {
  itemId: number;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  showRarity?: boolean;
  className?: string;
}

// Cache entry for service
export interface ItemCacheEntry {
  data: ParsedItemMetadata | null;
  timestamp: number;
} 