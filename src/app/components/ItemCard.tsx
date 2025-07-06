'use client';
import React, { useState, useEffect } from 'react';
import { ParsedItemMetadata } from '../types/item';
import { itemMetadataService } from '../services/itemMetadata';
import { Package, Shield, Star } from 'lucide-react';

interface ItemCardProps {
  itemId: number;
  quantity?: number;
  showDescription?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: (item: ParsedItemMetadata | null) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ 
  itemId, 
  quantity,
  showDescription = false,
  compact = false,
  className = '',
  onClick 
}) => {
  const [item, setItem] = useState<ParsedItemMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [itemId]);

  const getRarityClasses = () => {
    if (!item) return 'border-gray-600 bg-gray-800';
    
    const colorMap = {
      gray: 'border-gray-400 bg-gray-800',
      green: 'border-green-400 bg-gray-800',
      blue: 'border-blue-400 bg-gray-800',
      purple: 'border-purple-400 bg-gray-800',
      yellow: 'border-yellow-400 bg-gray-800',
      red: 'border-red-600 bg-gray-800',
      violet: 'border-violet-400 bg-gray-800'
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

  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  if (loading) {
    return (
      <div className={`
        ${compact ? 'p-2' : 'p-4'} 
        ${className} 
        bg-gray-800 border border-gray-600 rounded-lg 
        animate-pulse flex items-center space-x-3
      `}>
        <div className="w-12 h-12 bg-gray-600 rounded animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-600 rounded animate-pulse" />
          <div className="h-3 bg-gray-600 rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className={`
        ${compact ? 'p-2' : 'p-4'} 
        ${className} 
        bg-gray-800 border border-gray-600 rounded-lg 
        flex items-center space-x-3
      `}>
        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
          <span className="text-gray-500 text-xs">?</span>
        </div>
        <div className="flex-1">
          <div className="text-gray-400 font-mono text-sm">Unknown Item</div>
          <div className="text-gray-500 font-mono text-xs">ID: {itemId}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`
        ${compact ? 'p-2' : 'p-4'} 
        ${className} 
        ${getRarityClasses()}
        ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}
        border-2 rounded-lg transition-all duration-200
        relative group
      `}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        {/* Item Icon */}
        <div className="relative">
          <img 
            src={item.icon} 
            alt={item.name}
            className="w-12 h-12 object-cover rounded border border-gray-600"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          
          {/* Quantity badge */}
          {quantity && quantity > 1 && (
            <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {quantity > 99 ? '99+' : quantity}
            </div>
          )}
          
          {/* Soulbound indicator */}
          {item.soulbound && (
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-red-500 rounded-full border border-gray-800" />
          )}
        </div>

        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-mono font-bold text-white truncate">{item.name}</h3>
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
          
          {showDescription && !compact && item.description && (
            <p className="text-gray-400 font-mono text-xs mt-2 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
      </div>
      
      {/* Rarity glow effect */}
      <div className={`
        absolute inset-0 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity duration-200
        bg-gradient-to-br from-${item.rarityColor}-400 to-transparent
      `} />
    </div>
  );
};

export default ItemCard; 