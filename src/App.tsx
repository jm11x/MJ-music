import React, { useState, useEffect } from 'react';
import { Background } from './components/Background';
import { BottomNav } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { Library } from './views/Library';
import { Player } from './views/Player';
import { Stats } from './views/Stats';
import { Settings } from './views/Settings';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { ViewState } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewState>('library');
  
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setCurrentView(event.state.view);
      } else {
        setCurrentView('library');
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Initial state
    window.history.replaceState({ view: 'library' }, '');

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const changeView = (view: ViewState) => {
    if (view !== currentView) {
      window.history.pushState({ view }, '');
      setCurrentView(view);
    }
  };
  const [videoWallpaperUrl, setVideoWallpaperUrl] = useState<string | undefined>();
  const player = useAudioPlayer();
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings.dynamicLighting) return;

    let animationFrameId: number;
    let angle = 0;

    const updateLighting = () => {
      angle += (settings.lightingSpeed / 100) * 0.02;
      const x = 50 + Math.cos(angle) * 50;
      const y = 50 + Math.sin(angle) * 50;
      
      document.documentElement.style.setProperty('--light-x', `${x}%`);
      document.documentElement.style.setProperty('--light-y', `${y}%`);
      
      animationFrameId = requestAnimationFrame(updateLighting);
    };

    updateLighting();

    return () => cancelAnimationFrame(animationFrameId);
  }, [settings.dynamicLighting, settings.lightingSpeed]);

  const renderView = () => {
    switch (currentView) {
      case 'library':
        return (
          <Library 
            tracks={player.tracks} 
            onAddTracks={player.addTracks} 
            onPlayTrack={(index) => {
              player.playTrack(index);
              changeView('player');
            }}
            currentTrackId={player.currentTrack?.id}
            onRemoveTrack={player.removeTrack}
            onUpdateTrack={player.updateTrack}
            onQueueNext={player.queueTrackNext}
            onMoveToEnd={player.moveTrackToEnd}
            onShuffle={player.shuffleTracks}
            onOpenSettings={() => changeView('settings')}
          />
        );
      case 'player':
        return (
          <Player 
            track={player.currentTrack}
            isPlaying={player.isPlaying}
            progress={player.progress}
            currentTime={player.currentTime}
            duration={player.duration}
            onTogglePlay={player.togglePlayPause}
            onNext={player.playNext}
            onPrevious={player.playPrevious}
            onSeek={player.seek}
            onSeekToTime={player.seekToTime}
            onBack={() => changeView('library')}
            parsedLyrics={player.parsedLyrics}
          />
        );
      case 'stats':
        return <Stats playHistory={player.playHistory} totalListeningTime={player.totalListeningTime} onOpenSettings={() => changeView('settings')} />;
      case 'settings':
        return <Settings onBack={() => window.history.back()} onVideoWallpaperChange={setVideoWallpaperUrl} />;
      default:
        return null;
    }
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden text-white font-sans selection:bg-cyan-500/30 ${settings.dynamicLighting ? 'dynamic-light-container' : ''} ${settings.solidBlackUI ? 'bg-black' : ''}`}>
      <Background coverUrl={player.currentTrack?.coverUrl} videoUrl={videoWallpaperUrl} isPlaying={player.isPlaying} analyzer={player.analyzer} />
      
      {/* Main Content Area */}
      <div className={`relative z-10 w-full h-full max-w-md mx-auto bg-transparent backdrop-blur-[2px] shadow-2xl overflow-hidden flex flex-col sm:border-x sm:border-white/10 ${settings.edgeDistortionEnabled ? 'edge-distortion' : ''} ${settings.solidBlackUI ? '!backdrop-blur-0 !shadow-none !border-white/5' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="flex-1 h-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>

        {/* Mini Player - Only show when not in player view and a track is loaded */}
        {currentView !== 'player' && player.currentTrack && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            <MiniPlayer 
              track={player.currentTrack}
              isPlaying={player.isPlaying}
              progress={player.progress}
              onTogglePlay={player.togglePlayPause}
              onNext={player.playNext}
              onPrevious={player.playPrevious}
              onClick={() => changeView('player')}
            />
          </motion.div>
        )}

        {currentView !== 'player' && (
          <BottomNav currentView={currentView} onChangeView={changeView} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}
