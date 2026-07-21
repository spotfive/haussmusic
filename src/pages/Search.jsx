import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search as SearchIcon, X, Music2, Disc3, User, Users, Play, Pause, Heart, Mic2, Guitar, Headphones, Radio, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const categoryCards = [
  { id: 'pop', label: 'Pop', color: 'from-zinc-300 to-zinc-500', icon: Mic2 },
  { id: 'rock', label: 'Rock', color: 'from-neutral-400 to-neutral-600', icon: Guitar },
  { id: 'hip-hop', label: 'Hip-Hop', color: 'from-zinc-200 to-zinc-400', icon: Headphones },
  { id: 'electronic', label: 'Eletrônico', color: 'from-slate-400 to-slate-600', icon: Radio },
  { id: 'jazz', label: 'Jazz', color: 'from-zinc-400 to-zinc-600', icon: Music2 },
  { id: 'classical', label: 'Clássico', color: 'from-neutral-300 to-neutral-500', icon: Disc3 },
  { id: 'r&b', label: 'R&B', color: 'from-zinc-300 to-neutral-500', icon: Mic2 },
  { id: 'latin', label: 'Latino', color: 'from-slate-300 to-slate-500', icon: Guitar },
];

function ArtistRow({ artist, currentUser, follows, onFollowToggle }) {
  const isFollowing = currentUser ? follows.some(f => f.following_id === artist.id && f.created_by === currentUser.email) : false;
  const followerCount = follows.filter(f => f.following_id === artist.id).length;
  const isOwn = currentUser?.id === artist.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-3 bg-[#181818] rounded-xl hover:bg-[#282828] transition-colors group border border-[#282828] hover:border-[#c0c0c8]/20"
    >
      <Link to={createPageUrl('ArtistProfile') + '?id=' + artist.id} className="flex items-center gap-4 flex-1 min-w-0">
        <div className="relative shrink-0">
          {artist.profile_picture ? (
            <img src={artist.profile_picture} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-[#282828] group-hover:ring-[#c0c0c8]/30 transition-all" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#282828] flex items-center justify-center ring-2 ring-[#282828] group-hover:ring-[#c0c0c8]/30 transition-all">
              <User className="w-6 h-6 text-[#B3B3B3]" />
            </div>
          )}
          {artist.verified && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center border-2 border-[#181818]">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-sm truncate group-hover:text-[#e5e5ea] transition-colors">{artist.display_name || artist.full_name}</p>
          <p className="text-xs text-[#B3B3B3] flex items-center gap-1.5">
            <Users className="w-3 h-3" />{followerCount} seguidores
          </p>
        </div>
      </Link>
      {!isOwn && currentUser && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onFollowToggle(artist)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
            isFollowing
              ? 'bg-transparent border border-[#383838] text-white hover:border-red-500/30 hover:text-red-400'
              : 'bg-white text-black hover:bg-[#e5e5e5]'
          }`}
        >
          {isFollowing ? 'Seguindo' : 'Seguir'}
        </motion.button>
      )}
    </motion.div>
  );
}

export default function Search() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.entities.Song.list('-plays'),
    refetchInterval: 3000,
  });

  const { data: releases = [] } = useQuery({
    queryKey: ['releases'],
    queryFn: async () => {
      const posts = await base44.entities.Post.list('-created_date');
      return posts.filter(p => (p.status === 'published' || !p.status) && (p.type === 'album' || p.type === 'ep'));
    },
  });

  const { data: allPosts = [] } = useQuery({
    queryKey: ['all-posts'],
    queryFn: () => base44.entities.Post.list(),
  });

  const scheduledAlbums = useMemo(() => {
    return new Set(
      allPosts
        .filter(p => p.is_scheduled && p.scheduled_datetime && new Date(p.scheduled_datetime) > new Date())
        .map(p => p.title)
    );
  }, [allPosts]);

  const isSongScheduled = (song) => song.album && scheduledAlbums.has(song.album);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: follows = [] } = useQuery({
    queryKey: ['all-follows'],
    queryFn: () => base44.entities.Follow.list(),
    refetchInterval: 3000,
  });

  useEffect(() => {
    const unsub = base44.entities.Follow.subscribe(() => queryClient.invalidateQueries({ queryKey: ['all-follows'] }));
    return unsub;
  }, [queryClient]);

  const followMutation = useMutation({
    mutationFn: async (artist) => {
      const myFollow = follows.find(f => f.following_id === artist.id && f.created_by === currentUser?.email);
      if (myFollow) {
        await base44.entities.Follow.delete(myFollow.id);
      } else {
        await base44.entities.Follow.create({ following_id: artist.id, following_name: artist.display_name || artist.full_name || '' });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-follows'] }),
  });

  const filteredArtists = useMemo(() => {
    if (!query.trim()) return [];
    const s = query.toLowerCase();
    return allUsers.filter(u => (u.display_name || u.full_name || '').toLowerCase().includes(s));
  }, [allUsers, query]);

  const filteredSongs = useMemo(() => {
    let results = songs;
    if (selectedCategory) results = results.filter(s => s.genre === selectedCategory);
    if (query.trim()) {
      const s = query.toLowerCase();
      results = results.filter(r => r.title?.toLowerCase().includes(s) || r.artist?.toLowerCase().includes(s));
    }
    return results;
  }, [songs, query, selectedCategory]);

  const filteredReleases = useMemo(() => {
    if (!query.trim() && !selectedCategory) return [];
    let results = releases;
    if (selectedCategory) results = results.filter(r => r.genre === selectedCategory);
    if (query.trim()) {
      const s = query.toLowerCase();
      results = results.filter(r => r.title?.toLowerCase().includes(s) || r.artist?.toLowerCase().includes(s));
    }
    return results;
  }, [releases, query, selectedCategory]);

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

  useEffect(() => {
    const h1 = (e) => { setCurrentSong(e.detail); setIsPlaying(true); };
    const h2 = () => setIsPlaying(p => !p);
    window.addEventListener('playSong', h1);
    window.addEventListener('togglePlayPause', h2);
    return () => { window.removeEventListener('playSong', h1); window.removeEventListener('togglePlayPause', h2); };
  }, []);

  const handleFavorite = async (song) => {
    const nf = !song.is_favorite;
    queryClient.setQueryData(['songs'], old => old?.map(s => s.id === song.id ? { ...s, is_favorite: nf } : s));
    base44.entities.Song.update(song.id, { is_favorite: nf }).catch(() => {});
  };

  const formatDuration = (s) => s ? `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}` : '--:--';
  const hasResults = filteredArtists.length > 0 || filteredReleases.length > 0 || filteredSongs.length > 0;
  const isSearching = query.trim().length > 0 || selectedCategory;
  const topPlayedSongs = songs.filter(s => (s.plays || 0) > 0).sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 8);

  return (
    <div className="min-h-screen pb-40 lg:pb-32 bg-[#121212]">
      {/* Header + Search */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#c0c0c8]/10 via-transparent to-transparent" />
        <div className="relative px-4 lg:px-6 pt-8 pb-4">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">Buscar</h1>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <motion.div
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              className="relative"
            >
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B3B3B3]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="O que você quer ouvir?"
                className="w-full pl-12 pr-12 py-3.5 text-base bg-[#282828] border border-[#383838] rounded-xl outline-none transition-all focus:bg-[#333] focus:border-[#c0c0c8]/40 text-white placeholder:text-[#696969]"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-[#383838] hover:bg-[#535353] transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
            </motion.div>

            {/* Active category chip */}
            {selectedCategory && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-[#B3B3B3]">Gênero:</span>
                <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c0c0c8]/15 text-[#e5e5ea] text-xs font-medium border border-[#c0c0c8]/20 hover:bg-[#c0c0c8]/25 transition-colors">
                  {categoryCards.find(c => c.id === selectedCategory)?.label}
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {isSearching ? (
            <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Artists */}
              {filteredArtists.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#c0c0c8]/20 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-[#e5e5ea]" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Artistas</h3>
                  </div>
                  <div className="space-y-2">
                    {filteredArtists.map(a => (
                      <ArtistRow key={a.id} artist={a} currentUser={currentUser} follows={follows} onFollowToggle={(x) => followMutation.mutate(x)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Releases */}
              {filteredReleases.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#c0c0c8]/20 flex items-center justify-center">
                      <Disc3 className="w-3.5 h-3.5 text-[#e5e5ea]" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Álbuns e EPs</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
                    {filteredReleases.map((r, i) => (
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
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Songs */}
              {filteredSongs.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#c0c0c8]/20 flex items-center justify-center">
                      <Music2 className="w-3.5 h-3.5 text-[#e5e5ea]" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Músicas</h3>
                  </div>
                  <div className="space-y-1 bg-[#181818] rounded-xl border border-[#282828] overflow-hidden">
                    {filteredSongs.map((song, i) => {
                      const scheduled = isSongScheduled(song);
                      return (
                      <motion.div
                        key={song.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => handlePlay(song)}
                        className={`group flex items-center gap-3 p-2.5 transition-colors border-b border-[#282828] last:border-b-0 ${scheduled ? 'cursor-default opacity-60' : 'cursor-pointer'} ${currentSong?.id === song.id ? 'bg-[#c0c0c8]/[0.08]' : scheduled ? '' : 'hover:bg-[#282828]'}`}
                      >
                        <span className="w-6 text-center text-xs text-[#535353] font-medium">{i + 1}</span>
                        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-[#282828] shrink-0">
                          {song.cover_url ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" /> : (
                            <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8]/30 to-zinc-800 flex items-center justify-center">
                              <Music2 className="w-4 h-4 text-[#535353]" />
                            </div>
                          )}
                          {currentSong?.id === song.id && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${currentSong?.id === song.id ? 'text-[#c0c0c8]' : 'text-white'}`}>{song.title}</p>
                            {scheduled && (
                              <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded whitespace-nowrap">Em Breve</span>
                            )}
                          </div>
                          <p className="text-xs text-[#B3B3B3] truncate">{song.artist}</p>
                        </div>
                        <span className="text-xs text-[#535353] w-10 text-right">{formatDuration(song.duration)}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleFavorite(song); }}
                          className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${song.is_favorite ? 'text-[#c0c0c8]' : 'text-[#B3B3B3] hover:text-white'}`}>
                          <Heart className={`w-4 h-4 ${song.is_favorite ? 'fill-current' : ''}`} />
                        </button>
                      </motion.div>
                    )})}
                  </div>
                </section>
              )}

              {!hasResults && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-[#181818] flex items-center justify-center mx-auto mb-5">
                    <Music2 className="w-10 h-10 text-[#282828]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Nenhum resultado</h3>
                  <p className="text-[#B3B3B3]">Tente buscar por outro termo ou gênero</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="browse" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-2">
              {/* Explore Genres */}
              <section className="mb-10">
                <h2 className="text-xl lg:text-2xl font-bold text-white mb-4">Explorar Tudo</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {categoryCards.map((cat, i) => {
                    const Icon = cat.icon;
                    return (
                      <motion.button
                        key={cat.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`relative aspect-[1.6/1] rounded-xl overflow-hidden bg-gradient-to-br ${cat.color} p-4 flex flex-col justify-between group shadow-lg`}
                      >
                        <Icon className="w-6 h-6 text-white/70 group-hover:text-white group-hover:scale-110 transition-all" />
                        <span className="text-base lg:text-lg font-bold text-white">{cat.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              {/* Top Songs */}
              {topPlayedSongs.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl lg:text-2xl font-bold text-white">Mais Tocadas</h2>
                      <p className="text-sm text-[#B3B3B3]">As músicas que o público mais ouve</p>
                    </div>
                  </div>
                  <div className="bg-[#181818] rounded-xl border border-[#282828] overflow-hidden">
                    {topPlayedSongs.map((song, i) => {
                      const scheduled = isSongScheduled(song);
                      return (
                      <motion.div
                        key={song.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => handlePlay(song)}
                        className={`group flex items-center gap-3 p-2.5 transition-colors border-b border-[#282828] last:border-b-0 ${scheduled ? 'cursor-default opacity-60' : 'cursor-pointer'} ${currentSong?.id === song.id ? 'bg-[#c0c0c8]/[0.08]' : scheduled ? '' : 'hover:bg-[#282828]'}`}
                      >
                        <span className="w-6 text-center text-xs text-[#535353] font-medium">{i + 1}</span>
                        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-[#282828] shrink-0">
                          {song.cover_url ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" /> : (
                            <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8]/30 to-zinc-800 flex items-center justify-center">
                              <Music2 className="w-4 h-4 text-[#535353]" />
                            </div>
                          )}
                          {currentSong?.id === song.id && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${currentSong?.id === song.id ? 'text-[#c0c0c8]' : 'text-white'}`}>{song.title}</p>
                            {scheduled && (
                              <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded whitespace-nowrap">Em Breve</span>
                            )}
                          </div>
                          <p className="text-xs text-[#B3B3B3] truncate">{song.artist}</p>
                        </div>
                        <span className="text-xs text-[#B3B3B3] hidden sm:block">{song.plays ? song.plays.toLocaleString() : '0'}</span>
                        <span className="text-xs text-[#535353] w-10 text-right">{formatDuration(song.duration)}</span>
                      </motion.div>
                    )})}
                  </div>
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}