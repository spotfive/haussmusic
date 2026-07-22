import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Heart, Music2, TrendingUp, Star, Calendar, User, Timer, Newspaper } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ArtistNameBanner from '@/components/home/ArtistNameBanner';
import HomeHeroCarousel from '@/components/home/HomeHeroCarousel';
import BackgroundMedia from '@/components/media/BackgroundMedia';
import { DiscordIcon } from '@/components/social/SocialBrandIcons';
import { hasUserType } from '@/lib/utils';
import { toggleSongLike } from '@/lib/songLikes';

const pills = [
  { label: 'Tudo', key: 'all' },
  { label: 'Músicas', key: 'songs' },
  { label: 'Álbuns', key: 'albums' },
  { label: 'Artistas', key: 'artists' },
];

function formatDuration(sec) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatPlays(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default function Home() {
  const [activePill, setActivePill] = useState('all');
  const [currentPlayingSong, setCurrentPlayingSong] = useState(null);
  const [activeSongId, setActiveSongId] = useState(null);
  const [user, setUser] = useState(null);
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem('hasSeenIntro'));
  const queryClient = useQueryClient();

  // Handle shared song from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const songId = params.get('song');
    if (songId) {
      const timer = setTimeout(() => {
        const song = queryClient.getQueryData(['songs'])?.find(s => s.id === songId);
        if (song) {
          window.dispatchEvent(new CustomEvent('playSong', { detail: song }));
          setCurrentPlayingSong(song);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [queryClient]);

  useEffect(() => {
    const handlePlaySong = (e) => setCurrentPlayingSong(e.detail);
    window.addEventListener('playSong', handlePlaySong);
    return () => window.removeEventListener('playSong', handlePlaySong);
  }, []);

  useEffect(() => {
    const handleActiveSongChanged = (event) => {
      setActiveSongId(event.detail?.id || null);
    };
    window.addEventListener('activeSongChanged', handleActiveSongChanged);
    return () => window.removeEventListener('activeSongChanged', handleActiveSongChanged);
  }, []);

  useEffect(() => {
    if (showIntro) {
      const t = setTimeout(() => {
        setShowIntro(false);
        sessionStorage.setItem('hasSeenIntro', 'true');
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [showIntro]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: allSongs = [], isLoading: songsLoading } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.entities.Song.list('-plays', 50),
    refetchInterval: 3000,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const all = await base44.entities.Post.list('-created_date', 20);
      return all;
    },
    refetchInterval: 3000,
  });

  const { data: artists = [] } = useQuery({
    queryKey: ['artists'],
    queryFn: () => base44.entities.User.list('-created_date', 12),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
    staleTime: 60000,
  });

  const logoUrl = appSettings.find(s => s.key === 'logo_url')?.value || '/logo.png';
  const discordUrl = appSettings.find(s => s.key === 'discord_url')?.value;
  const revistaUrl = appSettings.find(s => s.key === 'revista_url')?.value;

  const { data: banners = [] } = useQuery({
    queryKey: ['banners'],
    queryFn: () => base44.entities.Banner.list('-created_date', 10),
  });
  const activeBanners = banners.filter(b => b.is_active !== false);

  const scheduledAlbums = new Set(posts.filter(p => p.is_scheduled && p.scheduled_datetime && new Date(p.scheduled_datetime) > new Date()).map(p => p.title));
  const isSongScheduled = (song) => song.album && scheduledAlbums.has(song.album);
  const topPlayed = [...allSongs].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 8);
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentSongs = [...allSongs]
    .filter(s => new Date(s.created_date) >= oneMonthAgo)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 8);
  const topRated = [...allSongs].filter(s => s.rating > 0).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);
  const trending = [...allSongs].filter(s => {
    const days = (Date.now() - new Date(s.created_date)) / 86400000;
    return days <= 14 && (s.plays || 0) > 5;
  }).sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 6);

  const featuredSong = topPlayed[0];
  const featuredSongScheduled = featuredSong ? isSongScheduled(featuredSong) : false;
  const recentAlbums = posts.filter(p => p.type === 'album' || p.type === 'ep').slice(0, 8);
  const songArtists = artists.filter(a => hasUserType(a, 'artista')).slice(0, 5);

  const { data: featuredArtist } = useQuery({
    queryKey: ['featured-artist', featuredSong?.artist],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.find(u => u.display_name === featuredSong.artist || u.full_name === featuredSong.artist) || null;
    },
    enabled: !!featuredSong?.artist,
  });

  const featuredBackdrop = featuredArtist?.profile_banner;

  const playMutation = useMutation({
    mutationFn: (songId) => {
      const song = allSongs.find(s => s.id === songId);
      return base44.entities.Song.update(songId, { plays: (song?.plays || 0) + 1 }).catch(() => {});
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['songs'] }),
  });

  const getScheduledInfo = (song) => {
    if (!song.album) return null;
    return posts.find(p => p.title === song.album && p.is_scheduled && p.scheduled_datetime);
  };

  const dispatchPlaySong = (song) => {
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
    if (currentPlayingSong?.id === song.id) {
      window.dispatchEvent(new CustomEvent('togglePlayPause'));
    } else {
      setCurrentPlayingSong(song);
      window.dispatchEvent(new CustomEvent('playSong', { detail: song }));
      playMutation.mutate(song.id);
    }
  };

  const toggleFavorite = async (song, e) => {
    e.stopPropagation();
    const newFav = !song.is_favorite;
    queryClient.setQueryData(['songs'], old =>
      old?.map(s => s.id === song.id ? { ...s, is_favorite: newFav } : s)
    );
    toggleSongLike(song, user?.email).catch(() => {});
  };

  const filteredSongs = activePill === 'songs' ? allSongs :
    activePill === 'albums' ? recentAlbums :
    activePill === 'artists' ? songArtists : allSongs;

  // Hero rotates between the "Mais Ouvidas" song card and every active
  // admin banner, one slide at a time — same spot, same size, so an admin
  // adding a banner just means the rotation gets one slide longer.
  const heroSlides = [
    ...(featuredSong ? [{
      key: `song-${featuredSong.id}`,
      render: () => (
        <div
          className={`relative w-full h-full ${featuredSongScheduled ? 'cursor-default' : 'cursor-pointer'}`}
          onClick={() => dispatchPlaySong(featuredSong)}
        >
          <div className="absolute inset-0">
            {featuredBackdrop ? (
              <>
                <img
                  src={featuredBackdrop}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: 'saturate(1.3) brightness(0.55)' }}
                />
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(200,200,210,0.18) 0%, transparent 70%)' }} />
              </>
            ) : (
              <ArtistNameBanner name={featuredSong.artist} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
          </div>

          <div className="relative h-full flex items-end p-5 lg:p-8">
            <div className="flex items-end gap-5 w-full">
              {featuredSong.cover_url && (
                <div className="hidden sm:block w-24 h-24 lg:w-32 lg:h-32 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 ring-2 ring-white/10">
                  <img src={featuredSong.cover_url} alt={featuredSong.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[#e5e5ea] text-xs font-bold uppercase tracking-widest mb-1.5">Mais Ouvidas</p>
                <h1 className="text-2xl lg:text-4xl font-black text-white mb-0.5 truncate">{featuredSong.title}</h1>
                <p className="text-white/70 text-sm lg:text-base mb-4 truncate">{featuredSong.artist}{featuredSong.featuring ? ` feat. ${featuredSong.featuring}` : ''}</p>

                <div className="flex items-center gap-3">
                  {featuredSongScheduled ? (
                    <span className="px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase">Em Breve</span>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); dispatchPlaySong(featuredSong); }}
                      className="w-12 h-12 rounded-full bg-[#c0c0c8] flex items-center justify-center shadow-lg shadow-[#c0c0c8]/40"
                    >
                      {currentPlayingSong?.id === featuredSong.id ? (
                        <Pause className="w-6 h-6 text-black fill-black" />
                      ) : (
                        <Play className="w-6 h-6 text-black fill-black ml-0.5" />
                      )}
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => toggleFavorite(featuredSong, e)}
                    className={`p-2 rounded-full ${featuredSong.is_favorite ? 'text-[#c0c0c8]' : 'text-white/60 hover:text-white'}`}
                  >
                    <Heart className={`w-5 h-5 ${featuredSong.is_favorite ? 'fill-current' : ''}`} />
                  </motion.button>
                  <span className="text-white/50 text-sm">{formatPlays(featuredSong.plays)} plays</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    }] : []),
    ...activeBanners.map((banner) => ({
      key: `banner-${banner.id}`,
      durationSeconds: banner.duration_seconds || 7,
      render: () => (
        <div className="relative w-full h-full bg-black">
          <div className="absolute inset-0 bg-black overflow-hidden">
            {banner.image_url ? (
              <BackgroundMedia
                src={banner.image_url}
                alt={banner.title}
                className="w-full h-full object-contain"
                style={{ filter: 'saturate(1.15) brightness(0.85)' }}
              />
            ) : (
              <ArtistNameBanner name={banner.title} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />
          </div>

          <div className="relative h-full flex items-end p-5 lg:p-8">
            <div className="flex-1 min-w-0">
              <p className="text-[#e5e5ea] text-xs font-bold uppercase tracking-widest mb-1.5">{banner.category || 'Destaque'}</p>
              <h1 className="text-2xl lg:text-4xl font-black text-white mb-0.5">{banner.title}</h1>
              {banner.artist_name && (
                <p className="text-white/70 text-sm lg:text-base mb-1">{banner.artist_name}</p>
              )}
              {banner.description && (
                <p className="text-white/60 text-sm max-w-xl mt-2">{banner.description}</p>
              )}
              {banner.link_url && (
                <a
                  href={banner.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-block mt-4 px-5 py-2.5 rounded-full bg-[#c0c0c8] text-black text-sm font-bold hover:bg-white transition-colors"
                >
                  {banner.button_text || 'Saiba Mais'}
                </a>
              )}
            </div>
          </div>
        </div>
      ),
    })),
  ];

  return (
    <>
      {/* Intro Splash */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[100] bg-[#121212] flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: 1 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#c0c0c8] flex items-center justify-center overflow-hidden"
                style={{ boxShadow: '0 0 60px rgba(200,200,210,0.4)' }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="HAUSS MUSIC" className="w-full h-full object-contain p-2" />
                ) : (
                  <Music2 className="w-12 h-12 text-black" />
                )}
              </motion.div>
              <h1 className="text-5xl font-bold text-white mb-2">HAUSS MUSIC</h1>
              <p className="text-[#B3B3B3]">Bem-vindo à sua música</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: showIntro ? 2 : 0, duration: 0.4 }}
        className="flex-1 overflow-y-auto"
      >
        <div className="px-4 lg:px-6 py-4 lg:py-6 max-w-[1600px] mx-auto">

          {/* Top Filter Pills */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {pills.map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setActivePill(pill.key)}
                  className={activePill === pill.key ? 'btn-pill-active' : 'btn-pill-inactive'}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => discordUrl ? window.open(discordUrl, '_blank', 'noopener') : toast('Em Breve!')}
                title="Discord"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#5865F2]/20 border border-white/10 hover:border-[#5865F2]/40 flex items-center justify-center text-[#B3B3B3] hover:text-[#5865F2] transition-colors"
              >
                <DiscordIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => revistaUrl ? window.open(revistaUrl, '_blank', 'noopener') : toast('Em Breve!')}
                title="Revista"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#c0c0c8]/20 border border-white/10 hover:border-[#c0c0c8]/40 flex items-center justify-center text-[#B3B3B3] hover:text-[#c0c0c8] transition-colors"
              >
                <Newspaper className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero Carousel — "Mais Ouvidas" + active admin banners, rotating */}
          <HomeHeroCarousel slides={heroSlides} />

          {/* Two Column Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Main Content */}
            <div className="flex-1 min-w-0">

              {/* ALL view: show song sections */}
              {activePill === 'all' && (
                <>
                  {/* Trending Now */}
                  {trending.length > 0 && (
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl lg:text-2xl font-bold text-white">Em Alta</h2>
                          <p className="text-sm text-[#B3B3B3]">O que está bombando agora</p>
                        </div>
                        <TrendingUp className="w-5 h-5 text-[#c0c0c8]" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                        {trending.map((song, i) => {
                          const scheduled = isSongScheduled(song);
                          return (
                          <motion.div
                            key={song.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => dispatchPlaySong(song)}
                            className={`card-spotify group ${scheduled ? 'opacity-60 cursor-default' : ''}`}
                          >
                            <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-[#282828]">
                              {song.cover_url ? (
                                <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8]/20 to-[#18181b] flex items-center justify-center">
                                  <Music2 className="w-8 h-8 text-[#535353]" />
                                </div>
                              )}
                              {scheduled ? (
                                <div className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Em Breve</div>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => { e.stopPropagation(); dispatchPlaySong(song); }}
                                  className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#c0c0c8] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl translate-y-2 group-hover:translate-y-0"
                                >
                                  {currentPlayingSong?.id === song.id ? (
                                    <Pause className="w-5 h-5 text-black fill-black" />
                                  ) : (
                                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                  )}
                                </motion.button>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-sm truncate">{song.title}</h3>
                            <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{song.artist}</p>
                            {song.plays > 0 && (
                              <p className="text-[11px] text-[#696969] mt-1">{formatPlays(song.plays)} plays</p>
                            )}
                          </motion.div>
                        )})}
                      </div>
                    </section>
                  )}

                  {/* Top Played - List format */}
                  {topPlayed.length > 0 && (
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl lg:text-2xl font-bold text-white">Mais Tocadas</h2>
                      </div>
                      <div className="space-y-1">
                        {topPlayed.slice(0, 6).map((song, index) => {
                          const scheduled = isSongScheduled(song);
                          return (
                          <motion.div
                            key={song.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => dispatchPlaySong(song)}
                            className={`group flex items-center gap-3 p-2.5 rounded-lg transition-all ${scheduled ? 'opacity-60 cursor-default' : 'hover:bg-[#282828] cursor-pointer'} ${activeSongId === song.id ? 'bg-zinc-400/10' : ''}`}
                          >
                            <span className="w-6 text-center text-sm text-[#B3B3B3] font-medium">{index + 1}</span>

                            <div className="w-10 h-10 rounded-md overflow-hidden bg-[#282828] shrink-0">
                              {song.cover_url ? (
                                <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8]/30 to-[#18181b]" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={`text-sm font-medium truncate ${activeSongId === song.id ? 'text-zinc-400' : 'text-white'}`}>
                                  {song.title}
                                </div>
                                {scheduled && (
                                  <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded whitespace-nowrap">Em Breve</span>
                                )}
                              </div>
                              <div className="text-xs text-[#B3B3B3] truncate">{song.artist}</div>
                            </div>

                            <span className="text-xs text-[#B3B3B3] hidden sm:block">{formatPlays(song.plays)}</span>
                            <span className="text-xs text-[#535353] w-10 text-right">{formatDuration(song.duration)}</span>

                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => toggleFavorite(song, e)}
                              className={`p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${song.is_favorite ? 'text-[#c0c0c8]' : 'text-[#B3B3B3] hover:text-white'}`}
                            >
                              <Heart className={`w-4 h-4 ${song.is_favorite ? 'fill-current' : ''}`} />
                            </motion.button>
                          </motion.div>
                        )})}
                      </div>
                    </section>
                  )}

                  {/* Recent Releases */}
                  {recentSongs.length > 0 && (
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl lg:text-2xl font-bold text-white">Lançamentos Recentes</h2>
                          <p className="text-sm text-[#B3B3B3]">As músicas mais recentes</p>
                        </div>
                        <Calendar className="w-5 h-5 text-[#B3B3B3]" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {recentSongs.map((song, i) => {
                          const scheduled = isSongScheduled(song);
                          return (
                          <motion.div
                            key={song.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => dispatchPlaySong(song)}
                            className={`card-spotify group ${scheduled ? 'opacity-60 cursor-default' : ''}`}
                          >
                            <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-[#282828]">
                              {song.cover_url ? (
                                <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-zinc-800/60 to-zinc-900 flex items-center justify-center">
                                  <Music2 className="w-8 h-8 text-[#535353]" />
                                </div>
                              )}
                              {scheduled ? (
                                <div className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Em Breve</div>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => { e.stopPropagation(); dispatchPlaySong(song); }}
                                  className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#c0c0c8] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl translate-y-2 group-hover:translate-y-0"
                                >
                                  {currentPlayingSong?.id === song.id ? (
                                    <Pause className="w-5 h-5 text-black fill-black" />
                                  ) : (
                                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                  )}
                                </motion.button>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-sm truncate">{song.title}</h3>
                            <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{song.artist}</p>
                          </motion.div>
                        )})}
                      </div>
                    </section>
                  )}

                  {/* Top Rated */}
                  {topRated.length > 0 && (
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl lg:text-2xl font-bold text-white">Melhor Avaliadas</h2>
                          <p className="text-sm text-[#B3B3B3]">As favoritas da comunidade</p>
                        </div>
                        <Star className="w-5 h-5 text-[#c0c0c8]" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                        {topRated.map((song, i) => {
                          const scheduled = isSongScheduled(song);
                          return (
                          <motion.div
                            key={song.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => dispatchPlaySong(song)}
                            className={`card-spotify group ${scheduled ? 'opacity-60 cursor-default' : ''}`}
                          >
                            <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-[#282828]">
                              {song.cover_url ? (
                                <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-yellow-900/60 to-amber-950 flex items-center justify-center">
                                  <Star className="w-8 h-8 text-[#535353]" />
                                </div>
                              )}
                              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
                                <Star className="w-3 h-3 text-[#c0c0c8] fill-current" />
                                <span className="text-[11px] font-bold text-white">{song.rating.toFixed(1)}</span>
                              </div>
                              {!scheduled && (
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => { e.stopPropagation(); dispatchPlaySong(song); }}
                                  className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#c0c0c8] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl translate-y-2 group-hover:translate-y-0"
                                >
                                  {currentPlayingSong?.id === song.id ? (
                                    <Pause className="w-5 h-5 text-black fill-black" />
                                  ) : (
                                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                  )}
                                </motion.button>
                              )}
                              {scheduled && (
                                <div className="absolute top-2 right-2 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Em Breve</div>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-sm truncate">{song.title}</h3>
                            <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{song.artist}</p>
                          </motion.div>
                        )})}
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* SONGS view: full song grid */}
              {activePill === 'songs' && (
                <section className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl lg:text-2xl font-bold text-white">Todas as Músicas</h2>
                      <p className="text-sm text-[#B3B3B3]">{allSongs.length} músicas</p>
                    </div>
                  </div>
                  {allSongs.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {allSongs.map((song, i) => {
                        const scheduled = isSongScheduled(song);
                        return (
                        <motion.div
                          key={song.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          onClick={() => dispatchPlaySong(song)}
                          className={`card-spotify group ${scheduled ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                        >
                          <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-[#282828]">
                            {song.cover_url ? (
                              <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8]/20 to-[#18181b] flex items-center justify-center">
                                <Music2 className="w-8 h-8 text-[#535353]" />
                              </div>
                            )}
                            {scheduled ? (
                              <div className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Em Breve</div>
                            ) : (
                              <>
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => { e.stopPropagation(); dispatchPlaySong(song); }}
                                  className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#c0c0c8] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl translate-y-2 group-hover:translate-y-0"
                                >
                                  {currentPlayingSong?.id === song.id ? (
                                    <Pause className="w-5 h-5 text-black fill-black" />
                                  ) : (
                                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                  )}
                                </motion.button>
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => toggleFavorite(song, e)}
                                  className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity ${song.is_favorite ? 'text-[#c0c0c8]' : 'text-white hover:text-[#c0c0c8]'}`}
                                >
                                  <Heart className={`w-4 h-4 ${song.is_favorite ? 'fill-current' : ''}`} />
                                </motion.button>
                              </>
                            )}
                          </div>
                          <h3 className="font-bold text-white text-sm truncate">{song.title}</h3>
                          <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{song.artist}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-[#535353]">{formatDuration(song.duration)}</span>
                            {song.plays > 0 && (
                              <span className="text-[11px] text-[#535353]">{formatPlays(song.plays)} plays</span>
                            )}
                          </div>
                        </motion.div>
                      )})}
                    </div>
                  ) : (
                    <p className="text-[#B3B3B3] text-center py-10">Nenhuma música encontrada</p>
                  )}
                </section>
              )}

              {/* ALBUMS view: show album/EP releases */}
              {activePill === 'albums' && (
                <section className="mb-8">
                  <h2 className="text-xl lg:text-2xl font-bold text-white mb-4">Álbuns e EPs</h2>
                  {recentAlbums.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {recentAlbums.map((album, i) => (
                        <Link key={album.id} to={createPageUrl('Release') + '?id=' + album.id}>
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="card-spotify group"
                          >
                            <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-[#282828]">
                              {album.cover_url ? (
                                <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-zinc-800/60 to-zinc-900 flex items-center justify-center">
                                  <Music2 className="w-8 h-8 text-[#535353]" />
                                </div>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-sm truncate">{album.title}</h3>
                            <p className="text-xs text-[#B3B3B3] truncate mt-0.5">{album.artist}</p>
                            <span className="text-[10px] text-[#696969] uppercase">{album.type}</span>
                            {album.is_scheduled && (
                              <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Em Breve</span>
                            )}
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#B3B3B3] text-center py-10">Nenhum álbum encontrado</p>
                  )}
                </section>
              )}

              {/* ARTISTS view: show artist list */}
              {activePill === 'artists' && (
                <section className="mb-8">
                  <h2 className="text-xl lg:text-2xl font-bold text-white mb-4">Artistas</h2>
                  {songArtists.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {songArtists.map((artist, i) => (
                        <Link key={artist.id} to={createPageUrl('ArtistProfile') + '?id=' + artist.id}>
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="card-spotify group text-center"
                          >
                            <div className="relative w-24 h-24 mx-auto mb-3">
                              <div className="w-full h-full rounded-full overflow-hidden bg-[#282828]">
                                {artist.profile_picture ? (
                                  <img src={artist.profile_picture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8]/30 to-zinc-800 flex items-center justify-center">
                                    <User className="w-10 h-10 text-[#535353]" />
                                  </div>
                                )}
                              </div>
                              {artist.verified && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-[#121212]">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-sm truncate">{artist.display_name || artist.full_name || 'Artista'}</h3>
                            <p className="text-xs text-[#B3B3B3]">Artista</p>
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#B3B3B3] text-center py-10">Nenhum artista encontrado</p>
                  )}
                </section>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="w-full lg:w-80 shrink-0 space-y-4">
              {/* Now Playing Widget */}
              {currentPlayingSong && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-spotify-elevated"
                >
                  <h3 className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider mb-3">Tocando Agora</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#181818] shrink-0">
                      {currentPlayingSong.cover_url ? (
                        <img src={currentPlayingSong.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8]/20 to-zinc-900 flex items-center justify-center">
                          <Music2 className="w-6 h-6 text-[#535353]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{currentPlayingSong.title}</p>
                      <p className="text-xs text-[#B3B3B3] truncate">{currentPlayingSong.artist}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Top Artists Widget */}
              {songArtists.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="card-spotify-elevated"
                >
                  <h3 className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider mb-3">Artistas</h3>
                  <div className="space-y-2">
                    {songArtists.slice(0, 4).map((artist) => (
                      <Link key={artist.id} to={createPageUrl('ArtistProfile') + '?id=' + artist.id}>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#383838] transition-colors cursor-pointer">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#282828]">
                              {artist.profile_picture ? (
                                <img src={artist.profile_picture} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#c0c0c8]/30 to-zinc-800 flex items-center justify-center">
                                  <User className="w-5 h-5 text-[#535353]" />
                                </div>
                              )}
                            </div>
                            {artist.verified && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border-2 border-[#181818]">
                                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{artist.display_name || artist.full_name || 'Artista'}</p>
                            <p className="text-[11px] text-[#B3B3B3]">Artista</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Recent Albums Widget */}
              {recentAlbums.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="card-spotify-elevated"
                >
                  <h3 className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider mb-3">Álbuns Recentes</h3>
                  <div className="space-y-2">
                    {recentAlbums.slice(0, 4).map((album) => (
                      <Link key={album.id} to={createPageUrl('Release') + '?id=' + album.id}>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#383838] transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-[#282828] shrink-0">
                            {album.cover_url ? (
                              <img src={album.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-zinc-800/60 to-zinc-900 flex items-center justify-center">
                                <Music2 className="w-5 h-5 text-[#535353]" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{album.title}</p>
                            <p className="text-[11px] text-[#B3B3B3] truncate">{album.artist}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Empty state */}
          {!songsLoading && allSongs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-[#282828] flex items-center justify-center mb-4">
                <Music2 className="w-10 h-10 text-[#535353]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo ao HAUSS MUSIC</h2>
              <p className="text-[#B3B3B3] max-w-md">Sua plataforma de streaming musical. Explore músicas, crie playlists e descubra novos artistas.</p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}