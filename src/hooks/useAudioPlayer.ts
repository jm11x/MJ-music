import { useState, useEffect, useRef, useCallback } from 'react';
import { Track, LyricLine } from '../types';
import { getAllTracks, saveTrack, deleteTrack, updateTrackInDB, savePlayHistory, getPlayHistory, updateTotalListeningTime, getTotalListeningTime } from '../services/db';

export function useAudioPlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playHistory, setPlayHistory] = useState<{track: Track, timestamp: number}[]>([]);
  const [totalListeningTime, setTotalListeningTime] = useState(0);
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

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

  // Load tracks and stats from DB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedTracks = await getAllTracks();
        const tracksWithUrls: Track[] = savedTracks.map(track => {
          const url = URL.createObjectURL(track.file);
          let coverUrl = track.coverUrl;
          
          if (track.coverBlob) {
            coverUrl = URL.createObjectURL(track.coverBlob);
          } else if (coverUrl && coverUrl.startsWith('blob:')) {
            coverUrl = undefined;
          }
          
          return {
            ...track,
            url,
            coverUrl
          };
        });
        setTracks(tracksWithUrls);

        // Load History
        const history = await getPlayHistory();
        const mappedHistory = history
          .map(h => {
            const track = tracksWithUrls.find(t => t.id === h.trackId);
            return track ? { track, timestamp: h.timestamp } : null;
          })
          .filter((h): h is { track: Track; timestamp: number } => h !== null);
        setPlayHistory(mappedHistory);

        // Load Total Time
        const totalTime = await getTotalListeningTime();
        setTotalListeningTime(totalTime);

      } catch (err) {
        console.error("Failed to load data from DB", err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const initAudioContext = () => {
      if (!audioContextRef.current) {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        
        audioContextRef.current = ctx;
        sourceRef.current = source;
        setAnalyzer(analyser);
      } else if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    const handlePlay = () => {
      initAudioContext();
    };

    audio.addEventListener('play', handlePlay);
    
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

  // Parse lyrics when track changes
  useEffect(() => {
    if (currentTrackIndex >= 0 && currentTrackIndex < tracks.length) {
      const track = tracks[currentTrackIndex];
      if (track.lyrics) {
        const lines = track.lyrics.split(/\r?\n/);
        const result: LyricLine[] = [];
        
        // Improved regex to handle:
        // [mm:ss.xx]
        // [mm:ss:xx]
        // [mm:ss]
        // [h:mm:ss.xx]
        // Multiple tags: [mm:ss.xx][mm:ss.yy]
        const timeRegex = /\[(\d+:)?(\d+):(\d+)([.:](\d+))?\]/g;

        for (const line of lines) {
          const timestamps: number[] = [];
          let match;
          
          // Reset regex lastIndex for each line
          timeRegex.lastIndex = 0;
          
          while ((match = timeRegex.exec(line)) !== null) {
            // match[1] is hours (optional, includes colon)
            // match[2] is minutes
            // match[3] is seconds
            // match[5] is milliseconds/hundredths (optional)
            
            const hours = match[1] ? parseInt(match[1].replace(':', ''), 10) : 0;
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);
            const fractional = match[5] ? parseInt(match[5], 10) : 0;
            
            let time = hours * 3600 + minutes * 60 + seconds;
            
            if (match[5]) {
              // Adjust fractional part based on its length
              const len = match[5].length;
              time += fractional / Math.pow(10, len);
            }
            
            timestamps.push(time);
          }
          
          // Extract text by removing all [time] tags and metadata tags like [ar:...]
          const text = line.replace(/\[(\d+:)?\d+:\d+([.:]\d+)?\]/g, '')
                           .replace(/\[[a-z]+:.*\]/gi, '')
                           .trim();
          
          if (timestamps.length > 0) {
            timestamps.forEach(time => {
              // We keep the line even if text is empty if it has a timestamp (could be an instrumental break)
              result.push({ time, text });
            });
          } else if (line.trim() && !line.match(/^\[[a-z]+:.*\]/i)) {
            // Static line without timestamp, and not a metadata tag
            result.push({ time: -1, text: line.trim() });
          }
        }
        
        // Sort by time and filter out any remaining metadata or empty artifacts
        let sorted = result
          .filter(l => l.text !== undefined)
          .sort((a, b) => a.time - b.time);
          
        // If we have static lyrics (no timestamps), estimate them
        const hasTimestamps = sorted.some(l => l.time !== -1);
        if (!hasTimestamps && sorted.length > 0 && duration > 0) {
          const lineDuration = duration / sorted.length;
          sorted = sorted.map((l, i) => ({
            ...l,
            time: i * lineDuration
          }));
        } else if (hasTimestamps) {
          // If some lines have timestamps and some don't, we might want to interpolate
          // For now, we'll just keep them as -1 or filter them if they are at the start
          // but a better approach is to assign them a time between the previous and next timed line
          let lastTimedIndex = -1;
          for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].time !== -1) {
              if (lastTimedIndex !== -1 && i - lastTimedIndex > 1) {
                // Interpolate between lastTimedIndex and i
                const startTime = sorted[lastTimedIndex].time;
                const endTime = sorted[i].time;
                const gap = i - lastTimedIndex;
                const step = (endTime - startTime) / gap;
                for (let j = 1; j < gap; j++) {
                  sorted[lastTimedIndex + j].time = startTime + (step * j);
                }
              }
              lastTimedIndex = i;
            }
          }
          
          // Handle lines before the first timestamp
          const firstTimedIndex = sorted.findIndex(l => l.time !== -1);
          if (firstTimedIndex > 0) {
            const firstTime = sorted[firstTimedIndex].time;
            const step = firstTime / (firstTimedIndex + 1);
            for (let i = 0; i < firstTimedIndex; i++) {
              sorted[i].time = step * (i + 1);
            }
          }
          
          // Handle lines after the last timestamp
          let lastTimedIdx = -1;
          for (let i = sorted.length - 1; i >= 0; i--) {
            if (sorted[i].time !== -1) {
              lastTimedIdx = i;
              break;
            }
          }
          if (lastTimedIdx !== -1 && lastTimedIdx < sorted.length - 1) {
            const lastTime = sorted[lastTimedIdx].time;
            const remainingTime = duration - lastTime;
            const gap = sorted.length - 1 - lastTimedIdx;
            const step = remainingTime / (gap + 1);
            for (let i = 1; i <= gap; i++) {
              sorted[lastTimedIdx + i].time = lastTime + (step * i);
            }
          }
        }

        setParsedLyrics(sorted);
      } else {
        setParsedLyrics([]);
      }
    } else {
      setParsedLyrics([]);
    }
  }, [currentTrackIndex, tracks]);

  const lastRecordedTrackRef = useRef<string | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Track listening time
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTotalListeningTime(prev => prev + 1);
      updateTotalListeningTime(1).catch(console.error);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (currentTrackIndex >= 0 && currentTrackIndex < tracks.length && audioRef.current) {
      const track = tracks[currentTrackIndex];
      audioRef.current.src = track.url;
      lastRecordedTrackRef.current = null; // Reset so it counts as a new play
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
        if (lastRecordedTrackRef.current !== track.id) {
          const timestamp = Date.now();
          setPlayHistory(prev => [...prev, { track, timestamp }]);
          savePlayHistory(track.id, timestamp).catch(console.error);
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
            const timestamp = Date.now();
            setPlayHistory(prev => [...prev, { track, timestamp }]);
            savePlayHistory(track.id, timestamp).catch(console.error);
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

  const seekToTime = (time: number) => {
    if (audioRef.current && duration) {
      const safeTime = Math.max(0, Math.min(time, duration));
      audioRef.current.currentTime = safeTime;
      setCurrentTime(safeTime);
      setProgress((safeTime / duration) * 100);
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
    seekToTime,
    removeTrack,
    updateTrack,
    queueTrackNext,
    moveTrackToEnd,
    shuffleTracks,
    playHistory,
    totalListeningTime,
    parsedLyrics,
    analyzer
  };
}
