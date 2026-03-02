import React, { useState } from 'react';
import { Track } from '../types';
import { Upload, Music, MoreVertical, Play, ListPlus, ListMusic, Heart, Info, Share2, Pen, Image as ImageIcon, Trash2, FolderOpen, Settings, Shuffle } from 'lucide-react';
import * as mm from 'music-metadata';
import { useSettings } from '../contexts/SettingsContext';

interface LibraryProps {
  tracks: Track[];
  onAddTracks: (tracks: Track[]) => void;
  onPlayTrack: (index: number) => void;
  currentTrackId?: string;
  onRemoveTrack: (id: string) => void;
  onUpdateTrack: (id: string, updates: Partial<Track>) => void;
  onQueueNext: (id: string) => void;
  onMoveToEnd: (id: string) => void;
  onShuffle: () => void;
  onOpenSettings: () => void;
}

export const Library: React.FC<LibraryProps> = ({ tracks, onAddTracks, onPlayTrack, currentTrackId, onRemoveTrack, onUpdateTrack, onQueueNext, onMoveToEnd, onShuffle, onOpenSettings }) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [detailsTrack, setDetailsTrack] = useState<Track | null>(null);
  const { settings } = useSettings();

  const getButtonShapeClass = () => {
    switch (settings.buttonShape) {
      case 'rounded': return 'rounded-xl';
      case 'pill': return 'rounded-full px-4';
      case 'minimal': return 'rounded-none bg-transparent border-none shadow-none';
      case 'circular':
      default: return 'rounded-full';
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const audioFiles = files.filter(f => f.type.startsWith('audio/') || f.name.endsWith('.flac') || f.name.endsWith('.mp3') || f.name.endsWith('.m4a') || f.name.endsWith('.wav') || f.name.endsWith('.ogg'));
      const lrcFiles = files.filter(f => f.name.endsWith('.lrc'));

      const newTracks: Track[] = await Promise.all(audioFiles.map(async file => {
        let title = file.name.replace(/\.[^/.]+$/, "");
        let artist = 'Unknown Artist';
        let album = 'Unknown Album';
        let coverUrl = '';
        let coverBlob: Blob | undefined;
        let lyrics = '';

        try {
          const metadata = await mm.parseBlob(file as any);
          if (metadata.common.title) title = metadata.common.title;
          if (metadata.common.artist) artist = metadata.common.artist;
          if (metadata.common.album) album = metadata.common.album;
          
          if (metadata.common.picture && metadata.common.picture.length > 0) {
            const picture = metadata.common.picture[0];
            coverBlob = new Blob([picture.data], { type: picture.format });
            coverUrl = URL.createObjectURL(coverBlob);
          }

          // Enhanced lyric extraction
          if (metadata.common.lyrics && metadata.common.lyrics.length > 0) {
            lyrics = metadata.common.lyrics.join('\n');
          } else {
            // Check native tags for lyrics if common.lyrics is empty
            const native = metadata.native;
            for (const type in native) {
              const tags = native[type];
              if (!Array.isArray(tags)) continue;
              
              // Look for any tag that might contain lyrics
              const lyricTag = tags.find(t => {
                const id = String(t.id).toUpperCase();
                return id === 'USLT' || 
                       id === 'LYRICS' || 
                       id === 'LYRIC' || 
                       id === '©LYR' || 
                       id === 'UNSYNCHRONISEDLYRICS' ||
                       id === 'UNSYNCED LYRICS' ||
                       id === 'TEXT';
              });

              if (lyricTag && lyricTag.value) {
                if (typeof lyricTag.value === 'string') {
                  lyrics = lyricTag.value;
                } else if (typeof lyricTag.value === 'object') {
                  // Some tags like USLT might be objects with { text: '...', language: '...' }
                  const val = lyricTag.value as any;
                  lyrics = val.text || val.description || JSON.stringify(val);
                }
                if (lyrics) break;
              }
            }
          }
        } catch (err) {
          console.error("Error parsing metadata", err);
        }

        if (!lyrics) {
          const matchingLrc = lrcFiles.find(lrc => lrc.name.replace(/\.[^/.]+$/, "") === file.name.replace(/\.[^/.]+$/, ""));
          if (matchingLrc) {
            lyrics = await matchingLrc.text();
          }
        }

        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';
        
        // Mocking bitrate and sample rate since we can't easily get it without full parsing
        const formatInfo = `${ext} | 320 kbps | 44.1 kHz`;

        return {
          id: Math.random().toString(36).substr(2, 9),
          file,
          url: URL.createObjectURL(file),
          title,
          artist,
          album,
          formatInfo,
          coverUrl,
          coverBlob,
          isFavorite: false,
          lyrics
        };
      }));
      onAddTracks(newTracks);
    }
  };

  const MenuItem = ({ icon, label, onClick, className = "" }: any) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} className={`w-full flex items-center space-x-4 px-4 py-3 hover:bg-white/10 transition-colors ${className}`}>
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  const activeTrack = tracks.find(t => t.id === activeMenuId);

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto pb-32 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-[70] bg-cyan-500 text-black px-6 py-3 rounded-full font-medium shadow-lg animate-in fade-in slide-in-from-top-4">
          {toast}
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
        <div className="flex space-x-2">
          <button onClick={() => { onShuffle(); showToast('Library shuffled'); }} className={`glass-button p-3 ${getButtonShapeClass()} flex items-center justify-center`} title="Shuffle Library">
            <Shuffle size={20} />
          </button>
          <label className={`glass-button p-3 ${getButtonShapeClass()} cursor-pointer flex items-center justify-center`} title="Add Folder">
            <FolderOpen size={20} />
            <input 
              type="file" 
              accept="audio/*,.lrc" 
              multiple 
              webkitdirectory=""
              className="hidden" 
              onChange={handleFileChange}
            />
          </label>
          <label className={`glass-button p-3 ${getButtonShapeClass()} cursor-pointer flex items-center justify-center`} title="Add Files">
            <Upload size={20} />
            <input 
              type="file" 
              accept=".flac,.mp3,.wav,.aac,.ogg,.m4a,audio/*,.lrc" 
              multiple 
              className="hidden" 
              onChange={handleFileChange}
            />
          </label>
          <button onClick={onOpenSettings} className={`glass-button p-3 ${getButtonShapeClass()} flex items-center justify-center`} title="Settings">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/50 space-y-4">
          <div className="w-24 h-24 rounded-full glass-panel flex items-center justify-center mb-4">
            <Music size={40} className="text-white/30" />
          </div>
          <p className="text-lg">No audio files loaded</p>
          <p className="text-sm text-center max-w-xs">Tap the upload icon to add FLAC or MP3 files to your library.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tracks.map((track, index) => (
            <div 
              key={track.id}
              onClick={() => onPlayTrack(index)}
              className={`glass-panel p-4 rounded-2xl flex items-center space-x-4 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${currentTrackId === track.id ? 'border-cyan-400/50 bg-white/20' : ''}`}
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                {track.coverUrl ? (
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <Music size={24} className="text-white/50" />
                )}
                {currentTrackId === track.id && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-cyan-400 animate-pulse" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-lg truncate">{track.title}</h3>
                <p className="text-white/60 text-sm truncate">{track.artist}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveMenuId(track.id); }} 
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <MoreVertical size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Menu Modal */}
      {activeMenuId && activeTrack && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setActiveMenuId(null)}>
          <div className="bg-[#1a1a1a] w-[90%] sm:w-96 rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-2">
              <MenuItem icon={<Play size={20}/>} label="Play Next" onClick={() => { onQueueNext(activeTrack.id); showToast('Will play next'); setActiveMenuId(null); }} />
              <MenuItem icon={<ListPlus size={20}/>} label="Add to Queue" onClick={() => { onMoveToEnd(activeTrack.id); showToast('Added to queue'); setActiveMenuId(null); }} />
              <MenuItem icon={<ListMusic size={20}/>} label="Add to Playlist" onClick={() => { showToast('Added to playlist'); setActiveMenuId(null); }} />
              <div className="h-px bg-white/10 my-1 mx-4" />
              <MenuItem icon={<Heart size={20} className={activeTrack.isFavorite ? "fill-current text-red-500" : ""} />} label={activeTrack.isFavorite ? "Remove from Favorites" : "Add to Favorites"} onClick={() => { onUpdateTrack(activeTrack.id, { isFavorite: !activeTrack.isFavorite }); showToast(activeTrack.isFavorite ? 'Removed from favorites' : 'Added to favorites'); setActiveMenuId(null); }} />
              <div className="h-px bg-white/10 my-1 mx-4" />
              <MenuItem icon={<Info size={20}/>} label="Song Details" onClick={() => { setDetailsTrack(activeTrack); setActiveMenuId(null); }} />
              <MenuItem icon={<Share2 size={20}/>} label="Share" onClick={() => { showToast('Link copied to clipboard'); setActiveMenuId(null); }} />
              <div className="h-px bg-white/10 my-1 mx-4" />
              <MenuItem icon={<Pen size={20}/>} label="Edit Tags" onClick={() => { setEditingTrack(activeTrack); setActiveMenuId(null); }} />
              <MenuItem icon={<ImageIcon size={20}/>} label="Edit Album Art" onClick={() => { 
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                          onUpdateTrack(activeTrack.id, { 
                            coverUrl: URL.createObjectURL(file),
                            coverBlob: file
                          });
                          showToast('Album art updated');
                      }
                  };
                  input.click();
                  setActiveMenuId(null); 
              }} />
              <MenuItem icon={<Trash2 size={20} className="text-red-400"/>} label="Delete" className="text-red-400" onClick={() => { onRemoveTrack(activeTrack.id); showToast('Track deleted'); setActiveMenuId(null); }} />
            </div>
          </div>
        </div>
      )}

      {/* Edit Tags Modal */}
      {editingTrack && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#222] p-6 rounded-2xl w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Edit Tags</h3>
            <input className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mb-3 text-white" defaultValue={editingTrack.title} id="edit-title" />
            <input className="w-full bg-black/50 border border-white/10 rounded-lg p-3 mb-6 text-white" defaultValue={editingTrack.artist} id="edit-artist" />
            <div className="flex justify-end space-x-3">
              <button className="px-4 py-2 text-white/60" onClick={() => setEditingTrack(null)}>Cancel</button>
              <button className="px-4 py-2 bg-cyan-500 text-black rounded-lg font-medium" onClick={() => {
                  const title = (document.getElementById('edit-title') as HTMLInputElement).value;
                  const artist = (document.getElementById('edit-artist') as HTMLInputElement).value;
                  onUpdateTrack(editingTrack.id, { title, artist });
                  setEditingTrack(null);
                  showToast('Tags updated');
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsTrack && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#222] p-6 rounded-2xl w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Song Details</h3>
            <div className="space-y-2 text-sm text-white/80 mb-6">
              <p><span className="text-white/40 w-20 inline-block">Title:</span> {detailsTrack.title}</p>
              <p><span className="text-white/40 w-20 inline-block">Artist:</span> {detailsTrack.artist}</p>
              <p><span className="text-white/40 w-20 inline-block">Format:</span> {detailsTrack.formatInfo}</p>
              <p><span className="text-white/40 w-20 inline-block">File:</span> {detailsTrack.file.name}</p>
            </div>
            <div className="flex justify-end">
              <button className="px-4 py-2 bg-white/10 rounded-lg" onClick={() => setDetailsTrack(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
