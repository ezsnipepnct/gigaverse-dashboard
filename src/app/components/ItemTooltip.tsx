'use client';
import React, { useState, useEffect } from 'react';
import { ParsedItemMetadata } from '../types/item';
import { itemMetadataService } from '../services/itemMetadata';
import { Package, Shield, Star, Lock } from 'lucide-react';

interface ItemTooltipProps {
  itemId: number;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  floorPriceEth?: number;
  showUsdPrice?: boolean;
  ethUsd?: number;
}

const ItemTooltip: React.FC<ItemTooltipProps> = ({ 
  itemId, 
  children, 
  position = 'top',
  className = '',
  floorPriceEth,
  showUsdPrice = false,
  ethUsd
}) => {
  const [item, setItem] = useState<ParsedItemMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const loadItem = async () => {
      try {
        setLoading(true);
        setError(null);
        const itemData = await itemMetadataService.getItem(itemId);
        setItem(itemData);
      } catch (err) {
        console.error('Error loading item:', err);
        setError(err instanceof Error ? err.message : 'Failed to load item');
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [itemId, isVisible]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2 left-1/2 transform -translate-x-1/2';
      case 'bottom':
        return 'top-full mt-2 left-1/2 transform -translate-x-1/2';
      case 'left':
        return 'right-full mr-2 top-1/2 transform -translate-y-1/2';
      case 'right':
        return 'left-full ml-2 top-1/2 transform -translate-y-1/2';
      default:
        return 'bottom-full mb-2 left-1/2 transform -translate-x-1/2';
    }
  };

  const formatPrice = (priceEth: number) => {
    if (!priceEth || priceEth <= 0) return 'N/A'
    if (showUsdPrice && ethUsd && ethUsd > 0) {
      const usd = priceEth * ethUsd
      if (usd < 0.01) return `$${usd.toFixed(4)}`
      if (usd < 1) return `$${usd.toFixed(3)}`
      if (usd < 100) return `$${usd.toFixed(2)}`
      return `$${Math.round(usd).toLocaleString()}`
    }
    if (priceEth < 0.0001) {
      const exponent = Math.floor(Math.log10(priceEth))
      const mantissa = priceEth / Math.pow(10, exponent)
      return `${mantissa.toFixed(2)} × 10^${exponent} ETH`
    }
    if (priceEth < 0.001) return `${(priceEth * 1000).toFixed(2)} mETH`
    return `${priceEth.toFixed(4)} ETH`
  }

  const getRarityClasses = () => {
    if (!item) return 'border-gray-600 bg-gray-900';
    
    const colorMap = {
      gray: 'border-gray-400 bg-gray-900',
      green: 'border-green-400 bg-gray-900',
      blue: 'border-blue-400 bg-gray-900',
      purple: 'border-purple-400 bg-gray-900',
      yellow: 'border-yellow-400 bg-gray-900',
      red: 'border-red-600 bg-gray-900',
      violet: 'border-violet-400 bg-gray-900'
    };

    return colorMap[item.rarityColor as keyof typeof colorMap] || colorMap.gray;
  };

  const getRarityTextClasses = () => {
    if (!item) return 'text-gray-400';
    
    const colorMap = {
      gray: 'text-gray-400',
      green: 'text-green-400',
      blue: 'text-blue-400',
      purple: 'text-purple-400',
      yellow: 'text-yellow-400',
      red: 'text-red-500',
      violet: 'text-violet-400'
    };

    return colorMap[item.rarityColor as keyof typeof colorMap] || colorMap.gray;
  };

  const getTypeIcon = () => {
    if (!item) return <Package className="w-4 h-4" />;
    
    const typeMap = {
      'Material': <Package className="w-4 h-4" />,
      'Consumable': <Star className="w-4 h-4" />,
      'Equipment': <Shield className="w-4 h-4" />,
      'Collectable': <Star className="w-4 h-4" />
    };

    return typeMap[item.type as keyof typeof typeMap] || <Package className="w-4 h-4" />;
  };

  const renderTooltipContent = () => {
    if (loading) {
      return (
        <div className="w-64 p-4 bg-gray-900 border border-gray-600 rounded-lg animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-600 rounded animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-600 rounded animate-pulse" />
              <div className="h-3 bg-gray-600 rounded animate-pulse w-1/2" />
            </div>
          </div>
        </div>
      );
    }

    if (error || !item) {
      return (
        <div className="w-64 p-4 bg-gray-900 border border-gray-600 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
              <span className="text-gray-500 text-xs">?</span>
            </div>
            <div className="flex-1">
              <div className="text-gray-400 font-mono text-sm">Unknown Item</div>
              <div className="text-gray-500 font-mono text-xs">ID: {itemId}</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`
        w-80 p-4 shadow-2xl rounded-lg border-2 backdrop-blur-sm
        ${getRarityClasses()}
      `}>
        <div className="flex items-start space-x-3">
          {/* Item Icon */}
          <div className="relative">
            <img 
              src={item.icon} 
              alt={item.name}
              className="w-16 h-16 object-cover rounded border border-gray-600"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            
            {/* Soulbound indicator */}
            {item.soulbound && (
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-red-500 rounded-full border border-gray-800 flex items-center justify-center">
                <Lock className="w-2 h-2 text-white" />
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-mono font-bold text-white text-lg">{item.name}</h3>
              {getTypeIcon()}
            </div>
            
            <div className="flex items-center space-x-2 mt-1">
              <span className={`${getRarityTextClasses()} font-mono text-sm font-bold`}>
                {item.rarityName}
              </span>
              <span className="text-gray-500 font-mono text-xs">
                {item.type}
              </span>
            </div>
            
            {item.description && (
              <p className="text-gray-400 font-mono text-xs mt-3 leading-relaxed">
                {item.description}
              </p>
            )}
            
            {/* Additional attributes */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              {/* Floor price (if provided) */}
              {typeof floorPriceEth === 'number' && floorPriceEth > 0 && (
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-gray-500">Floor Price</span>
                  <span className="text-yellow-400 font-bold">{formatPrice(floorPriceEth)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-500">Rarity Level</span>
                <span className={getRarityTextClasses()}>{item.rarity}/4</span>
              </div>
              
              {item.soulbound && (
                <div className="flex items-center justify-between text-xs font-mono mt-1">
                  <span className="text-gray-500">Binding</span>
                  <span className="text-red-400">Soulbound</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      
      {isVisible && (
        <div className={`
          absolute z-50 ${getPositionClasses()}
          pointer-events-none
        `}>
          {renderTooltipContent()}
        </div>
      )}
    </div>
  );
};

export default ItemTooltip; 