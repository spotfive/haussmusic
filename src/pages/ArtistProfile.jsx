import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Music2, Heart, Play, Loader2, Users, UserPlus, UserCheck, Share2, Check, Instagram, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { TikTokIcon, SpotifyIcon } from '@/components/social/SocialBrandIcons';
import { hasUserType, getItemLabel } from '@/lib/utils';
import ArtistNameBanner from '@/components/home/ArtistNameBanner';

function VerifiedBadge() {
  return (
    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0" title="Artista Verificado">
      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

export default function ArtistProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const artistId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const handleShareProfile = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link do perfil copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  const { data: artist } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.find(u => u.id === artistId);
    },
    enabled: !!artistId,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['artist-posts', artistId],
    queryFn: async () => {
      const allPosts = await base44.entities.Post.list('-created_date', 100);
      return allPosts.filter(p => (p.artist_id === artistId || p.created_by === artist?.email) && p.status === 'published');
    },
    enabled: !!artist,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['artist-songs', artistId],
    queryFn: async () => {
      const allSongs = await base44.entities.Song.list('-plays', 100);
      return allSongs.filter(s => s.artist_id === artistId || s.artist === artist?.display_name || s.artist === artist?.full_name);
    },
    enabled: !!artist,
  });

  const { data: labels = [] } = useQuery({
    queryKey: ['labels'],
    queryFn: () => base44.entities.Label.list('-created_date', 100),
  });

  // Seguidores do artista em tempo real
  const { data: allFollows = [] } = useQuery({
    queryKey: ['follows', artistId],
    queryFn: () => base44.entities.Follow.list(),
    refetchInterval: 3000,
  });

  // Subscrição em tempo real
  useEffect(() => {
    const unsubscribe = base44.entities.Follow.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['follows', artistId] });
    });
    return unsubscribe;
  }, [artistId, queryClient]);

  const artistFollows = allFollows.filter(f => f.following_id === artistId);
  const isFollowing = currentUser ? allFollows.some(f => f.following_id === artistId && f.created_by === currentUser.email) : false;
  const myFollow = allFollows.find(f => f.following_id === artistId && f.created_by === currentUser?.email);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing && myFollow) {
        await base44.entities.Follow.delete(myFollow.id);
      } else {
        await base44.entities.Follow.create({
          following_id: artistId,
          following_name: artist?.display_name || artist?.full_name || ''
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows', artistId] });
    }
  });

  const totalPlays = songs.reduce((acc, s) => acc + (s.plays || 0), 0);
  const totalLikes = posts.reduce((acc, p) => acc + (p.likes || 0), 0);
  const now = new Date();
  const availablePosts = posts.filter(p => !p.premiere_datetime || new Date(p.premiere_datetime) <= now);

  const dispatchPlaySong = (song) => {
    window.dispatchEvent(new CustomEvent('playSong', { detail: song }));
  };

  if (!artist) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === artistId;

  const socialLinks = [
    { key: 'instagram', url: artist.social_links?.instagram, label: 'Instagram', Icon: Instagram },
    { key: 'tiktok', url: artist.social_links?.tiktok, label: 'TikTok', Icon: TikTokIcon },
    { key: 'youtube', url: artist.social_links?.youtube, label: 'YouTube', Icon: Youtube },
    { key: 'spotify', url: artist.social_links?.spotify, label: 'Spotify', Icon: SpotifyIcon },
  ].filter(link => !!link.url);

  return (
    <div className="min-h-screen pb-32">
      {/* Hero Header */}
      <div className="relative h-72 overflow-hidden">
        <div className="absolute inset-0">
          {artist.profile_banner ? (
            <img src={artist.profile_banner} alt="" className="w-full h-full object-cover" />
          ) : (
            <ArtistNameBanner name={artist.display_name || artist.full_name} />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        
        <div className="relative h-full flex items-end px-6 lg:px-8 pb-6">
          <div className="flex items-end gap-6 w-full">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {artist.profile_picture ? (
                <img
                  src={artist.profile_picture}
                  alt={artist.display_name || artist.full_name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white/20 shadow-2xl"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-zinc-400 to-neutral-500 flex items-center justify-center border-4 border-white/20 shadow-2xl">
                  <User className="w-16 h-16 text-white" />
                </div>
              )}
              {artist.verified && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center border-2 border-zinc-950 shadow-lg">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm text-zinc-200">
                  {hasUserType(artist, 'artista') ? '🎤 Artista' : hasUserType(artist, 'staff') ? '⭐ Staff' : '🎧 Usuário'}
                </span>
                {(() => {
                  const artistLabel = labels.find(l => l.managed_artists?.includes(artist.id));
                  return artistLabel && (
                    <span className="flex items-center gap-1.5 text-sm text-[#e5e5ea] bg-white/10 px-2.5 py-0.5 rounded-full">
                      {artistLabel.profile_picture && (
                        <img src={artistLabel.profile_picture} alt="" className="w-4 h-4 rounded-full object-cover" />
                      )}
                      {artistLabel.name}
                    </span>
                  );
                })()}
              </div>
              <h1 className="text-4xl lg:text-5xl font-black text-white mb-2">{artist.display_name || artist.full_name}</h1>
              <div className="flex items-center gap-6 text-sm text-zinc-300 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-zinc-300" />
                  <motion.span
                    key={artistFollows.length}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="font-bold text-white"
                  >
                    {artistFollows.length}
                  </motion.span>
                  <span>seguidores</span>
                </span>
                <span>{availablePosts.length} lançamentos</span>
                <span>{songs.length} músicas</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              {socialLinks.map(({ key, url, label, Icon }) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={label}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:scale-105 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShareProfile}
                className="px-4 py-3 rounded-full font-semibold text-sm flex items-center gap-2 transition-all bg-white/10 border border-white/20 text-white hover:bg-white/20"
                title="Copiar link do perfil"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              </motion.button>
              {!isOwnProfile && currentUser && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  className={`px-6 py-3 rounded-full font-semibold text-sm flex items-center gap-2 transition-all ${
                    isFollowing
                      ? 'bg-white/10 border border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400'
                      : 'bg-zinc-400 hover:bg-zinc-300 text-white shadow-lg shadow-zinc-400/30'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Seguindo
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Seguir
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 lg:px-8 py-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
            <Users className="w-7 h-7 text-zinc-300 mb-2 mx-auto" />
            <motion.div
              key={artistFollows.length}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold text-white"
            >
              {artistFollows.length}
            </motion.div>
            <div className="text-xs text-zinc-500 mt-0.5">Seguidores</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
            <Play className="w-7 h-7 text-zinc-300 mb-2 mx-auto" />
            <div className="text-2xl font-bold text-white">{totalPlays.toLocaleString()}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Plays</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
            <Heart className="w-7 h-7 text-pink-400 mb-2 mx-auto" />
            <div className="text-2xl font-bold text-white">{totalLikes}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Curtidas</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
            <Music2 className="w-7 h-7 text-cyan-400 mb-2 mx-auto" />
            <div className="text-2xl font-bold text-white">{songs.length}</div>
            <div className="text-xs text-zinc-500 mt-0.5">Músicas</div>
          </div>
        </div>

        {/* Popular Songs */}
        {songs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Músicas Populares</h2>
            <div className="space-y-2">
              {songs.slice(0, 5).map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => dispatchPlaySong(song)}
                  className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="text-zinc-500 font-bold w-6">{index + 1}</div>
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    {song.cover_url ? (
                      <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-500 to-neutral-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{song.title}</div>
                    <div className="text-sm text-zinc-500">{song.plays || 0} plays</div>
                    {(() => {
                      const label = getItemLabel(song, labels);
                      return label && (
                        <div className="flex items-center gap-1 text-xs text-[#e5e5ea] mt-0.5">
                          <Music2 className="w-3 h-3" />
                          <span>{label.name}</span>
                        </div>
                      );
                    })()}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Releases */}
        {availablePosts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Lançamentos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {availablePosts.map((post, i) => (
                <Link key={post.id} to={createPageUrl('Release') + '?id=' + post.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -5 }}
                    className="group cursor-pointer"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden mb-3 relative">
                      {post.cover_url ? (
                        <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-400 to-neutral-500" />
                      )}
                    </div>
                    <h3 className="font-bold text-white mb-1 truncate">{post.title}</h3>
                    <p className="text-sm text-zinc-500 capitalize">{post.type}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {availablePosts.length === 0 && songs.length === 0 && (
          <div className="text-center py-20">
            <Music2 className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nenhum conteúdo ainda</h3>
            <p className="text-zinc-500">Este artista ainda não publicou músicas ou lançamentos</p>
          </div>
        )}
      </div>
    </div>
  );
}