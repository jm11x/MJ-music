import React from 'react';
import { Library, BarChart2 } from 'lucide-react';
import { ViewState } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface BottomNavProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChangeView }) => {
  const { settings } = useSettings();

  const getContainerShapeClass = () => {
    switch (settings.buttonShape) {
      case 'rounded': return 'rounded-2xl';
      case 'pill': return 'rounded-full';
      case 'minimal': return 'rounded-none border-none shadow-none bg-black/40 backdrop-blur-md';
      case 'circular':
      default: return 'rounded-full';
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`glass-panel ${getContainerShapeClass()} px-8 py-3 flex items-center space-x-12`}>
        <button 
          onClick={() => onChangeView('library')}
          className={`flex flex-col items-center space-y-1 transition-colors ${currentView === 'library' ? 'text-cyan-400' : 'text-white/50 hover:text-white/80'}`}
        >
          <Library size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Library</span>
        </button>
        
        <button 
          onClick={() => onChangeView('stats')}
          className={`flex flex-col items-center space-y-1 transition-colors ${currentView === 'stats' ? 'text-cyan-400' : 'text-white/50 hover:text-white/80'}`}
        >
          <BarChart2 size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Stats</span>
        </button>
      </div>
    </div>
  );
};
