import React from 'react';
import { Camera, Layers, Settings, HelpCircle } from 'lucide-react';

interface SidebarProps {
  activeTab: 'generator' | 'settings';
  onTabChange: (tab: 'generator' | 'settings') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="hidden md:flex flex-col w-64 bg-secondary text-white h-screen fixed left-0 top-0 overflow-y-auto z-50">
      <div className="p-6 flex items-center gap-3 border-b border-gray-700">
        <div className="bg-primary p-2 rounded-lg">
          <Camera className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">AmzGen</h1>
          <span className="text-xs text-gray-400">Seller Tools AI</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <button 
          onClick={() => onTabChange('generator')}
          className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors font-medium ${
            activeTab === 'generator' 
              ? 'bg-gray-700/50 text-primary' 
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Layers className="w-5 h-5" />
          Scene Generator
        </button>
        <button 
          onClick={() => onTabChange('settings')}
          className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors font-medium ${
            activeTab === 'settings' 
              ? 'bg-gray-700/50 text-primary' 
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" />
          Settings
        </button>
        <button className="flex items-center gap-3 w-full p-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
          <HelpCircle className="w-5 h-5" />
          Documentation
        </button>
      </nav>

      <div className="p-4 border-t border-gray-700">
      </div>
    </div>
  );
};