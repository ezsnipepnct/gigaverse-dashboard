'use client';
import React from 'react';
import ItemIcon from '../components/ItemIcon';
import ItemCard from '../components/ItemCard';
import ItemTooltip from '../components/ItemTooltip';

const ItemsDemo = () => {
  // Sample item IDs for demonstration
  const sampleItems = [1, 50, 100, 131, 150, 200, 250];
  const regularCardItems = sampleItems.slice(0, 3).map((itemId, index) => ({
    itemId,
    quantity: [48, 27, 13][index] ?? 1,
  }));
  const compactCardItems = sampleItems.slice(3, 7).map((itemId, index) => ({
    itemId,
    quantity: [6, 9, 4, 11][index] ?? 1,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white font-mono mb-4">
            GIGAVERSE ITEM METADATA DEMO
          </h1>
          <p className="text-gray-400 font-mono">
            Showcasing the new item metadata components with real Gigaverse data
          </p>
        </div>

        {/* ItemIcon Showcase */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-blue-400 font-mono mb-6 border-b border-blue-400/20 pb-2">
            ItemIcon Component
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Different sizes */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-bold text-white font-mono mb-4">Sizes</h3>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <ItemIcon itemId={131} size="small" showRarity />
                  <p className="text-xs text-gray-400 mt-2">Small</p>
                </div>
                <div className="text-center">
                  <ItemIcon itemId={131} size="medium" showRarity />
                  <p className="text-xs text-gray-400 mt-2">Medium</p>
                </div>
                <div className="text-center">
                  <ItemIcon itemId={131} size="large" showRarity />
                  <p className="text-xs text-gray-400 mt-2">Large</p>
                </div>
              </div>
            </div>

            {/* With tooltips */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-bold text-white font-mono mb-4">With Tooltips</h3>
              <div className="flex items-center space-x-4">
                {[1, 50, 100].map(itemId => (
                  <ItemTooltip key={itemId} itemId={itemId} position="bottom">
                    <ItemIcon itemId={itemId} showRarity />
                  </ItemTooltip>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Hover to see tooltips</p>
            </div>
          </div>
        </div>

        {/* ItemCard Showcase */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-purple-400 font-mono mb-6 border-b border-purple-400/20 pb-2">
            ItemCard Component
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Regular cards */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white font-mono">Regular Cards</h3>
              {regularCardItems.map(({ itemId, quantity }) => (
                <ItemCard 
                  key={itemId} 
                  itemId={itemId} 
                  quantity={quantity}
                  showDescription
                />
              ))}
            </div>

            {/* Compact cards */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white font-mono">Compact Cards</h3>
              {compactCardItems.map(({ itemId, quantity }) => (
                <ItemCard 
                  key={itemId} 
                  itemId={itemId} 
                  quantity={quantity}
                  compact
                />
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-green-400 font-mono mb-6 border-b border-green-400/20 pb-2">
            Interactive Item Grid
          </h2>
          
          <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <p className="text-gray-400 font-mono text-sm mb-4">
              This simulates an inventory or crafting materials display. Hover for tooltips, click for details.
            </p>
            <div className="grid grid-cols-8 gap-4">
              {sampleItems.map(itemId => (
                <ItemTooltip key={itemId} itemId={itemId} position="top">
                  <ItemIcon 
                    itemId={itemId} 
                    showRarity 
                    onClick={(item) => item && alert(`Clicked: ${item.name}`)}
                  />
                </ItemTooltip>
              ))}
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-yellow-400 font-mono mb-6 border-b border-yellow-400/20 pb-2">
            Usage Examples
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Crafting Recipe Mock */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-bold text-white font-mono mb-4">Crafting Recipe</h3>
              <div className="space-y-3">
                <div className="text-sm text-gray-400 font-mono">Materials needed:</div>
                <div className="flex items-center space-x-3">
                  <ItemIcon itemId={1} size="small" />
                  <span className="text-white font-mono">x5 Basic Material</span>
                </div>
                <div className="flex items-center space-x-3">
                  <ItemIcon itemId={50} size="small" />
                  <span className="text-white font-mono">x2 Rare Component</span>
                </div>
                <div className="border-t border-gray-600 pt-3 mt-3">
                  <div className="text-sm text-gray-400 font-mono">Result:</div>
                  <div className="flex items-center space-x-3 mt-2">
                    <ItemIcon itemId={131} size="medium" showRarity />
                    <span className="text-green-400 font-mono">Epic Item</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Section Mock */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-bold text-white font-mono mb-4">Inventory Section</h3>
              <div className="space-y-2">
                <ItemCard itemId={100} quantity={15} compact />
                <ItemCard itemId={150} quantity={7} compact />
                <ItemCard itemId={200} quantity={23} compact />
                <ItemCard itemId={250} quantity={1} compact />
              </div>
            </div>
          </div>
        </div>

        {/* API Information */}
        <div className="bg-blue-900/20 border border-blue-400/30 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-blue-400 font-mono mb-4">API Information</h2>
          <div className="text-sm text-gray-400 font-mono space-y-2">
            <p>• Base URL: https://gigaverse.io/api/metadata/gameItem/[id]</p>
            <p>• Caching: 5 minutes per item</p>
            <p>• Batch loading: Optimized for multiple item requests</p>
            <p>• Error handling: Graceful fallbacks for missing items</p>
            <p>• Performance: Lazy loading with skeleton states</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ItemsDemo; 