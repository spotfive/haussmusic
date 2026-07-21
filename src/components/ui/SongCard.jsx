import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Heart, ListPlus, Music2, Timer, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SocialShareButtons from '@/components/songs/SocialShareButtons';

export default function SongCard({ song, isPlaying, isCurrentSong, onPlay, onFavorite, index, hidePlaylistButton = false, isScheduled = false, scheduledDatetime = null }) {
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
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

  const formatDuration = (s) => {
    if (!s) return '--:--';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?song=${song.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      className={`group relative flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 ${
        isScheduled ? 'opacity-60 cursor-default' : 'cursor-pointer'
      } ${
        isCurrentSong 
          ? 'bg-[#8B5CF6]/[0.08]' 
          : isScheduled ? '' : 'hover:bg-[#282828]'
      }`}
      onClick={() => {
        if (isScheduled && scheduledDatetime) {
          const d = new Date(scheduledDatetime);
          const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          toast(`${song.title}`, {
            description: `Estreia em ${dateStr} às ${timeStr}`,
            icon: <Timer className="w-4 h-4 text-amber-400" />,
          });
        } else if (!isScheduled) {
          onPlay(song);
        }
      }}
    >
      {/* Active indicator */}
      {isCurrentSong && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#8B5CF6] rounded-full" />
      )}

      {/* Index / Play */}
      <div className="w-8 flex items-center justify-center flex-shrink-0">
        <span className={`text-xs font-mono tabular-nums group-hover:hidden ${isCurrentSong ? 'text-[#8B5CF6]' : 'text-[#535353]'}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <motion.button
          whileTap={{ scale: 0.85 }}
          className="hidden group-hover:flex items-center justify-center w-7 h-7 rounded-full bg-[#8B5CF6] text-white"
          onClick={(e) => { e.stopPropagation(); onPlay(song); }}
        >
          {isCurrentSong && isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 ml-0.5" />
          )}
        </motion.button>
      </div>

      {/* Cover */}
      <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.03]">
        {song.cover_url ? (
          <img src={song.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="w-4 h-4 text-zinc-700" />
          </div>
        )}
        {/* Playing equalizer overlay */}
        {isCurrentSong && isPlaying && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="flex items-end gap-[2px] h-3">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[2px] bg-[#8B5CF6] rounded-full"
                  animate={{ height: ['30%', '100%', '30%'] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium truncate transition-colors ${isCurrentSong ? 'text-[#8B5CF6]' : 'text-white'}`}>
          {song.title}
        </h4>
        <p className="text-xs text-[#B3B3B3] truncate">
          {song.artist}
          {song.featuring && <span className="text-[#696969]"> feat. {song.featuring}</span>}
        </p>
        {song.label_name && (
          <p className="text-[10px] text-[#696969] truncate">
            {song.label_name}
          </p>
        )}
      </div>

      {/* Album (desktop) */}
      {song.album && (
        <div className="hidden lg:block w-36 flex-shrink-0">
          <p className="text-xs text-[#B3B3B3] truncate">{song.album}</p>
        </div>
      )}

      {/* Plays */}
      {song.plays > 0 && (
        <div className="hidden md:block w-16 text-right flex-shrink-0">
          <span className="text-xs text-[#696969]">{song.plays.toLocaleString()}</span>
        </div>
      )}

      {/* Actions - Compartilhar Social, Link e Curtir */}
      {!isScheduled && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <SocialShareButtons url={`${window.location.origin}/?song=${song.id}`} title={`🎵 ${song.title} - ${song.artist}`} />
          <button
            onClick={(e) => { e.stopPropagation(); handleShare(); }}
            className="p-1.5 rounded-lg text-[#696969] hover:text-white hover:bg-[#333] transition-colors"
            title="Copiar link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite(song); }}
            className={`p-1.5 rounded-lg transition-colors ${song.is_favorite ? 'text-[#8B5CF6]' : 'text-[#696969] hover:text-white hover:bg-[#333]'}`}
          >
            <Heart className={`w-3.5 h-3.5 ${song.is_favorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      )}
      {isScheduled && (
        <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded whitespace-nowrap">Em Breve</span>
      )}

      {/* Duration */}
      <div className="w-12 text-right flex-shrink-0">
        <span className="text-xs text-[#696969] tabular-nums">{formatDuration(song.duration)}</span>
      </div>

      {/* Playlist Menu */}
      {!hidePlaylistButton && (
        <div className={`transition-opacity duration-150 flex-shrink-0 ${isScheduled ? 'opacity-0' : 'opacity-60 group-hover:opacity-100'}`}>
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowPlaylistMenu(!showPlaylistMenu); }}
              className="p-1.5 rounded-lg text-[#696969] hover:text-white hover:bg-[#333] transition-colors"
            >
              <ListPlus className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {showPlaylistMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 w-44 bg-[#282828] border border-[#383838] rounded-xl shadow-2xl z-50 overflow-hidden"
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
      )}
    </motion.div>
  );
}