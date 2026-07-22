import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Heart, ListMusic, UserCircle, Disc3, Music2, Play, Loader2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SongCard from '@/components/ui/SongCard';
import ProfileEditor from '@/components/profile/ProfileEditor';
import { useSongLikes } from '@/lib/songLikes';

function formatDuration(sec) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Library() {
  const queryClient = useQueryClient();
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [user, setUser] = useState(null);
  const [newPlaylist, setNewPlaylist] = useState({ name: '', description: '' });

  useEffect(() => {
    const h1 = (e) => { setCurrentSong(e.detail); setIsPlaying(true); };
    const h2 = () => setIsPlaying(p => !p);
    window.addEventListener('playSong', h1);
    window.addEventListener('togglePlayPause', h2);
    return () => { window.removeEventListener('playSong', h1); window.removeEventListener('togglePlayPause', h2); };
  }, []);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.entities.Song.list('-created_date'),
    refetchInterval: 3000,
  });

  const { data: playlists = [] } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const all = await base44.entities.Playlist.list('-created_date');
      return all.filter(p => p.created_by === user?.email);
    },
    enabled: !!user,
  });

  const { favorites, likedSongIds, isLiked, toggle } = useSongLikes(user?.email);

  const { data: allPosts = [] } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date'),
  });

  const scheduledAlbums = new Set(allPosts.filter(p => p.is_scheduled && p.scheduled_datetime && new Date(p.scheduled_datetime) > new Date()).map(p => p.title));
  const isSongScheduled = (song) => song.album && scheduledAlbums.has(song.album);
  const favoriteSongs = songs.filter(s => likedSongIds.has(s.id));
  const likedReleases = allPosts.filter(post => favorites.some(f => f.item_id === post.id && f.item_type === 'post'));
    const createPlaylistMutation = useMutation({
    mutationFn: (data) => base44.entities.Playlist.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setShowAddPlaylist(false);
      setNewPlaylist({ name: '', description: '' });
    },
  });

  const getScheduledInfo = (song) => {
    if (!song.album) return null;
    return allPosts.find(p => p.title === song.album && p.is_scheduled && p.scheduled_datetime);
  };

  const handlePlay = (song) => {
    if (isSongScheduled(song)) {
      const post = getScheduledInfo(song);
      if (post?.scheduled_datetime) {
        const d = new Date(post.scheduled_datetime);
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        toast(`${song.title}`, {
          description: `Estreia em ${dateStr} às ${timeStr}`,
          icon: <Timer className="w-4 h-4 text-amber-400" />,
        });
      }
      return;
    }
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
      window.dispatchEvent(new CustomEvent('togglePlayPause'));
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent('playSong', { detail: song }));
    }
  };

  const handleFavorite = (song) => toggle(song);

  const tabs = [
    { value: 'favorites', icon: Heart, label: 'Curtidas' },
    { value: 'playlists', icon: ListMusic, label: 'Playlists' },
    { value: 'profile', icon: UserCircle, label: 'Editar Perfil' },
  ];

  return (
    <div className="min-h-screen pb-40 lg:pb-32 bg-[#121212]">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#c0c0c8]/10 via-transparent to-transparent" />
        <div className="relative px-4 lg:px-6 pt-8 pb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-[#c0c0c8] to-[#e5e5ea] flex items-center justify-center shadow-lg shadow-[#c0c0c8]/20">
              <ListMusic className="w-7 lg:w-8 h-7 lg:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white">Sua Biblioteca</h1>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap gap-3 lg:gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#181818] border border-[#282828]">
              <Music2 className="w-4 h-4 text-[#c0c0c8]" />
              <span className="text-sm text-white font-medium">{favoriteSongs.length}</span>
              <span className="text-xs text-[#B3B3B3]">curtidas</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#181818] border border-[#282828]">
              <Disc3 className="w-4 h-4 text-[#e5e5ea]" />
              <span className="text-sm text-white font-medium">{likedReleases.length}</span>
              <span className="text-xs text-[#B3B3B3]">álbuns</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#181818] border border-[#282828]">
              <ListMusic className="w-4 h-4 text-[#c0c0c8]" />
              <span className="text-sm text-white font-medium">{playlists.length}</span>
              <span className="text-xs text-[#B3B3B3]">playlists</span>
            </div>

          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6 pt-4">
        <Tabs defaultValue="favorites" className="w-full">
          <TabsList className="bg-[#181818] border border-[#282828] p-1 rounded-xl mb-6 w-full grid grid-cols-3">
            {tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-[#c0c0c8]/20 data-[state=active]:text-[#e5e5ea] rounded-lg gap-2 text-xs sm:text-sm">
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-8">
            {likedReleases.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg lg:text-xl font-bold text-white">Álbuns e EPs Curtidos</h3>
                    <p className="text-xs text-[#B3B3B3]">{likedReleases.length} lançamentos</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
                  {likedReleases.map((r, i) => (
                    <Link key={r.id} to={createPageUrl('Release') + '?id=' + r.id}>
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ y: -4 }} className="group">
                        <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-[#282828] relative">
                          {r.cover_url ? (
                            <img src={r.cover_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8]/30 to-[#18181b] flex items-center justify-center">
                              <Disc3 className="w-10 h-10 text-[#535353]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="font-bold text-white text-sm truncate">{r.title}</p>
                        <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{r.artist}</p>
                        {r.is_scheduled && (
                          <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Em Breve</span>
                        )}
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {favoriteSongs.length > 0 ? (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg lg:text-xl font-bold text-white">Músicas Curtidas</h3>
                    <p className="text-xs text-[#B3B3B3]">{favoriteSongs.length} músicas</p>
                  </div>
                  <Button
                    onClick={() => { if (favoriteSongs[0]) handlePlay(favoriteSongs[0]); }}
                    className="w-10 h-10 rounded-full btn-metal p-0 shadow-lg shadow-[#c0c0c8]/30"
                  >
                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                  </Button>
                </div>
                <div className="bg-[#181818] rounded-xl overflow-hidden border border-[#282828]">
                  {favoriteSongs.map((song, i) => {
                    const sched = isSongScheduled(song);
                    const schedPost = sched ? allPosts.find(p => p.title === song.album && p.is_scheduled) : null;
                    return (
                      <SongCard key={song.id} song={song} index={i} isPlaying={isPlaying} isCurrentSong={currentSong?.id === song.id} onPlay={handlePlay} onFavorite={handleFavorite} isLiked={isLiked(song)} isScheduled={sched} scheduledDatetime={schedPost?.scheduled_datetime || null} />
                    );
                  })}
                </div>
              </section>
            ) : likedReleases.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-[#181818] flex items-center justify-center mx-auto mb-5">
                  <Heart className="w-10 h-10 text-[#282828]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Sem curtidas ainda</h3>
                <p className="text-[#B3B3B3] max-w-xs mx-auto">Curta músicas e álbuns para vê-los aqui na sua biblioteca</p>
              </div>
            ) : null}
          </TabsContent>

          {/* Playlists Tab */}
          <TabsContent value="playlists">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg lg:text-xl font-bold text-white">Suas Playlists</h3>
                <p className="text-xs text-[#B3B3B3]">{playlists.length} playlists</p>
              </div>
              <Dialog open={showAddPlaylist} onOpenChange={setShowAddPlaylist}>
                <DialogTrigger asChild>
                  <Button className="btn-metal rounded-full px-5 shadow-lg shadow-[#c0c0c8]/20">
                    <Plus className="w-4 h-4 mr-2" />Nova
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#181818] border-[#282828] text-white">
                  <DialogHeader><DialogTitle>Nova Playlist</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm text-[#B3B3B3] mb-1 block">Nome *</label>
                      <Input value={newPlaylist.name} onChange={(e) => setNewPlaylist(p => ({ ...p, name: e.target.value }))} placeholder="Nome da playlist" className="bg-[#282828] border-[#383838] text-white" />
                    </div>
                    <div>
                      <label className="text-sm text-[#B3B3B3] mb-1 block">Descrição</label>
                      <Textarea value={newPlaylist.description} onChange={(e) => setNewPlaylist(p => ({ ...p, description: e.target.value }))} placeholder="Descrição da playlist" className="bg-[#282828] border-[#383838] text-white" />
                    </div>
                    <Button onClick={() => createPlaylistMutation.mutate({ ...newPlaylist, song_ids: [], cover_url: '' })} disabled={!newPlaylist.name || createPlaylistMutation.isPending} className="w-full btn-metal">
                      {createPlaylistMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Criar Playlist
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {playlists.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                {playlists.map((pl, i) => (
                  <Link key={pl.id} to={createPageUrl('Playlist') + '?id=' + pl.id}>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -4 }} className="group cursor-pointer">
                      <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-[#282828] relative">
                        {pl.cover_url ? (
                          <img src={pl.cover_url} alt={pl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
                        ) : (() => {
                          const plSongs = (pl.song_ids || []).slice(0, 4).map(sid => songs.find(s => s.id === sid)).filter(Boolean);
                          const covers = plSongs.map(s => s.cover_url).filter(Boolean);

                          if (covers.length === 0) {
                            return (
                              <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8]/30 via-zinc-800/50 to-[#18181b] flex items-center justify-center">
                                <ListMusic className="w-12 h-12 text-[#535353] group-hover:text-[#c0c0c8]/40 transition-colors" />
                              </div>
                            );
                          } else if (covers.length === 1) {
                            return <img src={covers[0]} alt={pl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />;
                          } else if (covers.length === 2) {
                            return (
                              <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                                {covers.map((c, idx) => <img key={idx} src={c} alt="" className="w-full h-full object-cover" />)}
                              </div>
                            );
                          } else if (covers.length === 3) {
                            return (
                              <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                                <img src={covers[0]} alt="" className="col-span-2 w-full h-full object-cover" />
                                <img src={covers[1]} alt="" className="w-full h-full object-cover" />
                                <img src={covers[2]} alt="" className="w-full h-full object-cover" />
                              </div>
                            );
                          } else {
                            return (
                              <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                                {covers.slice(0, 4).map((c, idx) => <img key={idx} src={c} alt="" className="w-full h-full object-cover" />)}
                              </div>
                            );
                          }
                        })()}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                        <motion.div
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.9 }}
                          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[#c0c0c8] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl translate-y-2 group-hover:translate-y-0"
                        >
                          <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                        </motion.div>
                      </div>
                      <p className="font-bold text-white text-sm truncate">{pl.name}</p>
                      <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{(pl.song_ids || []).length} músicas · {(() => { const dur = (pl.song_ids || []).reduce((acc, sid) => acc + (songs.find(s => s.id === sid)?.duration || 0), 0); return Math.floor(dur / 60) + ' min'; })()}</p>
                    </motion.div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-[#181818] flex items-center justify-center mx-auto mb-5">
                  <ListMusic className="w-10 h-10 text-[#282828]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Nenhuma playlist</h3>
                <p className="text-[#B3B3B3] max-w-xs mx-auto mb-6">Crie sua primeira playlist e organize suas músicas favoritas</p>
                <Button onClick={() => setShowAddPlaylist(true)} className="btn-metal rounded-full px-6">
                  <Plus className="w-4 h-4 mr-2" />Criar Playlist
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="max-w-2xl mx-auto">
              <div className="bg-[#181818] rounded-2xl p-6 lg:p-8 border border-[#282828]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#c0c0c8]/20 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-[#e5e5ea]" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Editar Perfil</h2>
                </div>
                <ProfileEditor user={user} onUpdate={async () => { const u = await base44.auth.me(); setUser(u); }} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}