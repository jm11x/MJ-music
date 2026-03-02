import React from 'react';
import { Track } from '../types';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';

interface MiniPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  progress: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onClick: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ track, isPlaying, progress, onTogglePlay, onNext, onPrevious, onClick }) => {
  const { settings } = useSettings();

  if (!track) return null;

  const handleHaptic = () => {
    if (settings.hapticStrength > 0 && navigator.vibrate) {
      navigator.vibrate(settings.hapticStrength / 2);
    }
  };

  const buttonPhysics = settings.physicsEnabled ? {
    whileTap: { scale: 0.94 },
    transition: { type: "spring", stiffness: settings.springStiffness, damping: settings.dampingRatio }
  } : {};

  const getButtonShapeClass = () => {
    switch (settings.buttonShape) {
      case 'rounded': return 'rounded-xl';
      case 'pill': return 'rounded-full px-4';
      case 'minimal': return 'rounded-none bg-transparent border-none shadow-none';
      case 'circular':
      default: return 'rounded-full';
    }
  };

  return (
    <div className="absolute bottom-24 left-4 right-4 z-40">
      <div 
        className={`glass-panel rounded-2xl p-3 flex items-center space-x-3 cursor-pointer relative overflow-hidden group ${settings.edgeDistortionEnabled ? 'edge-distortion' : ''}`}
        onClick={onClick}
      >
        {/* Progress Background */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-cyan-400/50 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800">
          {track.coverUrl ? (
            <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-800" />
          )}
        </div>
        
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="font-medium text-sm truncate">{track.title}</h4>
          <p className="text-xs text-white/60 truncate">{track.artist}</p>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          <motion.button 
            {...buttonPhysics}
            onClick={(e) => { e.stopPropagation(); handleHaptic(); onPrevious(); }}
            className="p-1.5 sm:p-2 text-white/70 hover:text-white transition-colors"
          >
            <SkipBack size={18} fill="currentColor" />
          </motion.button>
          
          <motion.button 
            {...buttonPhysics}
            onClick={(e) => { e.stopPropagation(); handleHaptic(); onTogglePlay(); }}
            className={`w-10 h-10 ${getButtonShapeClass()} glass-button flex items-center justify-center flex-shrink-0`}
            style={{
              boxShadow: settings.beatReactiveGlow && isPlaying ? `0 0 ${settings.beatGlowIntensity / 2}px rgba(255,255,255,0.4)` : undefined
            }}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </motion.button>

          <motion.button 
            {...buttonPhysics}
            onClick={(e) => { e.stopPropagation(); handleHaptic(); onNext(); }}
            className="p-1.5 sm:p-2 text-white/70 hover:text-white transition-colors"
          >
            <SkipForward size={18} fill="currentColor" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
