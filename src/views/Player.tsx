import React, { useState, useEffect, useRef } from 'react';
import { Track, LyricLine } from '../types';
import { Play, Pause, SkipBack, SkipForward, Music, ChevronDown, Settings, ArrowLeft, FastForward, Repeat, Shuffle } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';

interface PlayerProps {
  track: Track | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (percentage: number) => void;
  onBack: () => void;
  parsedLyrics: LyricLine[];
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const Player: React.FC<PlayerProps> = ({
  track,
  isPlaying,
  progress,
  currentTime,
  duration,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onBack,
  parsedLyrics
}) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const albumControls = useAnimation();

  // Beat pulse simulation
  useEffect(() => {
    if (isPlaying && settings.beatPulseEnabled) {
      const interval = setInterval(() => {
        albumControls.start({
          scale: [1, 1.02, 1],
          transition: { duration: 0.5, ease: "easeOut" }
        });
      }, 1000); // Simulated 60 BPM
      return () => clearInterval(interval);
    }
  }, [isPlaying, settings.beatPulseEnabled, albumControls]);

  useEffect(() => {
    if (showLyrics && lyricsContainerRef.current && parsedLyrics.length > 0) {
      const activeIndex = parsedLyrics.findIndex((l, i) => {
        const next = parsedLyrics[i + 1];
        return l.time !== -1 && currentTime >= l.time && (!next || currentTime < next.time);
      });

      if (activeIndex !== -1) {
        const container = lyricsContainerRef.current;
        const activeElement = container.children[activeIndex] as HTMLElement;
        if (activeElement) {
          container.scrollTo({
            top: activeElement.offsetTop - container.clientHeight / 2 + activeElement.clientHeight / 2,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentTime, showLyrics, parsedLyrics]);

  const handleHaptic = () => {
    if (settings.hapticStrength > 0 && navigator.vibrate) {
      navigator.vibrate(settings.hapticStrength / 2);
    }
  };

  const getButtonShapeClass = () => {
    switch (settings.buttonShape) {
      case 'rounded': return 'rounded-2xl';
      case 'pill': return 'rounded-full px-6';
      case 'minimal': return 'rounded-none bg-transparent border-none shadow-none';
      case 'circular':
      default: return 'rounded-full';
    }
  };

  const buttonPhysics = settings.physicsEnabled ? {
    whileTap: { scale: 0.94 },
    transition: { type: "spring", stiffness: settings.springStiffness, damping: settings.dampingRatio }
  } : {};

  const getAlbumStyleClass = () => {
    switch (settings.albumStyle) {
      case 'rounded': return `rounded-[${settings.albumCornerRadius}px]`;
      case 'circular': return 'rounded-full';
      case 'elevated': return `rounded-[${settings.albumCornerRadius}px] shadow-[0_30px_60px_rgba(0,0,0,0.6)]`;
      case 'floating':
      case 'parallax':
      default: return `rounded-[${settings.albumCornerRadius}px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]`;
    }
  };

  if (!track) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-white/50">
        <Music size={64} className="mb-6 opacity-20" />
        <p className="text-xl font-light">Select a track to play</p>
      </div>
    );
  }

  if (showLyrics) {
    return (
      <div className="h-full flex flex-col p-6 pb-8 relative animate-in fade-in zoom-in-95 duration-300">
        {/* Top Bar */}
        <div className="flex justify-between items-start mb-6">
          <button onClick={() => setShowLyrics(false)} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center flex-1 px-4">
            {/* Removed song title and artist name per requirements */}
          </div>
          <button className="p-2 -mr-2 text-white/70 hover:text-white transition-colors">
            <Settings size={24} />
          </button>
        </div>

        {/* Lyrics */}
        <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto text-center space-y-6 mb-8 flex flex-col items-center px-4 scroll-smooth">
          {parsedLyrics.length > 0 ? (
            parsedLyrics.map((line, index) => {
              const nextLine = parsedLyrics[index + 1];
              const hasTimestamps = parsedLyrics.some(l => l.time !== -1);
              const isActive = hasTimestamps 
                ? (line.time !== -1 && currentTime >= line.time && (!nextLine || currentTime < nextLine.time))
                : true; // If no timestamps, all are "active" (visible)
              const isPast = hasTimestamps && line.time !== -1 && currentTime >= line.time;
              
              const dominantColor = track.dominantColors?.[0] || 'rgba(255,255,255,0.4)';
              
              return (
                <motion.p
                  key={index}
                  className={`text-lg transition-all duration-500 will-change-transform ${isActive ? 'text-white font-bold scale-110' : isPast ? 'text-white/60' : 'text-white/30'} ${!hasTimestamps ? 'opacity-100 scale-100 font-normal' : ''}`}
                  style={isActive && hasTimestamps ? { textShadow: `0 0 12px ${dominantColor}` } : {}}
                  animate={isActive && hasTimestamps ? {
                    textShadow: [
                      `0 0 10px ${dominantColor}`,
                      `0 0 22px ${dominantColor}`,
                      `0 0 12px ${dominantColor}`
                    ],
                    scale: [1.08, 1.14, 1.1]
                  } : { textShadow: 'none', scale: 1 }}
                  transition={isActive && hasTimestamps
                    ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.25 }}
                >
                  {line.text}
                </motion.p>
              );
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <p className="text-xl text-white/70 font-medium">Lyrics not found.</p>
              <label className="glass-panel px-6 py-3 rounded-full text-sm font-medium cursor-pointer hover:bg-white/20 transition-colors">
                <span>Upload music lyric</span>
                <input 
                  type="file" 
                  accept=".lrc" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && track) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const text = event.target?.result as string;
                        if (text) {
                          // Manual lyric upload could update the track in DB
                          console.log("Manual lyric upload not fully implemented in Player view yet");
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Bottom Controls Area */}
        <div className="w-full mt-auto space-y-6">
          {/* Progress Bar */}
          <div className="w-full">
            <div className="relative w-full h-4 flex items-center">
              <div className="absolute left-0 h-1 bg-white/20 w-full rounded-full" />
              <div 
                className="absolute left-0 h-1 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" 
                style={{ width: `${progress}%` }} 
              />
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={progress || 0} 
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute h-4 w-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8),0_0_20px_rgba(6,182,212,0.6)] pointer-events-none transform -translate-x-1/2"
                style={{ left: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/50 mt-3 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-6">
            <motion.button {...buttonPhysics} onClick={() => { handleHaptic(); onPrevious(); }} className="w-12 h-12 rounded-full flex items-center justify-center text-white/80 hover:text-white glass-button">
              <SkipBack size={20} fill="currentColor" />
            </motion.button>
            <motion.button {...buttonPhysics} onClick={() => { handleHaptic(); onTogglePlay(); }} className="w-16 h-16 rounded-full glass-panel flex items-center justify-center text-white hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
            </motion.button>
            <motion.button {...buttonPhysics} onClick={() => { handleHaptic(); onNext(); }} className="w-12 h-12 rounded-full flex items-center justify-center text-white/80 hover:text-white glass-button">
              <SkipForward size={20} fill="currentColor" />
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.1, bottom: 0.8 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 150) {
          onBack();
        }
      }}
      className={`h-full flex flex-col p-6 pb-8 animate-in fade-in duration-300 relative ${settings.albumStyle === 'immersive' ? 'bg-black' : ''}`}
    >
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors relative z-20">
          <ChevronDown size={28} />
        </button>
        <button onClick={() => setShowLyrics(true)} className="p-2 -mr-2 text-white/70 hover:text-white transition-colors relative z-20">
          <Music size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto relative z-10">
        {/* Album Art */}
        {settings.albumStyle === 'immersive' ? (
          <motion.div 
            animate={albumControls}
            className="absolute top-0 left-0 w-full h-[70vh] -z-10 pointer-events-none"
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '70vh' }}
          >
            {track.coverUrl ? (
              <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black" />
          </motion.div>
        ) : (
          <motion.div 
            animate={albumControls}
            whileHover={settings.hoverAnimationEnabled ? { scale: 1.05, y: -10 } : {}}
            className={`w-[85%] max-w-[320px] aspect-square glass-panel p-2 mb-6 overflow-hidden relative group ${getAlbumStyleClass()}`}
            style={{ 
              borderRadius: `${settings.albumCornerRadius}px`,
              boxShadow: settings.beatReactiveGlow && isPlaying ? `0 0 ${settings.glowStrength}px rgba(255,255,255,0.3)` : undefined
            }}
          >
            <div 
              className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center overflow-hidden"
              style={{ borderRadius: `${Math.max(0, settings.albumCornerRadius - 8)}px` }}
            >
               {track.coverUrl ? (
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
                    <Music size={80} className="text-white/20 mb-4" />
                    <div className="text-white/30 font-mono text-sm tracking-widest">LOSSLESS</div>
                  </div>
                )}
            </div>
          </motion.div>
        )}

        {settings.albumStyle === 'immersive' && <div className="flex-1" />}

        {/* Track Info */}
        <div className="w-full text-center mb-4">
          <h2 className="text-2xl font-bold tracking-tight mb-1 truncate">{track.title}</h2>
          <p className="text-base text-white/60 truncate">{track.artist}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full mb-6">
          <div className="relative w-full h-4 flex items-center">
            <div className="absolute left-0 h-1 bg-white/20 w-full rounded-full" />
            <div 
              className="absolute left-0 h-1 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" 
              style={{ width: `${progress}%` }} 
            />
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress || 0} 
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />
            {/* Custom thumb indicator */}
            <div 
              className="absolute h-4 w-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8),0_0_20px_rgba(6,182,212,0.6)] pointer-events-none transform -translate-x-1/2"
              style={{ left: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/50 mt-3 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between w-full px-2 mb-6">
          <motion.button 
            {...buttonPhysics}
            onClick={() => handleHaptic()}
            className={`w-12 h-12 flex items-center justify-center text-white/60 hover:text-white transition-colors`}
          >
            <Shuffle size={20} />
          </motion.button>
          
          <motion.button 
            {...buttonPhysics}
            onClick={() => { handleHaptic(); onPrevious(); }}
            className={`w-14 h-14 ${getButtonShapeClass()} glass-button flex items-center justify-center text-white/80 hover:text-white`}
          >
            <SkipBack size={24} fill="currentColor" />
          </motion.button>
          
          <motion.button 
            {...buttonPhysics}
            onClick={() => { handleHaptic(); onTogglePlay(); }}
            className={`w-20 h-20 ${getButtonShapeClass()} glass-panel flex items-center justify-center text-white hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.1)]`}
            style={{
              boxShadow: settings.beatReactiveGlow && isPlaying ? `0 0 ${settings.beatGlowIntensity}px rgba(255,255,255,0.4)` : undefined
            }}
          >
            {isPlaying ? (
              <Pause size={32} fill="currentColor" />
            ) : (
              <Play size={32} fill="currentColor" className="ml-2" />
            )}
          </motion.button>
          
          <motion.button 
            {...buttonPhysics}
            onClick={() => { handleHaptic(); onNext(); }}
            className={`w-14 h-14 ${getButtonShapeClass()} glass-button flex items-center justify-center text-white/80 hover:text-white`}
          >
            <SkipForward size={24} fill="currentColor" />
          </motion.button>
          
          <motion.button 
            {...buttonPhysics}
            onClick={() => handleHaptic()}
            className={`w-12 h-12 flex items-center justify-center text-white/60 hover:text-white transition-colors`}
          >
            <Repeat size={20} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
