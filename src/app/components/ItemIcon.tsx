'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ParsedItemMetadata } from '../types/item';
import { itemMetadataService } from '../services/itemMetadata';

interface ItemIconProps {
  itemId: number;
  size?: 'small' | 'medium' | 'large';
  showRarity?: boolean;
  className?: string;
  onClick?: (item: ParsedItemMetadata | null) => void;
}

const ItemIcon: React.FC<ItemIconProps> = ({ 
  itemId, 
  size = 'medium', 
  showRarity = false, 
  className = '',
  onClick 
}) => {
  const [item, setItem] = useState<ParsedItemMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RETRIES = 3;
  const LOAD_TIMEOUT = 8000; // Reduced to 8 seconds for faster fallback

  // Enhanced CDN fallback URLs with multiple sources
  const getImageUrls = (originalUrl: string) => {
    const urls = [originalUrl];
    
    // Add CDN optimizations and fallbacks
    if (originalUrl.includes('mypinata.cloud')) {
      // Add different CDN endpoints
      urls.push(originalUrl.replace('jade-decent-lizard-287.mypinata.cloud', 'gateway.pinata.cloud'));
      urls.push(originalUrl.replace('jade-decent-lizard-287.mypinata.cloud', 'ipfs.io'));
      
      // Add compressed versions
      urls.push(originalUrl + '?w=64&q=85'); // WebP optimization
      urls.push(originalUrl + '?format=webp&w=64');
    }
    
    return urls;
  };

  const loadImageWithFallbacks = async (imageUrls: string[]) => {
    console.log(`[ItemIcon] Loading image for item ${itemId} with ${imageUrls.length} fallback URLs`);
    
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const url = imageUrls[i];
        console.log(`[ItemIcon] Trying URL ${i + 1}/${imageUrls.length}: ${url}`);
        
        const success = await loadSingleImage(url);
        if (success) {
          console.log(`[ItemIcon] Successfully loaded image for item ${itemId} using URL ${i + 1}`);
          setCurrentImageUrl(url);
          setImageLoaded(true);
          setImageError(false);
          return;
        }
      } catch (error) {
        console.log(`[ItemIcon] Failed to load image URL ${i + 1} for item ${itemId}:`, error);
        continue;
      }
    }
    
    // All URLs failed
    console.warn(`[ItemIcon] All ${imageUrls.length} image URLs failed for item ${itemId}`);
    setImageError(true);
    setImageLoaded(false);
  };

  const loadSingleImage = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve(false);
      }, LOAD_TIMEOUT);

      img.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };

      img.src = url;
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`[ItemIcon] Loading metadata for item ${itemId}`);
        
        const itemData = await itemMetadataService.getItem(itemId);
        if (itemData) {
          setItem(itemData);
          console.log(`[ItemIcon] Item ${itemId} metadata loaded:`, itemData);
          
          // Start loading the image with fallbacks
          if (itemData.icon) {
            const imageUrls = getImageUrls(itemData.icon);
            await loadImageWithFallbacks(imageUrls);
          } else {
            console.warn(`[ItemIcon] No icon URL found for item ${itemId}`);
            setImageError(true);
          }
        } else {
          console.warn(`[ItemIcon] No metadata found for item ${itemId}`);
          setError('Item not found');
        }
      } catch (error) {
        console.error(`[ItemIcon] Error loading item ${itemId}:`, error);
        setError('Failed to load item');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [itemId]);

  const getRarityClasses = () => {
    if (!item) return 'border-gray-600 bg-gray-800';
    
    // Always show rarity colors, regardless of showRarity prop
    const colorMap = {
      gray: 'border-gray-400 bg-gray-800',
      green: 'border-green-400 bg-gray-800',
      blue: 'border-blue-400 bg-gray-800',
      purple: 'border-purple-400 bg-gray-800',
      yellow: 'border-yellow-400 bg-gray-800'
    };

    console.log(`[ItemIcon] Item ${itemId} rarity color: ${item.rarityColor}`);
    return colorMap[item.rarityColor as keyof typeof colorMap] || colorMap.gray;
  };

  const getSizeClasses = () => {
    const sizeMap = {
      small: 'w-8 h-8 text-xs',
      medium: 'w-12 h-12 text-sm',
      large: 'w-16 h-16 text-base'
    };
    return sizeMap[size];
  };

  const getFallbackIcon = () => {
    if (!item) return '❓';
    
    // Smart fallback based on item type
    const typeMap: Record<string, string> = {
      'Consumable': '🧪',
      'Material': '🔧',
      'Collectable': '💎',
      'Weapon': '⚔️',
      'Armor': '🛡️',
      'Tool': '🔨',
      'Currency': '💰',
      'NFT': '🖼️'
    };
    
    return typeMap[item.type || ''] || '📦';
  };

  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  if (loading) {
    return (
      <div className={`
        flex items-center justify-center border-2 border-gray-600 rounded-lg
        ${getSizeClasses()} ${className}
        animate-pulse bg-gray-800
      `}>
        <div className="text-gray-400">⏳</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`
        flex items-center justify-center border-2 border-red-500 rounded-lg
        ${getSizeClasses()} ${className}
        bg-red-900/20 cursor-pointer
      `} onClick={handleClick}>
        <div className="text-red-400">❌</div>
      </div>
    );
  }

  return (
    <div className={`
      relative flex items-center justify-center border-2 rounded-lg
      ${getRarityClasses()} ${getSizeClasses()} ${className}
      ${onClick ? 'cursor-pointer hover:scale-105' : ''}
      transition-all duration-200
    `} onClick={handleClick}>
      
      {/* Progressive Image Loading */}
      {currentImageUrl && !imageError ? (
        <div className="relative w-full h-full">
          {/* Low quality placeholder background */}
          <div className="absolute inset-0 bg-gray-700 animate-pulse rounded" />
          
          {/* Main image */}
          <img
            ref={imageRef}
            src={currentImageUrl}
            alt={item?.name || `Item ${itemId}`}
            className={`
              w-full h-full object-contain rounded transition-opacity duration-300
              ${imageLoaded ? 'opacity-100 animate-fade-in' : 'opacity-0'}
            `}
            onLoad={() => {
              console.log(`[ItemIcon] Image loaded successfully for item ${itemId}`);
              setImageLoaded(true);
            }}
            onError={() => {
              console.log(`[ItemIcon] Image failed to display for item ${itemId}`);
              setImageError(true);
            }}
          />
          
          {/* Loading overlay */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 rounded">
              <div className="text-gray-400 animate-pulse">⏳</div>
            </div>
          )}
        </div>
      ) : (
        /* Fallback icon */
        <div className="text-2xl">{getFallbackIcon()}</div>
      )}

      {/* Soulbound indicator */}
      {item?.soulbound && (
        <div className="absolute bottom-0 left-0 w-2 h-2 bg-red-500 rounded-tr" />
      )}
    </div>
  );
};

export default ItemIcon; 