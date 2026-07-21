import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Heart, Clock, Calendar, Music2, User, ArrowLeft, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Release() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [playingTrackIndex, setPlayingTrackIndex] = useState(null);
  
  // Get release ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const releaseId = urlParams.get('id');

  const [user, setUser] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!releaseId) return;
    const unsubscribe = base44.entities.Post.subscribe((event) => {
      if (event.id === releaseId) {
        queryClient.setQueryData(['release', releaseId], (old) =>
          old ? { ...old, likes: event.data.likes || old.likes } : old
        );
      }
    });
    return unsubscribe;
  }, [releaseId, queryClient]);

  const { data: release, isLoading } = useQuery({
    queryKey: ['release', releaseId],
    queryFn: () => base44.entities.Post.list().then(posts => posts.find(p => p.id === releaseId)),
    enabled: !!releaseId
  });

  const { data: releaseSongs = [] } = useQuery({
    queryKey: ['release-songs', releaseId, release?.title],
    queryFn: async () => {
      const allSongs = await base44.entities.Song.list('-created_date');
      return allSongs.filter(s => s.album === release?.title);
    },
    enabled: !!release?.title
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['user-favorites', user?.email],
    queryFn: async () => {
      const allFavorites = await base44.entities.UserFavorite.list();
      return allFavorites.filter(f => f.created_by === user?.email);
    },
    enabled: !!user
  });

  useEffect(() => {
    if (releaseId && favorites.length >= 0) {
      setIsFavorite(favorites.some(f => f.item_id === releaseId && f.item_type === 'post'));
    }
  }, [releaseId, favorites]);

  // Sync track index when a song from this release is playing
  useEffect(() => {
    const handleCurrentSongChange = (e) => {
      const song = e.detail;
      if (song && releaseSongs.length > 0) {
        const index = releaseSongs.findIndex(s => s.id === song.id);
        if (index !== -1) {
          setPlayingTrackIndex(index);
          // Scroll the track into view
          setTimeout(() => {
            const element = document.getElementById(`track-${index}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 0);
        }
      }
    };
    window.addEventListener('activeSongChanged', handleCurrentSongChange);
    return () => window.removeEventListener('activeSongChanged', handleCurrentSongChange);
  }, [releaseSongs]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const newFavoriteState = !isFavorite;
      const newLikes = newFavoriteState ? (release?.likes || 0) + 1 : Math.max((release?.likes || 0) - 1, 0);
      
      if (isFavorite) {
        const favorite = favorites.find(f => f.item_id === releaseId && f.item_type === 'post');
        if (favorite) {
          await base44.entities.UserFavorite.delete(favorite.id);
        }
      } else {
        await base44.entities.UserFavorite.create({ item_id: releaseId, item_type: 'post' });
      }
      
      await base44.entities.Post.update(releaseId, { likes: newLikes });
      
      return { newFavoriteState, newLikes };
    },
    onMutate: async () => {
      // Atualização otimista
      const newFavoriteState = !isFavorite;
      const newLikes = newFavoriteState ? (release?.likes || 0) + 1 : Math.max((release?.likes || 0) - 1, 0);
      
      setIsFavorite(newFavoriteState);
      queryClient.setQueryData(['release', releaseId], (old) => 
        old ? { ...old, likes: newLikes } : old
      );
      queryClient.setQueryData(['posts'], (oldPosts) =>
        oldPosts?.map(p => p.id === releaseId ? { ...p, likes: newLikes } : p)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
    }
  });

  const isScheduled = release?.is_scheduled && release?.scheduled_datetime && new Date(release.scheduled_datetime) > new Date();

  const playSong = (song, index) => {
    if (isScheduled) return;
    if (playingTrackIndex === index) {
      window.dispatchEvent(new CustomEvent('togglePlayPause'));
    } else {
      setPlayingTrackIndex(index);
      window.dispatchEvent(new CustomEvent('playSong', { detail: song }));
    }
  };

  const playAll = () => {
    if (isScheduled || releaseSongs.length === 0) return;
    playSong(releaseSongs[0], 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500">Carregando...</div>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500">Lançamento não encontrado</div>
      </div>
    );
  }

  const totalDuration = releaseSongs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen pb-40 lg:pb-32">
      {/* Header */}
      <div className="relative h-64 lg:h-96 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          {release.background_video_url ? (
            <video
              src={release.background_video_url}
              loop
              muted
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : release.cover_url ? (
            <img src={release.cover_url} alt="" className="w-full h-full object-cover scale-110 blur-3xl opacity-40" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800/50 to-zinc-800/50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative h-full flex items-end px-4 lg:px-6 xl:px-8 pb-4 lg:pb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-end gap-4 lg:gap-6 w-full">
            {/* Cover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-32 h-32 lg:w-56 lg:h-56 rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl flex-shrink-0"
            >
              {release.cover_url ? (
                <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-500 to-zinc-500 flex items-center justify-center">
                  <Music2 className="w-20 h-20 text-white/50" />
                </div>
              )}
            </motion.div>

            {/* Info */}
            <div className="flex-1 w-full lg:w-auto">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate(-1)}
                className="mb-2 lg:mb-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
              >
                <ArrowLeft className="w-3.5 lg:w-4 h-3.5 lg:h-4" />
                Voltar
              </motion.button>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-2 mb-1 lg:mb-2">
                  <span className="text-xs lg:text-sm text-cyan-400 uppercase">{release.type}</span>
                  {isScheduled && (
                    <span className="text-[10px] lg:text-xs font-bold uppercase bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Em Breve</span>
                  )}
                </div>
                <h1 className="text-2xl lg:text-5xl font-black text-white mb-2 lg:mb-3 line-clamp-2">{release.title}</h1>
                <div className="flex items-center gap-2 text-sm lg:text-xl text-zinc-300 mb-2 lg:mb-4">
                  <User className="w-3.5 lg:w-5 h-3.5 lg:h-5" />
                  <span className="truncate">{release.artist}</span>
                  {release.featuring && (
                    <span className="text-zinc-500 truncate">feat. {release.featuring}</span>
                  )}
                </div>

                <div className="flex items-center gap-3 lg:gap-6 text-xs lg:text-sm text-zinc-400 flex-wrap">
                  {release.release_date && (
                    <div className="flex items-center gap-1.5 lg:gap-2">
                      <Calendar className="w-3 lg:w-4 h-3 lg:h-4" />
                      {new Date(release.release_date).getFullYear()}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 lg:gap-2">
                    <Music2 className="w-3 lg:w-4 h-3 lg:h-4" />
                    {releaseSongs.length} faixas
                  </div>
                  <div className="flex items-center gap-1.5 lg:gap-2">
                    <Clock className="w-3 lg:w-4 h-3 lg:h-4" />
                    {Math.floor(totalDuration / 60)} min
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 lg:px-6 xl:px-8 py-4 lg:py-6 flex items-center gap-2 lg:gap-4 flex-wrap">
        {isScheduled ? (
          <div className="px-5 lg:px-8 py-2.5 lg:py-3 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm lg:text-base font-bold flex items-center gap-2">
            <Timer className="w-4 lg:w-5 h-4 lg:h-5" />
            <span className="hidden sm:inline">
              Em Breve — {(() => {
                const d = new Date(release.scheduled_datetime);
                return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              })()}
            </span>
            <span className="sm:hidden">Em Breve</span>
          </div>
        ) : (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={playAll}
          className="px-5 lg:px-8 py-2.5 lg:py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white text-sm lg:text-base font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/30"
        >
          {playingTrackIndex === 0 ? (
            <Pause className="w-4 lg:w-5 h-4 lg:h-5 fill-current" />
          ) : (
            <Play className="w-4 lg:w-5 h-4 lg:h-5 fill-current" />
          )}
          <span className="hidden sm:inline">{playingTrackIndex === 0 ? 'Pausar' : 'Reproduzir'}</span>
        </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => likeMutation.mutate()}
          className={`p-2.5 lg:p-3 rounded-full ${
            isFavorite ? 'bg-pink-500/20 text-pink-500' : 'bg-white/10 text-white hover:bg-white/20'
          } transition-colors`}
        >
          <Heart className={`w-5 lg:w-6 h-5 lg:h-6 ${isFavorite ? 'fill-current' : ''}`} />
        </motion.button>

        <div className="ml-auto text-xs lg:text-base text-zinc-400">
          {release.likes || 0} curtidas
        </div>
      </div>

      {/* Description */}
      {release.description && (
        <div className="px-4 lg:px-6 xl:px-8 mb-6 lg:mb-8">
          <p className="text-sm lg:text-base text-zinc-400 max-w-3xl">{release.description}</p>
        </div>
      )}

      {/* Tracklist */}
      <div className="px-4 lg:px-6 xl:px-8">
        <h2 className="text-xl lg:text-2xl font-bold text-white mb-3 lg:mb-4">Faixas</h2>
        <div className="space-y-1">
           {releaseSongs.map((song, index) => (
             <motion.div
               key={song.id}
               id={`track-${index}`}
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: index * 0.05 }}
               onClick={() => playSong(song, index)}
               className={`group flex items-center gap-2 lg:gap-4 p-2.5 lg:p-3 rounded-lg lg:rounded-xl hover:bg-white/5 cursor-pointer transition-colors ${
                 playingTrackIndex === index ? 'bg-white/10' : ''
               }`}
             >
              <div className="w-8 lg:w-10 text-center flex-shrink-0">
                <span className={`text-sm lg:text-base text-zinc-500 group-hover:hidden ${playingTrackIndex === index ? 'hidden' : ''}`}>
                  {index + 1}
                </span>
                {playingTrackIndex === index ? (
                  <Pause className="w-3.5 lg:w-4 h-3.5 lg:h-4 text-cyan-400 mx-auto" />
                ) : (
                  <Play className={`w-3.5 lg:w-4 h-3.5 lg:h-4 text-cyan-400 mx-auto hidden group-hover:block`} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-sm lg:text-base font-medium truncate ${playingTrackIndex === index ? 'text-blue-400' : 'text-white'}`}>
                  {song.title}
                </div>
                {song.featuring && (
                  <div className="text-xs text-zinc-500 truncate">feat. {song.featuring}</div>
                )}
              </div>

              <div className="text-xs lg:text-sm text-zinc-500 flex-shrink-0">
                {formatDuration(song.duration)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}