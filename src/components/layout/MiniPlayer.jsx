import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Heart, Volume2, VolumeX, Repeat, Maximize2, Music2, ListPlus, GitMerge, Shuffle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function MiniPlayer({ 
  currentSong, isPlaying, onPlayPause, onNext, onPrevious,
  progress, currentTime, duration, onSeek,
  onExpand, isFavorite, onFavoriteToggle,
  volume, isMuted, onVolumeChange, onToggleMute,
  repeatMode, onToggleRepeat,
  crossfadeEnabled, onToggleCrossfade,
  shuffleEnabled, onToggleShuffle,
  onExpandMobile
}) {
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
  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct * duration);
  };

  if (!currentSong) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:px-2 lg:pb-2 lg:pl-[80px]">
      {/* Playlist menu - outside overflow container to avoid clipping */}
      <div className="absolute bottom-full right-2 mb-2 pointer-events-none z-[9999]">
        <AnimatePresence>
          {showPlaylistMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="w-44 bg-[#282828] border border-[#383838] rounded-xl shadow-2xl overflow-hidden pointer-events-auto"
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
                      if (!ids.includes(currentSong.id)) {
                        addToPlaylistMutation.mutate({ playlistId: pl.id, songIds: [...ids, currentSong.id] });
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

      <div className="bg-[#181818] border-t border-[#282828] lg:border lg:rounded-2xl mx-auto lg:max-w-5xl overflow-hidden">
        {/* Progress bar */}
        <div className="relative h-1 bg-[#282828] group/progress cursor-pointer" onClick={handleProgressClick}>
          <div
            className="absolute inset-y-0 left-0 bg-[#8B5CF6] rounded-full transition-all duration-100 group-hover/progress:h-1.5 group-hover/progress:-top-[1px]"
            style={{ width: `${progressPct}%` }}
          >
            <div className="absolute -right-[6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-md" />
          </div>
        </div>

        {/* Mobile layout */}
        <div className="flex lg:hidden flex-col gap-2 px-3 py-2.5">
          {/* Song info - compact */}
          <div className="flex items-center gap-2.5 min-w-0 cursor-pointer active:opacity-60" onClick={onExpandMobile}>
            {currentSong.cover_url ? (
              <img src={currentSong.cover_url} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-md bg-[#282828] flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate leading-tight">{currentSong.title}</p>
              <p className="text-[#B3B3B3] text-xs truncate">{currentSong.artist}</p>
            </div>
          </div>

          {/* Progress - compact */}
          <div
            className="relative h-1 bg-[#282828] rounded-full cursor-pointer group/prog"
            onClick={handleProgressClick}
          >
            <div
              className="absolute inset-y-0 left-0 bg-[#8B5CF6] rounded-full"
              style={{ width: `${progressPct}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-active/prog:opacity-100"
              style={{ left: `${progressPct}%`, marginLeft: '-6px' }}
            />
          </div>

          {/* Time - minimal */}
          <div className="flex items-center justify-between text-[11px] text-[#696969]">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Controls - only essentials */}
          <div className="flex items-center justify-center gap-2.5 pt-0.5">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onPrevious}
              className="p-2 rounded-lg text-[#B3B3B3] active:bg-[#282828]"
            >
              <SkipBack className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.90 }}
              onClick={onPlayPause}
              className="w-12 h-12 rounded-full bg-[#8B5CF6] flex items-center justify-center shadow-md flex-shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white fill-white" />
              ) : (
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onNext}
              className="p-2 rounded-lg text-[#B3B3B3] active:bg-[#282828]"
            >
              <SkipForward className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onFavoriteToggle}
              className={`p-2 rounded-lg ml-auto transition-colors ${isFavorite ? 'text-[#8B5CF6]' : 'text-[#B3B3B3] active:bg-[#282828]'}`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </motion.button>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden lg:flex items-center gap-3 px-4 py-2.5">
          {/* Song info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0 group/cover">
              {currentSong.cover_url ? (
                <img src={currentSong.cover_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-[#282828] flex items-center justify-center">
                  <Music2 className="w-5 h-5 text-[#535353]" />
                </div>
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onExpand}
                className="absolute inset-0 rounded-lg bg-black/70 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </motion.button>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{currentSong.title}</p>
              <p className="text-[#B3B3B3] text-xs truncate">{currentSong.artist}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 flex items-center justify-center gap-1">
            <button onClick={onToggleShuffle} className={`p-2 rounded-lg transition-colors ${shuffleEnabled ? 'text-[#8B5CF6]' : 'text-[#B3B3B3] hover:text-white'}`} title="Modo aleatório">
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={onToggleRepeat} className={`p-2 rounded-lg transition-colors ${repeatMode ? 'text-[#8B5CF6]' : 'text-[#B3B3B3] hover:text-white'}`}>
              <Repeat className="w-4 h-4" />
            </button>
            <button onClick={onPrevious} className="p-2 rounded-lg text-[#B3B3B3] hover:text-white transition-colors">
              <SkipBack className="w-4 h-4" />
            </button>
            <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={onPlayPause} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md">
              {isPlaying ? <Pause className="w-4 h-4 text-black fill-black" /> : <Play className="w-4 h-4 text-black fill-black ml-0.5" />}
            </motion.button>
            <button onClick={onNext} className="p-2 rounded-lg text-[#B3B3B3] hover:text-white transition-colors">
              <SkipForward className="w-4 h-4" />
            </button>
            <button onClick={onFavoriteToggle} className={`p-2 rounded-lg transition-colors ${isFavorite ? 'text-[#8B5CF6]' : 'text-[#B3B3B3] hover:text-white'}`}>
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button onClick={onToggleCrossfade} className={`p-2 rounded-lg transition-colors ${crossfadeEnabled ? 'text-[#8B5CF6]' : 'text-[#B3B3B3] hover:text-white'}`} title="Crossfade entre faixas">
              <GitMerge className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
              className="p-2 rounded-lg text-[#B3B3B3] hover:text-white transition-colors"
            >
              <ListPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Time + Volume */}
          <div className="flex items-center gap-2 flex-1 justify-end text-xs text-[#B3B3B3]">
            <span className="tabular-nums w-10 text-right">{formatTime(currentTime)}</span>
            <span className="text-[#535353]">/</span>
            <span className="tabular-nums w-10">{formatTime(duration)}</span>
            <div className="flex items-center gap-1 ml-3 max-w-[120px]">
              <button onClick={onToggleMute} className="p-1 text-[#B3B3B3] hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={onVolumeChange} className="w-full"
                style={{ background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${(isMuted ? 0 : volume) * 100}%, #535353 ${(isMuted ? 0 : volume) * 100}%, #535353 100%)` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}