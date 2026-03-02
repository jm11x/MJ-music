import React from 'react';
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Settings, Music } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

import { Track } from '../types';

const data = [
  { name: 'Mon', time: 2.5 },
  { name: 'Tue', time: 3.8 },
  { name: 'Wed', time: 2.1 },
  { name: 'Thu', time: 4.5 },
  { name: 'Fri', time: 8.2 },
  { name: 'Sat', time: 6.5 },
  { name: 'Sun', time: 5.0 },
];

const topArtists = [
  { id: 1, name: 'The Weeknd', plays: 142, image: 'https://picsum.photos/seed/weeknd/200/200' },
  { id: 2, name: 'Lana Del Rey', plays: 98, image: 'https://picsum.photos/seed/lana/200/200' },
  { id: 3, name: 'The Ramblers', plays: 76, image: 'https://picsum.photos/seed/ramblers/200/200' },
  { id: 4, name: 'Daft Punk', plays: 65, image: 'https://picsum.photos/seed/daft/200/200' },
];

const topSongs = [
  { id: 1, title: 'Gasoline', artist: 'The Weeknd', plays: 45, image: 'https://picsum.photos/seed/gasoline/100/100' },
  { id: 2, title: 'Video Games', artist: 'Lana Del Rey', plays: 38, image: 'https://picsum.photos/seed/videogames/100/100' },
  { id: 3, title: 'Instant Crush', artist: 'Daft Punk', plays: 32, image: 'https://picsum.photos/seed/crush/100/100' },
  { id: 4, title: 'Let It Happen', artist: 'Tame Impala', plays: 28, image: 'https://picsum.photos/seed/happen/100/100' },
  { id: 5, title: 'Midnight City', artist: 'M83', plays: 24, image: 'https://picsum.photos/seed/midnight/100/100' },
];

