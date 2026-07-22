import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Music, Eye, Heart, Users, AlertCircle, Disc, Trash2, Play, Calendar, Trash, UserPlus, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ReleaseCreatorPanel from '@/components/releases/ReleaseCreatorPanel';
import ImageCropper from '@/components/profile/ImageCropper';
import { hasUserType, withUserType, withoutUserType } from '@/lib/utils';

export default function LabelDashboard() {
  const [user, setUser] = useState(null);
  const [selectedLabelId, setSelectedLabelId] = useState(null);
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [showReleaseCreator, setShowReleaseCreator] = useState(false);
  const [cropperImage, setCropperImage] = useState(null);
  const [searchRepresentative, setSearchRepresentative] = useState('');
  const [showAddRep, setShowAddRep] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!hasUserType(u, 'gravadora') && !hasUserType(u, 'staff') && u.role !== 'admin') {
        window.location.href = '/';
      }
      setUser(u);
    }).catch(() => window.location.href = '/');
  }, []);

  const isStaffOrAdmin = hasUserType(user, 'staff') || user?.role === 'admin';

  // A "gravadora" is its own Label record (created by an admin), not the
  // logged-in user — the user is just listed in that Label's representatives.
  const { data: labels = [] } = useQuery({
    queryKey: ['labels'],
    queryFn: () => base44.entities.Label.list('-created_date', 100),
    enabled: !!user,
  });

  const myLabels = labels.filter(l => l.representatives?.includes(user?.id));
  const label = labels.find(l => l.id === selectedLabelId) || myLabels[0] || null;

  useEffect(() => {
    if (!selectedLabelId && myLabels.length > 0) setSelectedLabelId(myLabels[0].id);
  }, [myLabels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: managedArtists = [] } = useQuery({
    queryKey: ['managedArtists', label?.id],
    queryFn: async () => {
      if (!label?.managed_artists || label.managed_artists.length === 0) return [];
      const artists = await Promise.all(
        label.managed_artists.map(id => base44.entities.User.get(id).catch(() => null))
      );
      return artists.filter(Boolean);
    },
    enabled: !!label,
  });

  // Releases published directly by the label already carry label_id, but a
  // managed artist's own self-posted releases never did — so filtering on
  // label_id alone hid everything an artist posted outside the label flow,
  // both before and after joining. Pull everything and match by whichever
  // identifier the row actually has instead.
  const { data: allPosts = [] } = useQuery({
    queryKey: ['labelAllPosts'],
    queryFn: () => base44.entities.Post.list('-release_date', 200),
    enabled: !!label,
    refetchInterval: 5000,
  });

  const { data: allSongs = [] } = useQuery({
    queryKey: ['labelAllSongs'],
    queryFn: () => base44.entities.Song.list('-created_date', 300),
    enabled: !!label,
  });

  const managedArtistIds = new Set(label?.managed_artists || []);
  const managedArtistEmails = new Set(managedArtists.map(a => a.email).filter(Boolean));
  const managedArtistNames = new Set(managedArtists.flatMap(a => [a.display_name, a.full_name]).filter(Boolean));

  const belongsToLabel = (item) =>
    item.label_id === label?.id ||
    (item.artist_id && managedArtistIds.has(item.artist_id)) ||
    (item.created_by && managedArtistEmails.has(item.created_by)) ||
    (item.artist && managedArtistNames.has(item.artist));

  const labelPosts = allPosts.filter(belongsToLabel);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list('-created_date', 100),
    enabled: !!label,
  });

  const { data: representatives = [] } = useQuery({
    queryKey: ['representatives', label?.id],
    queryFn: async () => {
      if (!label?.representatives || label.representatives.length === 0) return [];
      const reps = await Promise.all(
        label.representatives.map(id => base44.entities.User.get(id).catch(() => null))
      );
      return reps.filter(Boolean);
    },
    enabled: !!label,
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId) => {
      const post = allPosts.find(p => p.id === postId);
      if (post) {
        // A post's own tracks are identified by album+artist matching the
        // post itself — not by label_id, since the post may be one of the
        // self-posted releases that never had label_id set in the first place.
        const songsToDelete = allSongs.filter(s => s.album === post.title && (s.artist_id === post.artist_id || s.artist === post.artist));
        await Promise.all(songsToDelete.map(song => base44.entities.Song.delete(song.id)));
      }
      await base44.entities.Post.delete(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labelAllPosts'] });
      queryClient.invalidateQueries({ queryKey: ['labelAllSongs'] });
      toast.success('Lançamento excluído');
    },
  });

  const updateLabelMutation = useMutation({
    mutationFn: async (data) => base44.entities.Label.update(label.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Gravadora atualizada');
    }
  });

  const addRepresentativeMutation = useMutation({
    mutationFn: async (repId) => {
      const reps = label.representatives || [];
      if (!reps.includes(repId)) {
        await base44.entities.Label.update(label.id, { representatives: [...reps, repId] });
        const repUser = allUsers.find(u => u.id === repId);
        await base44.entities.User.update(repId, { user_type: withUserType(repUser, 'gravadora') });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
      setSearchRepresentative('');
      setShowAddRep(false);
      toast.success('Representante adicionado');
    }
  });

  const removeRepresentativeMutation = useMutation({
    mutationFn: async (repId) => {
      const reps = (label.representatives || []).filter(id => id !== repId);
      await base44.entities.Label.update(label.id, { representatives: reps });

      const isRepForOthers = labels.some(l => l.id !== label.id && l.representatives?.includes(repId));
      if (!isRepForOthers) {
        const repUser = representatives.find(u => u.id === repId);
        await base44.entities.User.update(repId, { user_type: withoutUserType(repUser, 'gravadora') });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
      toast.success('Representante removido');
    }
  });

  const removeArtistMutation = useMutation({
    mutationFn: async (artistId) => {
      const artists = (label.managed_artists || []).filter(id => id !== artistId);
      await base44.entities.Label.update(label.id, { managed_artists: artists });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managedArtists'] });
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Artista desvinculado');
    }
  });

  const selectedArtistObject = managedArtists.find(a => a.id === selectedArtistId);

  const totalPlays = labelPosts.reduce((acc, post) => acc + (post.plays || 0), 0);
  const totalLikes = labelPosts.reduce((acc, post) => acc + (post.likes || 0), 0);

  const stats = [
    { icon: Music, value: managedArtists.length, label: 'Artistas', color: 'from-zinc-300 to-zinc-500', bg: 'bg-zinc-400/10', text: 'text-zinc-300' },
    { icon: Eye, value: totalPlays, label: 'Reproduções', color: 'from-neutral-400 to-neutral-600', bg: 'bg-neutral-400/10', text: 'text-neutral-300' },
    { icon: Heart, value: totalLikes, label: 'Curtidas', color: 'from-slate-300 to-slate-500', bg: 'bg-slate-400/10', text: 'text-slate-300' },
    { icon: Disc, value: labelPosts.length, label: 'Lançamentos', color: 'from-zinc-200 to-zinc-400', bg: 'bg-zinc-300/10', text: 'text-zinc-200' },
  ];

  const availableReps = allUsers.filter(u => !representatives.find(r => r.id === u.id) && u.id !== user?.id);
  const filteredReps = availableReps.filter(u => u.display_name?.toLowerCase().includes(searchRepresentative.toLowerCase()) || u.email?.toLowerCase().includes(searchRepresentative.toLowerCase()));

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c0c0c8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasUserType(user, 'gravadora') && !hasUserType(user, 'staff') && user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-[#B3B3B3]">Acesso restrito a gravadoras</p>
        </div>
      </div>
    );
  }

  if (!label) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertCircle className="w-8 h-8 text-[#c0c0c8]" />
          {isStaffOrAdmin && labels.length > 0 ? (
            <>
              <p className="text-white font-semibold">Escolha uma gravadora para gerenciar</p>
              <Select value={selectedLabelId || ''} onValueChange={setSelectedLabelId}>
                <SelectTrigger className="bg-[#181818] border-[#383838] text-white w-64">
                  <SelectValue placeholder="Selecione uma gravadora" />
                </SelectTrigger>
                <SelectContent className="bg-[#282828] border-[#383838]">
                  {labels.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-white">{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <p className="text-[#B3B3B3]">
              Sua conta ainda não está associada a nenhuma gravadora. Peça a um admin para te adicionar como representante em Admin → Gravadoras.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#c0c0c8]/20 via-[#121212] to-[#e5e5ea]/10" />
        <div className="relative px-6 lg:px-8 pt-8 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Label logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex-shrink-0 group cursor-pointer"
              onClick={() => {
                const reader = new FileReader();
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    reader.onload = (ev) => setCropperImage(ev.target.result);
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
            >
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden ring-2 ring-[#c0c0c8]/30 shadow-2xl shadow-[#c0c0c8]/20 bg-gradient-to-br from-[#c0c0c8] to-[#e5e5ea] flex items-center justify-center">
                {label.profile_picture ? (
                  <img src={label.profile_picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-12 h-12 text-white/60" />
                )}
              </div>
              <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100">Trocar logo</span>
              </div>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex-1"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#c0c0c8] bg-[#c0c0c8]/10 px-3 py-1 rounded-full">Gravadora</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-1">{label.name}</h1>
              <p className="text-zinc-400 text-sm md:text-base">Dashboard da Gravadora — Gerencie seus artistas e publicações</p>
            </motion.div>

            {/* Quick Action */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={() => {
                  if (selectedArtistId) setShowReleaseCreator(true);
                  else toast.error('Selecione um artista primeiro');
                }}
                className="btn-metal rounded-full px-6 py-6 h-auto text-base font-bold shadow-lg shadow-[#c0c0c8]/30"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Lançamento
              </Button>
            </motion.div>
          </div>

          {/* Artist Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 max-w-md"
          >
            <label className="text-sm font-medium text-[#B3B3B3] mb-2 block">Selecione o artista para publicar</label>
            <Select value={selectedArtistId} onValueChange={setSelectedArtistId}>
              <SelectTrigger className="bg-[#181818] border-[#383838] text-white">
                <SelectValue placeholder="Escolha um artista" />
              </SelectTrigger>
              <SelectContent className="bg-[#282828] border-[#383838]">
                {managedArtists.map((artist) => (
                  <SelectItem key={artist.id} value={artist.id} className="text-white">
                    {artist.display_name || artist.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
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
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl grid w-full grid-cols-4">
            <TabsTrigger value="releases" className="rounded-lg data-[state=active]:bg-gradient-to-b data-[state=active]:from-zinc-200 data-[state=active]:to-zinc-400 data-[state=active]:text-zinc-900 text-xs">
              <Disc className="w-4 h-4 mr-1" />
              Lançamentos
            </TabsTrigger>
            <TabsTrigger value="artists" className="rounded-lg data-[state=active]:bg-gradient-to-b data-[state=active]:from-zinc-200 data-[state=active]:to-zinc-400 data-[state=active]:text-zinc-900 text-xs">
              <Users className="w-4 h-4 mr-1" />
              Artistas
            </TabsTrigger>
            <TabsTrigger value="representatives" className="rounded-lg data-[state=active]:bg-gradient-to-b data-[state=active]:from-zinc-200 data-[state=active]:to-zinc-400 data-[state=active]:text-zinc-900 text-xs">
              <Users className="w-4 h-4 mr-1" />
              Representantes
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-gradient-to-b data-[state=active]:from-zinc-200 data-[state=active]:to-zinc-400 data-[state=active]:text-zinc-900 text-xs">
              ⚙️ Dados
            </TabsTrigger>
          </TabsList>

          {/* Releases Tab */}
          <TabsContent value="releases" className="mt-6">
            <AnimatePresence mode="wait">
              {labelPosts.length > 0 ? (
                <motion.div
                  key="releases"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                >
                  {labelPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="group bg-[#181818] rounded-xl overflow-hidden hover:bg-[#282828] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"
                    >
                      <div className="aspect-square relative overflow-hidden">
                        {post.cover_url ? (
                          <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                              window.location.href = `/Release?id=${post.id}`;
                            }}
                          >
                            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                          </motion.div>
                        </div>
                        <span className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-md">
                          {post.type}
                        </span>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Excluir este lançamento?')) deletePostMutation.mutate(post.id);
                            }}
                            className="p-1.5 bg-black/60 backdrop-blur-sm hover:bg-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-white text-sm truncate">{post.title}</h3>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{post.artist}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                          {post.release_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(post.release_date).getFullYear()}
                            </span>
                          )}
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes || 0}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.plays || 0}</span>
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
                  <p className="text-zinc-400">Selecione um artista e comece a publicar.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* Artists Tab */}
          <TabsContent value="artists" className="mt-6">
            <AnimatePresence mode="wait">
              {managedArtists.length > 0 ? (
                <motion.div
                  key="artists"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {managedArtists.map((artist, index) => (
                    <motion.div
                      key={artist.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="group bg-[#181818] rounded-xl overflow-hidden hover:bg-[#282828] transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      <div className="relative aspect-square overflow-hidden">
                        {artist.profile_picture ? (
                          <img src={artist.profile_picture} alt={artist.display_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8]/40 to-[#e5e5ea]/40 flex items-center justify-center">
                            <Music className="w-16 h-16 text-white/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-white truncate">{artist.display_name || artist.full_name}</h3>
                        <p className="text-xs text-zinc-400 mt-1 truncate">{artist.bio || 'Artista'}</p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedArtistId(artist.id);
                              setShowReleaseCreator(true);
                            }}
                            className="flex-1 h-8 bg-[#c0c0c8]/20 hover:bg-[#c0c0c8]/30 text-[#e5e5ea] text-xs"
                          >
                            Publicar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Desassociar este artista da gravadora? Os lançamentos não serão deletados.')) {
                                removeArtistMutation.mutate(artist.id);
                              }
                            }}
                            className="flex-1 h-8 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs"
                          >
                            Desassociar
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty-artists"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-[#181818] rounded-2xl border border-white/5"
                >
                  <div className="w-20 h-20 rounded-full bg-[#c0c0c8]/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-[#c0c0c8]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Nenhum artista gerenciado</h3>
                  <p className="text-zinc-400">Solicite a um admin para vincular artistas à sua gravadora.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* Representatives Tab */}
          <TabsContent value="representatives" className="mt-6">
            <AnimatePresence mode="wait">
              {representatives.length > 0 ? (
                <motion.div
                  key="reps"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  {representatives.map((rep, index) => (
                    <motion.div
                      key={rep.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 bg-[#181818] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c0c0c8] to-[#e5e5ea] flex items-center justify-center flex-shrink-0">
                        {rep.profile_picture ? (
                          <img src={rep.profile_picture} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <Users className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{rep.display_name || rep.full_name}</h3>
                        <p className="text-xs text-zinc-500">{rep.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Remover este representante?')) {
                            removeRepresentativeMutation.mutate(rep.id);
                          }
                        }}
                        disabled={removeRepresentativeMutation.isPending}
                        className="h-8 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </Button>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty-reps"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 bg-[#181818] rounded-2xl border border-white/5"
                >
                  <Users className="w-10 h-10 text-[#c0c0c8] mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-1">Nenhum representante</h3>
                  <p className="text-sm text-zinc-400 mb-4">Adicione um representante para ajudar a gerenciar a gravadora</p>
                </motion.div>
              )}

              {/* Add Rep Button */}
              <Dialog open={showAddRep} onOpenChange={setShowAddRep}>
                <DialogTrigger asChild>
                  <Button className="mt-4 w-full btn-metal">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Adicionar Representante
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#282828] border-[#383838]">
                  <DialogHeader>
                    <DialogTitle className="text-white">Adicionar Representante</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Input
                        placeholder="Pesquisar por nome ou email"
                        value={searchRepresentative}
                        onChange={(e) => setSearchRepresentative(e.target.value)}
                        className="bg-[#181818] border-[#383838] text-white placeholder-[#535353]"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {filteredReps.length > 0 ? (
                        filteredReps.map((u) => (
                          <motion.div
                            key={u.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-between bg-[#181818] rounded-lg p-3 border border-white/5"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-[#c0c0c8]/20 flex items-center justify-center flex-shrink-0">
                                {u.profile_picture ? (
                                  <img src={u.profile_picture} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <Users className="w-5 h-5 text-[#c0c0c8]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">{u.display_name || u.full_name}</p>
                                <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addRepresentativeMutation.mutate(u.id)}
                              disabled={addRepresentativeMutation.isPending}
                              className="h-8 btn-metal text-xs ml-2"
                            >
                              {addRepresentativeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Adicionar'}
                            </Button>
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-center text-zinc-500 text-sm py-4">Nenhum usuário disponível</p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </AnimatePresence>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 bg-[#181818] rounded-2xl p-6 border border-white/5"
            >
              <div>
                <label className="text-sm font-medium text-[#B3B3B3] mb-2 block">Nome da Gravadora</label>
                <Input
                  defaultValue={label.name || ''}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value !== label.name) {
                      updateLabelMutation.mutate({ name: e.target.value });
                    }
                  }}
                  className="bg-[#282828] border-[#383838] text-white placeholder-[#535353]"
                />
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Cropper Modal */}
      <AnimatePresence>
        {cropperImage && (
          <ImageCropper
            imageUrl={cropperImage}
            title="Recortar Logo"
            aspectRatio={1}
            onSave={async ({ imageUrl }) => {
              try {
                updateLabelMutation.mutate({ profile_picture: imageUrl });
              } catch (err) {
                toast.error('Erro ao salvar logo');
              }
              setCropperImage(null);
            }}
            onCancel={() => setCropperImage(null)}
          />
        )}
      </AnimatePresence>

      {/* Release Creator Panel */}
      <ReleaseCreatorPanel
        isOpen={showReleaseCreator}
        onClose={() => setShowReleaseCreator(false)}
        managedArtist={selectedArtistObject}
        labelContext={{
          label_id: label?.id,
          label_name: label?.name,
          label_logo: label?.profile_picture || '',
          managed_artists: label?.managed_artists || [],
        }}
        onSuccess={() => {
          setShowReleaseCreator(false);
          queryClient.invalidateQueries({ queryKey: ['labelAllPosts'] });
          queryClient.invalidateQueries({ queryKey: ['labelAllSongs'] });
          queryClient.invalidateQueries({ queryKey: ['posts'] });
          queryClient.invalidateQueries({ queryKey: ['songs'] });
        }}
      />
    </div>
  );
}
