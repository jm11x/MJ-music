import { useState, useEffect, useRef, useCallback } from 'react';
import { Track } from '../types';
import { getAllTracks, saveTrack, deleteTrack, updateTrackInDB } from '../services/db';

export function useAudioPlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playHistory, setPlayHistory] = useState<{track: Track, timestamp: number}[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayPause = useCallback(() => {
    if (currentTrackIndex !== -1) {
      setIsPlaying(!isPlaying);
    }
  }, [currentTrackIndex, isPlaying]);

  const playNext = useCallback(() => {
    if (tracks.length > 0) {
      setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
      setIsPlaying(true);
    }
  }, [tracks.length]);

  const playPrevious = useCallback(() => {
    if (tracks.length > 0) {
      setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
      setIsPlaying(true);
    }
  }, [tracks.length]);

  // Load tracks from DB on mount
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const savedTracks = await getAllTracks();
        const tracksWithUrls = savedTracks.map(track => {
          // Recreate object URLs for the file and the cover blob
          // Stale blob URLs from previous sessions won't work
          const url = URL.createObjectURL(track.file);
          let coverUrl = track.coverUrl;
          
          if (track.coverBlob) {
            coverUrl = URL.createObjectURL(track.coverBlob);
          } else if (coverUrl && coverUrl.startsWith('blob:')) {
            // If it's a stale blob URL and we don't have the blob, it's broken
            coverUrl = undefined;
          }
          
          return {
            ...track,
            url,
            coverUrl
          };
        });
        setTracks(tracksWithUrls);
      } catch (err) {
        console.error("Failed to load tracks from DB", err);
      }
    };
    loadTracks();
  }, []);

  useEffect(() => {
    audioRef.current = new Audio();
    
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleEnded = () => {
      playNext();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    // Media Session Action Handlers
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrevious();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNext();
      });
      
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) {
          const skipTime = details.seekOffset || 10;
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - skipTime, 0);
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current) {
          const skipTime = details.seekOffset || 10;
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + skipTime, audioRef.current.duration);
        }
      });
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';

      if ('mediaSession' in navigator) {
        const handlers = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto', 'seekbackward', 'seekforward'];
        handlers.forEach(handler => {
          try {
            navigator.mediaSession.setActionHandler(handler as MediaSessionAction, null);
          } catch (e) {
            // Some browsers might not support all handlers
          }
        });
      }
    };
  }, [playNext, playPrevious]);

  // Update Media Session Metadata
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrackIndex >= 0 && currentTrackIndex < tracks.length) {
      const track = tracks[currentTrackIndex];
      const artworkUrl = track.coverUrl || `https://picsum.photos/seed/${track.id}/512/512`;
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        album: track.album || 'Unknown Album',
        artwork: [
          { src: artworkUrl, sizes: '96x96', type: 'image/png' },
          { src: artworkUrl, sizes: '128x128', type: 'image/png' },
          { src: artworkUrl, sizes: '192x192', type: 'image/png' },
          { src: artworkUrl, sizes: '256x256', type: 'image/png' },
          { src: artworkUrl, sizes: '384x384', type: 'image/png' },
          { src: artworkUrl, sizes: '512x512', type: 'image/png' },
        ]
      });
    }
  }, [currentTrackIndex, tracks]);

  // Update Media Session Playback State and Position
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      
      // Update position state for the progress bar in system UI
      if ('setPositionState' in navigator.mediaSession && audioRef.current && duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: audioRef.current.playbackRate || 1.0,
            position: currentTime,
          });
        } catch (error) {
          // Ignore errors if position state update fails (e.g. invalid values)
          console.warn('MediaSession setPositionState error:', error);
        }
      }
    }
  }, [isPlaying, currentTime, duration]);

  const lastRecordedTrackRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentTrackIndex >= 0 && currentTrackIndex < tracks.length && audioRef.current) {
      const track = tracks[currentTrackIndex];
      audioRef.current.src = track.url;
      lastRecordedTrackRef.current = null; // Reset so it counts as a new play
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
        if (lastRecordedTrackRef.current !== track.id) {
          setPlayHistory(prev => [...prev, { track, timestamp: Date.now() }]);
          lastRecordedTrackRef.current = track.id;
        }
      }
    }
  }, [currentTrackIndex, tracks]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
        if (currentTrackIndex >= 0 && currentTrackIndex < tracks.length) {
          const track = tracks[currentTrackIndex];
          if (lastRecordedTrackRef.current !== track.id) {
            setPlayHistory(prev => [...prev, { track, timestamp: Date.now() }]);
            lastRecordedTrackRef.current = track.id;
          }
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const addTracks = async (newTracks: Track[]) => {
    setTracks(prev => [...prev, ...newTracks]);
    if (currentTrackIndex === -1 && newTracks.length > 0) {
      setCurrentTrackIndex(0);
    }
    // Save to DB
    for (const track of newTracks) {
      await saveTrack(track);
    }
  };

  const playTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };

  const seek = (percentage: number) => {
    if (audioRef.current && duration) {
      const time = (percentage / 100) * duration;
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      setProgress(percentage);
    }
  };

  const removeTrack = async (id: string) => {
    setTracks(prev => {
      const currentTrackId = prev[currentTrackIndex]?.id;
      const newTracks = prev.filter(t => t.id !== id);
      
      if (currentTrackId === id) {
        if (newTracks.length === 0) {
          setCurrentTrackIndex(-1);
          setIsPlaying(false);
        } else {
          const oldIndex = prev.findIndex(t => t.id === id);
          setCurrentTrackIndex(oldIndex % newTracks.length);
        }
      } else if (currentTrackId) {
        setCurrentTrackIndex(newTracks.findIndex(t => t.id === currentTrackId));
      }
      return newTracks;
    });
    await deleteTrack(id);
  };

  const updateTrack = async (id: string, updates: Partial<Track>) => {
    setTracks(prev => {
      const newTracks = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      const updatedTrack = newTracks.find(t => t.id === id);
      if (updatedTrack) {
        updateTrackInDB(updatedTrack);
      }
      return newTracks;
    });
  };

  const queueTrackNext = (id: string) => {
    setTracks(prev => {
      const currentTrackId = prev[currentTrackIndex]?.id;
      const index = prev.findIndex(t => t.id === id);
      if (index === -1) return prev;
      const track = prev[index];
      const newTracks = [...prev];
      newTracks.splice(index, 1);
      
      const currentIdxInNew = newTracks.findIndex(t => t.id === currentTrackId);
      const insertPos = currentIdxInNew !== -1 ? currentIdxInNew + 1 : 0;
      newTracks.splice(insertPos, 0, track);
      
      if (currentTrackId) {
        setCurrentTrackIndex(newTracks.findIndex(t => t.id === currentTrackId));
      }
      return newTracks;
    });
  };

  const moveTrackToEnd = (id: string) => {
    setTracks(prev => {
      const currentTrackId = prev[currentTrackIndex]?.id;
      const index = prev.findIndex(t => t.id === id);
      if (index === -1) return prev;
      const track = prev[index];
      const newTracks = [...prev];
      newTracks.splice(index, 1);
      newTracks.push(track);
      
      if (currentTrackId) {
        setCurrentTrackIndex(newTracks.findIndex(t => t.id === currentTrackId));
      }
      return newTracks;
    });
  };

  const shuffleTracks = () => {
    setTracks(prev => {
      if (prev.length <= 1) return prev;
      const currentTrackId = currentTrackIndex >= 0 ? prev[currentTrackIndex]?.id : null;
      const newTracks = [...prev];
      for (let i = newTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newTracks[i], newTracks[j]] = [newTracks[j], newTracks[i]];
      }
      if (currentTrackId) {
        setCurrentTrackIndex(newTracks.findIndex(t => t.id === currentTrackId));
      }
      return newTracks;
    });
  };

  return {
    tracks,
    currentTrack: currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null,
    isPlaying,
    progress,
    currentTime,
    duration,
    addTracks,
    playTrack,
    togglePlayPause,
    playNext,
    playPrevious,
    seek,
    removeTrack,
    updateTrack,
    queueTrackNext,
    moveTrackToEnd,
    shuffleTracks,
    playHistory
  };
}