export const Stats = ({ onOpenSettings, playHistory = [] }: { onOpenSettings?: () => void, playHistory?: {track: Track, timestamp: number}[] }) => {
  const { settings } = useSettings();
  const [period, setPeriod] = React.useState('Today');
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const getContainerShapeClass = () => {
    switch (settings.buttonShape) {
      case 'rounded': return 'rounded-2xl';
      case 'pill': return 'rounded-full';
      case 'minimal': return 'rounded-none border-none shadow-none bg-black/40 backdrop-blur-md';
      case 'circular':
      default: return 'rounded-full';
    }
  };

  const getButtonShapeClass = () => {
    switch (settings.buttonShape) {
      case 'rounded': return 'rounded-xl';
      case 'pill': return 'rounded-full';
      case 'minimal': return 'rounded-none';
      case 'circular':
      default: return 'rounded-full';
    }
  };

  // Calculate real stats
  const totalSeconds = playHistory.reduce((acc, curr) => acc + 180, 0); // Assuming 3 mins per play for mock if duration not available, but let's try to get real duration if possible.
  // Actually, let's just count plays for now as "time" is hard to track without a timer.
  // But I can use the track duration if I had it. Track doesn't have duration in the interface.
  // Wait, Player.tsx has duration. useAudioPlayer has duration.
  // Let's assume 3.5 minutes per song for the stats if we don't have it.
  
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);

  const songCounts = playHistory.reduce((acc: Record<string, {track: Track, count: number}>, curr) => {
    if (!acc[curr.track.id]) {
      acc[curr.track.id] = { track: curr.track, count: 0 };
    }
    acc[curr.track.id].count++;
    return acc;
  }, {});

  const top5Songs = Object.values(songCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const artistCounts = playHistory.reduce((acc: Record<string, {name: string, count: number, image?: string}>, curr) => {
    const artist = curr.track.artist;
    if (!acc[artist]) {
      acc[artist] = { name: artist, count: 0, image: curr.track.coverUrl };
    }
    acc[artist].count++;
    return acc;
  }, {});

  const top5Artists = Object.values(artistCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Mock chart data based on history and selected period
  const getChartData = () => {
    if (period === 'Today') {
      const hours = ['00', '04', '08', '12', '16', '20'];
      return hours.map(h => {
        const count = playHistory.filter(hp => {
          const date = new Date(hp.timestamp);
          const hour = date.getHours();
          return hour >= parseInt(h) && hour < parseInt(h) + 4;
        }).length;
        return { name: `${h}:00`, time: count * 3.5 };
      });
    } else if (period === 'Month') {
      const weeks = ['W1', 'W2', 'W3', 'W4'];
      return weeks.map((w, i) => {
        const count = playHistory.filter(hp => {
          const date = new Date(hp.timestamp);
          const day = date.getDate();
          return day >= i * 7 + 1 && day < (i + 1) * 7 + 1;
        }).length;
        return { name: w, time: count * 3.5 };
      });
    } else {
      const months = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'];
      return months.map(m => {
        const count = playHistory.filter(hp => {
          const date = new Date(hp.timestamp);
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return monthNames[date.getMonth()].startsWith(m);
        }).length;
        return { name: m, time: count * 3.5 };
      });
    }
  };

  const chartData = getChartData();

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto pb-32">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Listening Stats</h1>
        <button onClick={onOpenSettings} className="p-2 text-white/70 hover:text-white transition-colors">
          <Settings size={24} />
        </button>
      </div>


      {/* Chart Card */}
      <div className="glass-panel rounded-3xl p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <h3 className="text-white/70 text-sm font-medium mb-1">Total Listening Time</h3>
        <p className="text-2xl font-bold mb-6">{totalHours}h {totalMins}m</p>
        
        <div className="h-48 w-full relative min-h-[192px] overflow-hidden">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%" key={period}>
              <AreaChart id="stats-chart" data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: 'white', fontSize: '12px' }}
                  itemStyle={{ color: 'white' }}
                />
                <Area type="monotone" dataKey="time" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorTime)" animationDuration={1000} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} dy={10} height={30} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top 5 Songs */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Top 5 Songs</h3>
        <div className="space-y-3">
          {top5Songs.length > 0 ? top5Songs.map((item, index) => (
            <div key={item.track.id} className="glass-panel rounded-2xl p-3 flex items-center space-x-4">
              <span className="text-white/50 font-bold w-4 text-center">{index + 1}</span>
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                {item.track.coverUrl ? (
                  <img src={item.track.coverUrl} alt={item.track.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Music size={16} className="text-white/20"/></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.track.title}</p>
                <p className="text-xs text-white/50 truncate">{item.track.artist}</p>
              </div>
              <div className="text-xs text-white/40 font-mono">{item.count} plays</div>
            </div>
          )) : (
            <p className="text-white/30 text-center py-4 text-sm">No listening history yet</p>
          )}
        </div>
      </div>

      {/* Top Artists - Compact Circle Grid */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Top Artists</h3>
        <div className="grid grid-cols-3 gap-4">
          {top5Artists.length > 0 ? top5Artists.map((artist, index) => (
            <div key={artist.name} className="flex flex-col items-center text-center space-y-2 group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden relative bg-white/5 border border-white/10 shadow-lg">
                {artist.image ? (
                  <img 
                    src={artist.image} 
                    alt={artist.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music size={24} className="text-white/10"/>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                <div className="absolute top-0 right-0 bg-white text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {index + 1}
                </div>
              </div>
              <div className="w-full">
                <p className="font-bold text-[11px] truncate uppercase tracking-wider">{artist.name}</p>
                <p className="text-[10px] text-white/40 font-medium">{artist.count} plays</p>
              </div>
            </div>
          )) : (
            <div className="col-span-3 py-8 glass-panel rounded-2xl flex flex-col items-center justify-center text-white/30">
              <Music size={24} className="mb-2 opacity-20" />
              <p className="text-xs">No artists in history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
