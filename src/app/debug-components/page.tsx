'use client';

import React, { useEffect, useState } from 'react';
import ItemIcon from '../components/ItemIcon';
import ItemTooltip from '../components/ItemTooltip';
import { itemMetadataService } from '../services/itemMetadata';

const DebugComponentsPage: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const testItemId = 131;

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog('Component mounted');
    
    // Test direct API call
    const testAPI = async () => {
      try {
        addLog(`Testing direct API call for item ${testItemId}`);
        const response = await fetch(`https://gigaverse.io/api/metadata/gameItem/${testItemId}`);
        const data = await response.json();
        addLog(`API Response: ${JSON.stringify(data).substring(0, 100)}...`);
      } catch (error) {
        addLog(`API Error: ${error}`);
      }
    };

    // Test service
    const testService = async () => {
      try {
        addLog(`Testing service for item ${testItemId}`);
        const item = await itemMetadataService.getItem(testItemId);
        addLog(`Service Response: ${item ? JSON.stringify(item).substring(0, 100) + '...' : 'null'}`);
      } catch (error) {
        addLog(`Service Error: ${error}`);
      }
    };

    testAPI();
    testService();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-8">Component Debug Page</h1>
        
        <div className="grid grid-cols-2 gap-8">
          {/* Component Test */}
          <div>
            <h2 className="text-xl font-bold text-cyan-400 mb-4">Component Test</h2>
            <div className="bg-gray-900 p-4 rounded-lg">
              <p className="text-sm text-gray-400 mb-4">ItemIcon Component:</p>
              <div className="flex items-center space-x-4">
                <ItemIcon 
                  itemId={testItemId} 
                  size="large" 
                  showRarity
                  onClick={(item) => addLog(`Item clicked: ${item?.name || 'null'}`)}
                />
                <div>
                  <p className="text-white">Item ID: {testItemId}</p>
                  <p className="text-gray-400 text-sm">Should show: Big Heal Juice</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-400 mb-4 mt-6">ItemTooltip Test:</p>
              <ItemTooltip itemId={testItemId} position="right">
                <div className="bg-cyan-400/20 p-2 rounded cursor-pointer">
                  Hover me for tooltip
                </div>
              </ItemTooltip>
            </div>
          </div>

          {/* Debug Logs */}
          <div>
            <h2 className="text-xl font-bold text-cyan-400 mb-4">Debug Logs</h2>
            <div className="bg-gray-900 p-4 rounded-lg max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-xs text-green-400 font-mono mb-1">
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-400">No logs yet...</div>
              )}
            </div>
            
            <button 
              onClick={() => setLogs([])}
              className="mt-2 px-4 py-2 bg-cyan-400/20 text-cyan-400 rounded hover:bg-cyan-400/30"
            >
              Clear Logs
            </button>
          </div>
        </div>

        {/* Multiple Item Test */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Multiple Items Test</h2>
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="grid grid-cols-6 gap-4">
              {[131, 158, 200, 5, 4, 6].map(itemId => (
                <div key={itemId} className="text-center">
                  <ItemIcon 
                    itemId={itemId} 
                    size="medium" 
                    showRarity
                    onClick={(item) => addLog(`Item ${itemId} clicked: ${item?.name || 'null'}`)}
                  />
                  <p className="text-xs mt-2 text-gray-400">ID: {itemId}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Browser DevTools Help */}
        <div className="mt-8 bg-blue-900/20 p-4 rounded-lg border border-blue-400/30">
          <h3 className="text-blue-400 font-bold mb-2">Developer Instructions:</h3>
          <ol className="text-sm text-blue-200 space-y-1">
            <li>1. Open browser DevTools (F12)</li>
            <li>2. Check Console tab for any JavaScript errors</li>
            <li>3. Check Network tab to see if API requests are being made</li>
            <li>4. Look for requests to gigaverse.io/api/metadata/gameItem/</li>
            <li>5. Check if images are loading in the Elements tab</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DebugComponentsPage; 