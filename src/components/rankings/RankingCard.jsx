import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, Heart, Play, ListPlus } from 'lucide-react';
import RatingStars from './RatingStars';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function RankingCard({ item, rank, type, onRate, userRating }) {
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
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

  const getTrophyColor = (rank) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-zinc-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-zinc-600';
  };

  const getBadgeColor = (rank) => {
    if (rank === 1) return 'from-yellow-500 to-amber-500';
    if (rank === 2) return 'from-zinc-400 to-zinc-500';
    if (rank === 3) return 'from-amber-600 to-orange-600';
    return 'from-zinc-700 to-zinc-800';
  };

  // Only show playlist button for songs
  const isSong = !!item.audio_url || type === 'plays';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      whileHover={{ x: 5, scale: 1.01 }}
      className="group relative bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-violet-500/30 transition-all"
    >
      {/* Rank badge */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${getBadgeColor(rank)} flex items-center justify-center font-bold text-white shadow-lg`}
        >
          {rank <= 3 ? <Trophy className={`w-5 h-5 ${getTrophyColor(rank)}`} /> : rank}
        </motion.div>
      </div>

      <div className="flex items-center gap-4 ml-6">
        {/* Cover */}
        <div className="relative group/img">
          <div className="w-20 h-20 rounded-xl overflow-hidden">
            {item.cover_url ? (
              <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-600 to-fuchsia-600" />
            )}
          </div>
          {rank === 1 && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-xl bg-yellow-400/20"
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate group-hover:text-violet-400 transition-colors">
            {item.title}
          </h3>
          <p className="text-sm text-zinc-500 truncate">
            {item.artist}
            {item.featuring && <span className="text-zinc-600"> feat. {item.featuring}</span>}
          </p>
          
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <RatingStars rating={item.rating || 0} size="sm" />
            <span className="text-xs text-zinc-600">
              {item.rating?.toFixed(1) || 0} ({item.rating_count || 0})
            </span>
            
            {type === 'likes' && (
              <div className="flex items-center gap-1 text-pink-400">
                <Heart className="w-4 h-4 fill-current" />
                <span className="text-sm font-semibold">{item.likes || 0}</span>
              </div>
            )}
            
            {type === 'plays' && (
              <div className="flex items-center gap-1 text-cyan-400">
                <Play className="w-4 h-4 fill-current" />
                <span className="text-sm font-semibold">{item.plays || 0}</span>
              </div>
            )}
          </div>
        </div>

        {/* Rate & Actions */}
        <div className="flex items-center gap-3">
          {isSong && (
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlaylistMenu(!showPlaylistMenu);
                }}
                className="p-2 rounded-full text-zinc-500 hover:text-violet-400 hover:bg-white/5 transition-all"
              >
                <ListPlus className="w-5 h-5" />
              </motion.button>
              <AnimatePresence>
                {showPlaylistMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-2 border-b border-zinc-800">
                      <div className="text-xs text-zinc-500 px-2 py-1">Adicionar à playlist</div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {playlists.length > 0 ? (
                        playlists.map((playlist) => (
                          <button
                            key={playlist.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentSongs = playlist.song_ids || [];
                              if (!currentSongs.includes(item.id)) {
                                addToPlaylistMutation.mutate({
                                  playlistId: playlist.id,
                                  songIds: [...currentSongs, item.id]
                                });
                              }
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-800 transition-colors flex items-center gap-2"
                          >
                            <ListPlus className="w-3 h-3" />
                            {playlist.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-xs text-zinc-600 text-center">
                          Nenhuma playlist ainda
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <div className="flex flex-col items-end gap-2">
            <RatingStars 
              rating={userRating || 0}
              onRate={onRate}
              size="md"
              interactive={true}
            />
            <span className="text-xs text-zinc-600">Sua nota</span>
          </div>
        </div>
      </div>

      {/* Trending indicator for top 3 */}
      {rank <= 3 && (
        <motion.div
          animate={{ y: [-2, 2, -2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-2 right-2"
        >
          <TrendingUp className="w-4 h-4 text-[#A78BFA]" />
        </motion.div>
      )}
    </motion.div>
  );
}