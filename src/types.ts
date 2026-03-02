export interface Track {
  id: string;
  file: File;
  url: string;
  title: string;
  artist: string;
  album?: string;
  formatInfo: string;
  coverUrl?: string;
  coverBlob?: Blob;
  isFavorite?: boolean;
  lyrics?: string;
  dominantColors?: string[];
}

export type ViewState = 'library' | 'player' | 'stats' | 'settings';
