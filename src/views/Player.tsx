import React, { useState, useEffect, useRef } from 'react';
import { Track, LyricLine } from '../types';
import { Play, Pause, SkipBack, SkipForward, Music, ChevronDown, Settings, ArrowLeft, FastForward, Repeat, Shuffle, Share2 } from 'lucide-react';
import { motion, useAnimation, useMotionValue, useTransform, useSpring } from 'framer-motion';
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
  onSeekToTime: (time: number) => void;
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
  onSeekToTime,
  onBack,
  parsedLyrics
}) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const [isSelectingToShare, setIsSelectingToShare] = useState(false);
  const [sharingLine, setSharingLine] = useState<string | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();
  const albumControls = useAnimation();

  // Parallax motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!settings.parallaxEnabled || settings.albumStyle !== 'parallax') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

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

  const activeIndex = parsedLyrics.findIndex((l, i) => {
    const next = parsedLyrics[i + 1];
    return l.time !== -1 && currentTime >= l.time && (!next || currentTime < next.time);
  });

  // Fallback for first line if we are slightly before it
  const effectiveActiveIndex = activeIndex === -1 && parsedLyrics.length > 0 && currentTime < parsedLyrics[0].time && parsedLyrics[0].time < 2 
    ? 0 
    : activeIndex;

  useEffect(() => {
    if (showLyrics && lyricsContainerRef.current && parsedLyrics.length > 0) {
      const container = lyricsContainerRef.current;
      const indexToScroll = effectiveActiveIndex !== -1 ? effectiveActiveIndex : 0;
      const activeElement = container.children[indexToScroll] as HTMLElement;
      
      if (activeElement) {
        // Calculate target scroll position to center the active element
        const containerHeight = container.clientHeight;
        const elementTop = activeElement.offsetTop;
        const elementHeight = activeElement.clientHeight;
        
        const targetScroll = elementTop - (containerHeight / 2) + (elementHeight / 2);
        
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }
    }
  }, [effectiveActiveIndex, showLyrics, parsedLyrics]);

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

  const getAlbumStyleStyles = () => {
    const radius = settings.albumCornerRadius;
    const depth = settings.albumDepth;
    const dominantColor = track?.dominantColors?.[0] || 'rgba(255,255,255,0.2)';

    switch (settings.albumStyle) {
      case 'circular':
        return {
          borderRadius: '50%',
          boxShadow: `0 ${depth/2}px ${depth}px rgba(0,0,0,0.5)`
        };
      case 'elevated':
        return {
          borderRadius: `${radius}px`,
          boxShadow: `0 ${depth}px ${depth * 2}px rgba(0,0,0,0.6)`,
          transform: `translateY(-${depth/4}px)`
        };
      case 'floating':
        return {
          borderRadius: `${radius}px`,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: `0 ${depth}px ${depth * 1.5}px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.05)`,
          padding: '12px'
        };
      case 'parallax':
        return {
          borderRadius: `${radius}px`,
          boxShadow: `0 ${depth}px ${depth * 2}px rgba(0,0,0,0.5)`,
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d' as const
        };
      case 'rounded':
        return {
          borderRadius: `${radius}px`,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: `0 4px 20px rgba(0,0,0,0.3)`
        };
      case 'immersive':
      default:
        return {
          borderRadius: `${radius}px`,
          boxShadow: `0 ${depth/2}px ${depth}px rgba(0,0,0,0.4)`
        };
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

  const handleShareLine = (line: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'Share Lyric',
        text: `"${line}" - from ${track?.title} by ${track?.artist}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      alert("Sharing not supported on this browser. Line copied to clipboard.");
      navigator.clipboard.writeText(line);
    }
  };

  if (showLyrics) {
    return (
      <div className={`h-full flex flex-col relative overflow-hidden animate-in fade-in duration-500 ${settings.solidBlackUI ? 'bg-black' : ''}`}>
        {/* Top Bar */}
        <div className="flex justify-between items-center p-6 z-30 bg-gradient-to-b from-black/60 to-transparent">
          <button onClick={() => setShowLyrics(false)} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center flex-1 px-4">
            <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40">Lyrics</h2>
          </div>
          <button 
            onClick={() => setIsSelectingToShare(!isSelectingToShare)}
            className={`p-2 -mr-2 transition-all duration-300 ${isSelectingToShare ? 'text-cyan-400 scale-110' : 'text-white/70 hover:text-white'}`}
          >
            <Share2 size={24} />
          </button>
        </div>

        {isSelectingToShare && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 bg-cyan-500/20 border border-cyan-500/30 rounded-xl p-3 mb-4 flex items-center justify-between z-30"
          >
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest">Select a line to share</span>
            <button 
              onClick={() => setIsSelectingToShare(false)}
              className="text-[10px] font-bold text-white/50 hover:text-white uppercase"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* Lyrics Container */}
        <div 
          ref={lyricsContainerRef} 
          className="flex-1 overflow-y-auto text-center space-y-12 flex flex-col items-center px-8 scroll-smooth no-scrollbar relative py-[40vh] z-10"
        >
          {parsedLyrics.length > 0 ? (
            parsedLyrics.map((line, index) => {
              const isActive = index === effectiveActiveIndex;
              const dominantColor = track.dominantColors?.[0] || 'rgba(6, 182, 212, 0.5)';
              
              return (
                <motion.div
                  key={index}
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    opacity: isActive ? 1 : (index < effectiveActiveIndex ? 0.6 : 0.8),
                  }}
                  transition={{ 
                    duration: 0.5, 
                    ease: [0.23, 1, 0.32, 1]
                  }}
                  className={`cursor-pointer group relative w-full py-6 transition-all duration-500 rounded-2xl ${isSelectingToShare ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'}`}
                  onClick={() => {
                    if (isSelectingToShare) {
                      setSharingLine(line.text);
                    } else if (line.time !== -1) {
                      onSeekToTime(line.time);
                    }
                  }}
                >
                  <motion.p 
                    animate={{
                      textShadow: isActive 
                        ? [
                            `0 0 20px ${dominantColor}, 0 0 40px ${dominantColor}88, 0 0 60px ${dominantColor}44`,
                            `0 0 30px ${dominantColor}, 0 0 60px ${dominantColor}aa, 0 0 90px ${dominantColor}66`,
                            `0 0 20px ${dominantColor}, 0 0 40px ${dominantColor}88, 0 0 60px ${dominantColor}44`
                          ]
                        : `0 0 0px transparent`,
                      color: isActive ? '#ffffff' : (index < effectiveActiveIndex ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.8)'),
                    }}
                    transition={{ 
                      textShadow: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                      color: { duration: 0.5 }
                    }}
                    className={`text-3xl sm:text-5xl font-bold leading-tight break-words text-center will-change-transform px-4`}
                  >
                    {line.text}
                  </motion.p>
                </motion.div>
              );
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 opacity-30">
              <Music size={64} />
              <p className="text-xl font-light">No lyrics available</p>
            </div>
          )}
        </div>

        {/* Bottom Controls Area - Absolute Positioned */}
        <div className="absolute bottom-0 left-0 w-full p-6 pt-12 pb-10 z-30 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className="max-w-md mx-auto">
            {/* Progress Bar */}
            <div className="w-full mb-8">
              <div className="relative w-full h-6 flex items-center group">
                <div className="absolute left-0 h-1 bg-white/10 w-full rounded-full" />
                
                {/* Lyric Markers */}
                {duration > 0 && parsedLyrics.map((line, i) => (
                  line.time !== -1 && (
                    <div 
                      key={i}
                      className="absolute h-1 w-0.5 bg-white/30 rounded-full pointer-events-none top-1/2 -translate-y-1/2"
                      style={{ left: `${(line.time / duration) * 100}%` }}
                    />
                  )
                ))}

                <div className="absolute left-0 h-1 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${progress}%` }} />
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="0.1"
                  value={progress || 0} 
                  onChange={(e) => onSeek(parseFloat(e.target.value))}
                  className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="absolute h-4 w-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] pointer-events-none transform -translate-x-1/2" style={{ left: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-white/40 mt-2 font-mono tracking-widest">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-12">
              <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={(e) => { e.stopPropagation(); handleHaptic(); onPrevious(); }} 
                className="p-2 text-white/80 hover:text-white transition-colors"
              >
                <SkipBack size={32} fill="currentColor" />
              </motion.button>
              
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); handleHaptic(); onTogglePlay(); }} 
                className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-2xl"
              >
                {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1.5" />}
              </motion.button>
              
              <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={(e) => { e.stopPropagation(); handleHaptic(); onNext(); }} 
                className="p-2 text-white/80 hover:text-white transition-colors"
              >
                <SkipForward size={32} fill="currentColor" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Share Preview Modal */}
        {sharingLine && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="w-full max-w-sm flex flex-col items-center">
              <div 
                className="w-full aspect-[9/16] rounded-[32px] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl border border-white/10"
                style={{ background: `linear-gradient(135deg, ${track.dominantColors?.[0] || '#1e1e1e'} 0%, #000000 100%)` }}
              >
                <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                  {track.coverUrl && <img src={track.coverUrl} alt="" className="w-full h-full object-cover blur-3xl scale-150" />}
                </div>
                <div className="relative z-10 flex flex-col items-center space-y-8">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl border border-white/20">
                    {track.coverUrl ? <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center"><Music className="text-white/20" /></div>}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white font-black text-xl tracking-tight">{track.title}</h3>
                    <p className="text-white/60 text-sm font-bold uppercase tracking-widest">{track.artist}</p>
                  </div>
                  <div className="w-12 h-0.5 bg-white/20" />
                  <p className="text-3xl text-white font-black leading-tight italic">"{sharingLine}"</p>
                </div>
                <div className="absolute bottom-8 left-0 w-full text-center">
                  <p className="text-[10px] text-white/30 font-mono tracking-[0.3em] uppercase">Shared via MJ music</p>
                </div>
              </div>
              <div className="flex w-full space-x-4 mt-8">
                <button onClick={() => setSharingLine(null)} className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors">Cancel</button>
                <button onClick={() => { handleShareLine(sharingLine); setSharingLine(null); setIsSelectingToShare(false); }} className="flex-1 py-4 rounded-2xl bg-cyan-500 text-black font-black hover:bg-cyan-400 transition-colors">Share</button>
              </div>
            </div>
          </div>
        )}
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
      className={`h-full flex flex-col p-6 pb-8 animate-in fade-in duration-300 relative ${settings.albumStyle === 'immersive' ? 'bg-black' : ''} ${settings.solidBlackUI ? 'bg-black' : ''}`}
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
        {/* Album Art Container */}
        <div 
          className="w-full flex items-center justify-center perspective-1000"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
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
              whileHover={settings.hoverAnimationEnabled && settings.albumStyle !== 'parallax' ? { scale: 1.05, y: -10 } : {}}
              className={`w-[85%] max-w-[320px] aspect-square mb-6 overflow-hidden relative group transition-shadow duration-500`}
              style={{ 
                ...getAlbumStyleStyles(),
                boxShadow: settings.beatReactiveGlow && isPlaying 
                  ? `${getAlbumStyleStyles().boxShadow}, 0 0 ${settings.glowStrength}px rgba(255,255,255,0.3)` 
                  : getAlbumStyleStyles().boxShadow
              }}
            >
              {/* Inner content for styles like 'floating glass' */}
              <div 
                className={`w-full h-full flex items-center justify-center overflow-hidden transition-all duration-500`}
                style={{ 
                  borderRadius: settings.albumStyle === 'circular' ? '50%' : `${Math.max(0, settings.albumCornerRadius - (settings.albumStyle === 'floating' ? 12 : 0))}px`
                }}
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
              
              {/* Parallax depth elements */}
              {settings.albumStyle === 'parallax' && (
                <div className="absolute inset-0 pointer-events-none" style={{ transform: 'translateZ(50px)' }}>
                   {/* Could add floating particles or highlights here */}
                </div>
              )}
            </motion.div>
          )}
        </div>

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
            
            {/* Lyric Markers */}
            {duration > 0 && parsedLyrics.map((line, i) => (
              line.time !== -1 && (
                <div 
                  key={i}
                  className="absolute h-1 w-0.5 bg-white/20 rounded-full pointer-events-none top-1/2 -translate-y-1/2"
                  style={{ left: `${(line.time / duration) * 100}%` }}
                />
              )
            ))}

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
            whileTap={{ scale: 0.8 }}
            onClick={() => handleHaptic()}
            className={`w-12 h-12 flex items-center justify-center text-white/60 hover:text-white transition-colors`}
          >
            <Shuffle size={20} />
          </motion.button>
          
          <motion.button 
            whileTap={{ x: 15, scale: 0.9 }}
            onClick={() => { handleHaptic(); onPrevious(); }}
            className={`w-14 h-14 ${getButtonShapeClass()} flex items-center justify-center text-white/80 hover:text-white ${settings.solidBlackUI ? 'bg-white/5 border border-white/10' : 'glass-button'}`}
          >
            <SkipBack size={24} fill="currentColor" />
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 1.3 }}
            onClick={() => { handleHaptic(); onTogglePlay(); }}
            className={`w-20 h-20 ${getButtonShapeClass()} flex items-center justify-center text-white hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.1)] ${settings.solidBlackUI ? 'bg-white/10' : 'glass-panel'}`}
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
            whileTap={{ x: -15, scale: 0.9 }}
            onClick={() => { handleHaptic(); onNext(); }}
            className={`w-14 h-14 ${getButtonShapeClass()} flex items-center justify-center text-white/80 hover:text-white ${settings.solidBlackUI ? 'bg-white/5 border border-white/10' : 'glass-button'}`}
          >
            <SkipForward size={24} fill="currentColor" />
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 0.8 }}
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
