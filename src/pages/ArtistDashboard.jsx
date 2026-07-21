import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Music, Heart, Eye, Calendar, Award, Edit2, Trash2, Play, Users, Plus, Clock, Disc, Mic } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReleaseCreatorPanel from '@/components/releases/ReleaseCreatorPanel';
import { toast } from 'sonner';

export default function ArtistDashboard() {
  const [user, setUser] = useState(null);
  const [showReleaseCreator, setShowReleaseCreator] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u.role !== 'admin' && u.user_type !== 'artista' && u.user_type !== 'staff') {
        window.location.href = '/';
      }
      setUser(u);
    }).catch(() => window.location.href = '/');
  }, []);

  const { data: myReleases = [] } = useQuery({
    queryKey: ['my-releases', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Post.list('-created_date');
      return all.filter(r => r.created_by === user?.email);
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: mySongs = [] } = useQuery({
    queryKey: ['my-songs', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Song.list('-created_date');
      return all.filter(s => s.created_by === user?.email);
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: myFollowers = [] } = useQuery({
    queryKey: ['my-followers', user?.id],
    queryFn: async () => {
      const all = await base44.entities.Follow.list();
      return all.filter(f => f.following_id === user?.id);
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = base44.entities.Follow.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['my-followers', user.id] });
    });
    return unsubscribe;
  }, [user?.id, queryClient]);

  const totalPlays = mySongs.reduce((acc, song) => acc + (song.plays || 0), 0) + 
                     myReleases.reduce((acc, release) => acc + (release.plays || 0), 0);
  const totalLikes = myReleases.reduce((acc, release) => acc + (release.likes || 0), 0) +
                     mySongs.reduce((acc, song) => acc + (song.is_favorite ? 1 : 0), 0);

  const deleteReleaseMutation = useMutation({
    mutationFn: async (releaseId) => {
      const allSongs = await base44.entities.Song.list();
      const releasePosts = await base44.entities.Post.list();
      const release = releasePosts.find(r => r.id === releaseId);
      if (release) {
        const songsToDelete = allSongs.filter(s => s.album === release.title);
        await Promise.all(songsToDelete.map(song => base44.entities.Song.delete(song.id)));
      }
      await base44.entities.Post.delete(releaseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-releases'] });
      queryClient.invalidateQueries({ queryKey: ['my-songs'] });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Lançamento excluído');
    },
  });

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c0c0c8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { icon: Music, value: mySongs.length, label: 'Músicas', color: 'from-zinc-300 to-zinc-500', bg: 'bg-zinc-400/10', text: 'text-zinc-300' },
    { icon: Eye, value: totalPlays, label: 'Reproduções', color: 'from-neutral-400 to-neutral-600', bg: 'bg-neutral-400/10', text: 'text-neutral-300' },
    { icon: Heart, value: totalLikes, label: 'Curtidas', color: 'from-slate-300 to-slate-500', bg: 'bg-slate-400/10', text: 'text-slate-300' },
    { icon: Disc, value: myReleases.length, label: 'Lançamentos', color: 'from-zinc-200 to-zinc-400', bg: 'bg-zinc-300/10', text: 'text-zinc-200' },
    { icon: Users, value: myFollowers.length, label: 'Seguidores', color: 'from-neutral-300 to-neutral-500', bg: 'bg-neutral-300/10', text: 'text-neutral-200' },
  ];

  return (
    <div className="min-h-screen pb-32">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#c0c0c8]/20 via-[#121212] to-[#e5e5ea]/10" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative px-6 lg:px-8 pt-8 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex-shrink-0"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden ring-2 ring-[#c0c0c8]/30 shadow-2xl shadow-[#c0c0c8]/20">
                {user.profile_picture ? (
                  <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8] to-[#e5e5ea] flex items-center justify-center">
                    <Mic className="w-12 h-12 text-white/60" />
                  </div>
                )}
              </div>
              {user.verified && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-500 border-4 border-[#121212] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex-1"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#c0c0c8] bg-[#c0c0c8]/10 px-3 py-1 rounded-full">
                  {user.user_type === 'staff' ? 'Staff' : 'Artista'}
                </span>
                {user.verified && (
                  <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verificado
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-1">
                {user.display_name || user.full_name}
              </h1>
              <p className="text-zinc-400 text-sm md:text-base">Dashboard do Artista — Gerencie seus lançamentos e acompanhe suas métricas</p>
            </motion.div>

            {/* Quick Action */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={() => setShowReleaseCreator(true)}
                className="bg-[#c0c0c8] hover:bg-[#e5e5ea] text-white rounded-full px-6 py-6 h-auto text-base font-bold shadow-lg shadow-[#c0c0c8]/30"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Lançamento
              </Button>
            </motion.div>
          </div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-8"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                className={`${stat.bg} rounded-xl border border-white/5 p-4 flex items-center gap-3 hover:border-white/10 transition-colors`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <motion.p
                    key={stat.value}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="text-xl font-bold text-white"
                  >
                    {stat.value.toLocaleString()}
                  </motion.p>
                  <p className={`text-xs ${stat.text}`}>{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="px-6 lg:px-8 pt-6">
        <Tabs defaultValue="releases" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
            <TabsTrigger value="releases" className="rounded-lg data-[state=active]:bg-[#c0c0c8] data-[state=active]:text-white">
              <Disc className="w-4 h-4 mr-2" />
              Lançamentos
            </TabsTrigger>
            <TabsTrigger value="songs" className="rounded-lg data-[state=active]:bg-[#c0c0c8] data-[state=active]:text-white">
              <Music className="w-4 h-4 mr-2" />
              Músicas
            </TabsTrigger>
          </TabsList>

          {/* Releases Tab */}
          <TabsContent value="releases" className="mt-6">
            <AnimatePresence mode="wait">
              {myReleases.length > 0 ? (
                <motion.div
                  key="releases"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                >
                  {myReleases.map((release, index) => (
                    <motion.div
                      key={release.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="group bg-[#181818] rounded-xl overflow-hidden hover:bg-[#282828] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"
                      onClick={() => window.location.href = `/Release?id=${release.id}`}
                    >
                      {/* Cover */}
                      <div className="aspect-square relative overflow-hidden">
                        {release.cover_url ? (
                          <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8]/40 to-[#e5e5ea]/40 flex items-center justify-center">
                            <Disc className="w-16 h-16 text-white/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            whileHover={{ opacity: 1, scale: 1 }}
                            className="w-12 h-12 rounded-full bg-[#c0c0c8] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-2xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (release.tracks?.[0]) {
                                window.dispatchEvent(new CustomEvent('playSong', { detail: release.tracks[0] }));
                              }
                            }}
                          >
                            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                          </motion.div>
                        </div>
                        {/* Type badge */}
                        <span className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-md">
                          {release.type}
                        </span>
                        {release.is_scheduled && (
                          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase bg-amber-500/90 text-black px-3 py-1 rounded-full shadow-lg">
                            Em Breve
                          </span>
                        )}
                        {/* Actions */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingRelease(release); setShowReleaseCreator(true); }}
                            className="p-1.5 bg-black/60 backdrop-blur-sm hover:bg-[#c0c0c8] rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Excluir este lançamento?')) deleteReleaseMutation.mutate(release.id);
                            }}
                            className="p-1.5 bg-black/60 backdrop-blur-sm hover:bg-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-3">
                        <h3 className="font-semibold text-white text-sm truncate">{release.title}</h3>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{release.artist}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                          {release.release_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(release.release_date).getFullYear()}
                            </span>
                          )}
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{release.likes || 0}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{release.plays || 0}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-[#181818] rounded-2xl border border-white/5"
                >
                  <div className="w-20 h-20 rounded-full bg-[#c0c0c8]/10 flex items-center justify-center mx-auto mb-4">
                    <Disc className="w-10 h-10 text-[#c0c0c8]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Nenhum lançamento ainda</h3>
                  <p className="text-zinc-400 mb-6 max-w-md mx-auto">Comece a construir seu catálogo musical criando seu primeiro single, EP ou álbum.</p>
                  <Button onClick={() => setShowReleaseCreator(true)} className="bg-[#c0c0c8] hover:bg-[#e5e5ea] rounded-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Lançamento
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* Songs Tab */}
          <TabsContent value="songs" className="mt-6">
            <AnimatePresence mode="wait">
              {mySongs.length > 0 ? (
                <motion.div
                  key="songs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#181818] rounded-2xl border border-white/5 overflow-hidden"
                >
                  {/* Table header */}
                  <div className="grid grid-cols-[40px_1fr_120px] gap-4 px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-white/5">
                    <span className="text-center">#</span>
                    <span>Título</span>
                    <span className="text-right">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Duração
                    </span>
                  </div>
                  {mySongs.map((song, index) => (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="grid grid-cols-[40px_1fr_120px] gap-4 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer group items-center"
                      onClick={() => window.dispatchEvent(new CustomEvent('playSong', { detail: song }))}
                    >
                      <span className="text-sm text-zinc-500 text-center group-hover:hidden">{index + 1}</span>
                      <Play className="w-4 h-4 text-white hidden group-hover:block mx-auto" />
                      <div className="flex items-center gap-3 min-w-0">
                        {song.cover_url ? (
                          <img src={song.cover_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gradient-to-br from-[#c0c0c8]/30 to-[#e5e5ea]/30 flex items-center justify-center flex-shrink-0">
                            <Music className="w-4 h-4 text-[#c0c0c8]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{song.title}</p>
                          <p className="text-xs text-zinc-500 truncate">{song.featuring ? `feat. ${song.featuring}` : song.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-sm text-zinc-500">{formatDuration(song.duration)}</span>
                        <span className="text-xs text-zinc-600">{song.plays || 0} plays</span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty-songs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-[#181818] rounded-2xl border border-white/5"
                >
                  <div className="w-20 h-20 rounded-full bg-[#c0c0c8]/10 flex items-center justify-center mx-auto mb-4">
                    <Music className="w-10 h-10 text-[#c0c0c8]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Nenhuma música ainda</h3>
                  <p className="text-zinc-400">Suas músicas aparecerão aqui após criar lançamentos.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </div>

      <ReleaseCreatorPanel
        isOpen={showReleaseCreator}
        onClose={() => {
          setShowReleaseCreator(false);
          setEditingRelease(null);
        }}
        releaseToEdit={editingRelease}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['my-releases'] });
          queryClient.invalidateQueries({ queryKey: ['my-songs'] });
        }}
      />
    </div>
  );
}