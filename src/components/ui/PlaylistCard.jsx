import React from 'react';
import { motion } from 'framer-motion';
import { Play, Music2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PlaylistCard({ playlist, onPlay, index, songs = [] }) {
  // Get song covers for the playlist
  const playlistSongs = songs.filter(s => playlist.song_ids?.includes(s.id)).slice(0, 4);
  const songCovers = playlistSongs.map(s => s.cover_url).filter(Boolean);
  
  return (
    <Link to={createPageUrl('Playlist') + '?id=' + playlist.id}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        whileHover={{ 
          y: -4,
          transition: { duration: 0.2 }
        }}
        className="group relative rounded-lg p-4 cursor-pointer bg-zinc-900/40 hover:bg-zinc-900/60 transition-all duration-200"
      >

      {/* Dynamic cover grid */}
      <div className="relative aspect-square rounded overflow-hidden mb-3">
        {songCovers.length === 0 ? (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <Music2 className="w-12 h-12 text-zinc-700" />
          </div>
        ) : songCovers.length === 1 ? (
          <img 
            src={songCovers[0]} 
            alt={playlist.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        ) : songCovers.length === 2 ? (
          <div className="grid grid-cols-2 gap-0.5 w-full h-full">
            {songCovers.map((cover, i) => (
              <img 
                key={i}
                src={cover} 
                alt="" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            ))}
          </div>
        ) : songCovers.length === 3 ? (
          <div className="grid grid-cols-2 gap-0.5 w-full h-full">
            <img 
              src={songCovers[0]} 
              alt="" 
              className="col-span-2 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <img 
              src={songCovers[1]} 
              alt="" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <img 
              src={songCovers[2]} 
              alt="" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0.5 w-full h-full">
            {songCovers.slice(0, 4).map((cover, i) => (
              <img 
                key={i}
                src={cover} 
                alt="" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            ))}
          </div>
        )}
        
        {/* Play button */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPlay(playlist)}
            className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </motion.button>
        </div>
      </div>

      {/* Info */}
      <h3 className="font-medium text-sm text-zinc-200 truncate mb-1">{playlist.name}</h3>
      <p className="text-xs text-zinc-600 truncate">
        {playlist.description || `${playlist.song_ids?.length || 0} músicas`}
      </p>
      </motion.div>
    </Link>
  );
}