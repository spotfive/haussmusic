import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Music2, User, ListPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BackgroundMedia from '@/components/media/BackgroundMedia';

export default function RightSidebar({ song, isPlaying, onClose, isFavorite, onFavoriteToggle }) {
  const videoRef = useRef(null);
  const [artist, setArtist] = useState(null);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);



  const { data: playlists = [] } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const all = await base44.entities.Playlist.list('-created_date');
      return all.filter(p => p.created_by === user?.email);
    },
    enabled: !!user && showPlaylistMenu,
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: ({ playlistId, songIds }) => base44.entities.Playlist.update(playlistId, { song_ids: songIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setShowPlaylistMenu(false);
    },
  });

  useEffect(() => {
    const loadArtist = async () => {
      try {
        const users = await base44.entities.User.list();
        const found = users.find(u => 
          u.display_name === song?.artist || u.full_name === song?.artist
        );
        setArtist(found || null);
      } catch (error) {
        console.error('Error loading artist:', error);
      }
    };
    if (song?.artist) loadArtist();
  }, [song?.artist, song?.id]);

  if (!song) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[#121212] border-l border-[#282828] z-40 flex flex-col shadow-2xl"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2.5 bg-[#181818] hover:bg-[#282828] rounded-xl transition-colors"
        >
          <X className="w-4 h-4 text-[#B3B3B3]" />
        </button>

        {/* Media */}
        <div className="relative w-full aspect-square bg-black">
          {song.background_video_url ? (
            <BackgroundMedia
              src={song.background_video_url}
              alt={song.title}
              videoRef={videoRef}
              className="w-full h-full object-cover"
            />
          ) : song.cover_url ? (
            <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#c0c0c8]/20 to-[#1a1030]">
              <Music2 className="w-20 h-20 text-[#535353]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
        </div>

        {/* Info */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 leading-tight">{song.title}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={createPageUrl('ArtistProfile') + '?id=' + (artist?.id || '')} className="flex items-center gap-1.5 hover:underline">
                  <span className="text-[#B3B3B3] font-medium">{song.artist}</span>
                  {artist?.verified && (
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </Link>
                {song.featuring && (
                  <span className="text-[#696969] text-sm">feat. {song.featuring}</span>
                )}
              </div>
            </div>

            {song.album && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#181818]">
                <Music2 className="w-4 h-4 text-[#B3B3B3]" />
                <div>
                  <p className="text-sm text-white">{song.album}</p>
                  {song.type && <p className="text-xs text-[#696969] uppercase">{song.type}</p>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 rounded-xl bg-[#181818]">
                <p className="text-lg font-bold text-white">{(song.plays || 0).toLocaleString()}</p>
                <p className="text-[10px] text-[#B3B3B3] uppercase tracking-wider">Plays</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-[#181818]">
                <p className="text-lg font-bold text-white">{song.rating > 0 ? song.rating.toFixed(1) : '—'}</p>
                <p className="text-[10px] text-[#B3B3B3] uppercase tracking-wider">Rating</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-[#181818]">
                <p className="text-lg font-bold text-white">{song.duration ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, '0')}` : '—'}</p>
                <p className="text-[10px] text-[#B3B3B3] uppercase tracking-wider">Duração</p>
              </div>
            </div>

            {song.genre && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#c0c0c8]/10 text-[#c0c0c8] border border-[#c0c0c8]/20">
                {song.genre}
              </span>
            )}

            <div className="flex items-center gap-3 pt-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onFavoriteToggle}
                className={`flex-1 py-2 rounded-lg transition-colors ${isFavorite ? 'bg-[#c0c0c8]/20 text-[#c0c0c8]' : 'bg-[#181818] text-[#B3B3B3] hover:text-white'}`}
              >
                <Heart className={`w-4 h-4 mx-auto ${isFavorite ? 'fill-current' : ''}`} />
              </motion.button>
              <div className="flex-1 relative">
                <button 
                  onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
                  className="w-full py-2 rounded-lg bg-[#181818] text-[#B3B3B3] hover:text-white transition-colors"
                >
                  <ListPlus className="w-4 h-4 mx-auto" />
                </button>
                <AnimatePresence>
                  {showPlaylistMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 bottom-full mb-2 w-44 bg-[#282828] border border-[#383838] rounded-xl shadow-2xl z-[60] overflow-hidden"
                    >
                      <div className="px-3 py-2 border-b border-[#383838]">
                        <span className="text-[11px] text-[#B3B3B3] font-medium uppercase tracking-wider">Adicionar à playlist</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {playlists.length > 0 ? playlists.map((pl) => (
                          <button
                            key={pl.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              const ids = pl.song_ids || [];
                              if (!ids.includes(song.id)) {
                                addToPlaylistMutation.mutate({ playlistId: pl.id, songIds: [...ids, song.id] });
                              }
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-white hover:bg-[#383838] transition-colors truncate"
                          >
                            {pl.name}
                          </button>
                        )) : (
                          <p className="px-3 py-3 text-xs text-[#696969] text-center">Nenhuma playlist</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}