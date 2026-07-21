import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Star, Heart, Play, Music, Disc3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RankingCard from '@/components/rankings/RankingCard';

function PodiumPlatform({ rank, item, type, label, delay, isFirst }) {
  const heights = { 1: 'h-24 lg:h-36', 2: 'h-16 lg:h-24', 3: 'h-12 lg:h-16' };
  const colors = {
    1: 'bg-gradient-to-t from-amber-500 to-amber-400 shadow-lg shadow-amber-500/30',
    2: 'bg-gradient-to-t from-zinc-400 to-zinc-300 shadow-lg shadow-zinc-400/20',
    3: 'bg-gradient-to-t from-amber-700 to-amber-600 shadow-lg shadow-amber-700/20',
  };
  const widths = { 1: 'w-24 lg:w-40', 2: 'w-20 lg:w-32', 3: 'w-16 lg:w-28' };
  const imgSizes = { 1: 'w-14 h-14 lg:w-20 lg:h-20', 2: 'w-12 h-12 lg:w-16 lg:h-16', 3: 'w-10 h-10 lg:w-14 lg:h-14' };
  const ringColors = {
    1: 'ring-amber-400',
    2: 'ring-zinc-300',
    3: 'ring-amber-600',
  };

  const statValue = type === 'rating' ? item.rating?.toFixed(1) : type === 'likes' ? (item.likes || 0).toLocaleString() : (item.plays || 0).toLocaleString();
  const statSuffix = type === 'rating' ? ' ★' : type === 'likes' ? ' ❤️' : ' plays';

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 120 }}
      className="flex flex-col items-center justify-end"
    >
      {/* Cover + Info above the platform */}
      <div className="flex flex-col items-center mb-1 z-10">
        <div className={`${imgSizes[rank]} rounded-full ${ringColors[rank]} ring-3 lg:ring-4 overflow-hidden mb-2 shadow-xl`}>
          {item.cover_url ? (
            <img src={item.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#282828] flex items-center justify-center">
              <Disc3 className="w-5 lg:w-7 h-5 lg:h-7 text-[#535353]" />
            </div>
          )}
        </div>
        <p className={`text-xs lg:text-sm font-bold text-white truncate max-w-[100px] lg:max-w-[140px] text-center ${isFirst ? 'text-base lg:text-lg' : ''}`}>{item.title}</p>
        <p className="text-[10px] lg:text-xs text-[#B3B3B3] truncate max-w-[100px] lg:max-w-[140px] text-center">{item.artist}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Star className="w-3 h-3 text-[#8B5CF6] fill-current" />
          <span className="text-[10px] lg:text-xs text-[#B3B3B3] font-medium">{statValue}{statSuffix}</span>
        </div>
      </div>

      {/* Platform block */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: delay + 0.2, duration: 0.4 }}
        style={{ transformOrigin: 'bottom' }}
        className={`${widths[rank]} ${heights[rank]} ${colors[rank]} rounded-t-xl flex items-start justify-center pt-1.5`}
      >
        <span className="text-xl lg:text-3xl font-black text-white/30">{rank}</span>
      </motion.div>
    </motion.div>
  );
}

export default function Rankings() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('albums');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: posts = [] } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date', 100),
    refetchInterval: 3000,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.entities.Song.list('-created_date', 100),
    refetchInterval: 3000,
  });

  const { data: userRatings = [] } = useQuery({
    queryKey: ['userRatings', user?.id],
    queryFn: () => base44.entities.Rating.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const rateMutation = useMutation({
    mutationFn: async ({ itemId, itemType, rating }) => {
      const existing = userRatings.find(r => r.item_id === itemId && r.item_type === itemType);
      if (existing) {
        await base44.entities.Rating.update(existing.id, { rating });
      } else {
        await base44.entities.Rating.create({ item_id: itemId, item_type: itemType, rating });
      }
    },
    onSuccess: async (_, variables) => {
      const { itemId, itemType } = variables;
      const allRatings = await base44.entities.Rating.list();
      const itemRatings = allRatings.filter(r => r.item_id === itemId && r.item_type === itemType);
      if (itemRatings.length > 0) {
        const avgRating = itemRatings.reduce((acc, r) => acc + r.rating, 0) / itemRatings.length;
        if (itemType === 'post') {
          await base44.entities.Post.update(itemId, { rating: avgRating, rating_count: itemRatings.length });
        } else {
          await base44.entities.Song.update(itemId, { rating: avgRating, rating_count: itemRatings.length });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.invalidateQueries({ queryKey: ['userRatings'] });
    },
  });

  const handleRate = (itemId, itemType) => (rating) => {
    if (!user) return;
    rateMutation.mutate({ itemId, itemType, rating });
  };

  const getUserRating = (itemId, itemType) => {
    return userRatings.find(r => r.item_id === itemId && r.item_type === itemType)?.rating || 0;
  };

  const topRatedAlbums = posts
    .filter(p => (p.rating || 0) > 0 && (p.rating_count || 0) > 0)
    .sort((a, b) => {
      const diff = (b.rating || 0) - (a.rating || 0);
      if (Math.abs(diff) < 0.01) return (b.rating_count || 0) - (a.rating_count || 0);
      return diff;
    });

  const topRatedSongs = songs
    .filter(s => (s.rating || 0) > 0 && (s.rating_count || 0) > 0)
    .sort((a, b) => {
      const diff = (b.rating || 0) - (a.rating || 0);
      if (Math.abs(diff) < 0.01) return (b.rating_count || 0) - (a.rating_count || 0);
      return diff;
    });

  const mostLikedPosts = posts
    .filter(p => (p.likes || 0) > 0)
    .sort((a, b) => (b.likes || 0) - (a.likes || 0));

  const mostPlayedSongs = songs
    .filter(s => (s.plays || 0) > 0)
    .sort((a, b) => (b.plays || 0) - (a.plays || 0));

  const getActiveTopList = () => {
    switch (activeTab) {
      case 'albums': return topRatedAlbums;
      case 'songs': return topRatedSongs;
      case 'likes': return mostLikedPosts;
      case 'plays': return mostPlayedSongs;
      default: return [];
    }
  };

  const getActiveType = () => {
    switch (activeTab) {
      case 'albums':
      case 'songs': return 'rating';
      case 'likes': return 'likes';
      case 'plays': return 'plays';
      default: return 'rating';
    }
  };

  const getActiveItemType = () => {
    switch (activeTab) {
      case 'albums':
      case 'likes': return 'post';
      case 'songs':
      case 'plays': return 'song';
      default: return 'post';
    }
  };

  const activeTopList = getActiveTopList();
  const podiumItems = activeTopList.slice(0, Math.min(3, activeTopList.length));
  const belowPodium = activeTopList.slice(podiumItems.length);
  const activeType = getActiveType();
  const activeItemType = getActiveItemType();

  const tabConfigs = [
    { value: 'albums', icon: Disc3, label: 'Álbuns', activeLabel: 'Melhores Álbuns' },
    { value: 'songs', icon: Music, label: 'Músicas', activeLabel: 'Melhores Músicas' },
    { value: 'likes', icon: Heart, label: 'Curtidas', activeLabel: 'Mais Curtidos' },
    { value: 'plays', icon: Play, label: 'Plays', activeLabel: 'Mais Tocadas' },
  ];

  return (
    <div className="min-h-screen pb-40 lg:pb-32">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute -top-20 -right-20 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }}
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute bottom-10 left-10 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)', filter: 'blur(80px)' }}
          />
        </div>

        <div className="relative px-4 lg:px-6 xl:px-8 pt-6 lg:pt-8 pb-4 lg:pb-6">
          <div className="flex items-center gap-3 lg:gap-4">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-12 lg:w-16 h-12 lg:h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#A78BFA] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30"
            >
              <Trophy className="w-6 lg:w-8 h-6 lg:h-8 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl lg:text-4xl font-bold text-white">Rankings</h1>
              <p className="text-sm lg:text-base text-[#B3B3B3]">Os melhores e mais ouvidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs at top, then podium + list below */}
      <div className="px-4 lg:px-6 xl:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#181818] border border-[#282828] mb-4 w-full grid grid-cols-4 p-1 rounded-xl">
            {tabConfigs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-[#A78BFA] text-[11px] sm:text-sm lg:text-base flex items-center gap-1.5 lg:gap-2 rounded-lg">
                <tab.icon className="w-3.5 lg:w-4 h-3.5 lg:h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabConfigs.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="overflow-visible">
              {/* Podium */}
              <div className="pt-4 lg:pt-6 pb-6 lg:pb-8 overflow-visible">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center mb-3 lg:mb-5"
                >
                  <h2 className="text-lg lg:text-xl font-bold text-white">
                    {tab.activeLabel}
                  </h2>
                </motion.div>

                {podiumItems.length > 0 ? (
                  <div className="flex items-end justify-center gap-2 lg:gap-5">
                    {podiumItems.length >= 2 && (
                      <PodiumPlatform key={podiumItems[1].id} rank={2} item={podiumItems[1]} label="" type={activeType} delay={0.1} isFirst={false} />
                    )}
                    <PodiumPlatform key={podiumItems[0].id} rank={1} item={podiumItems[0]} label="" type={activeType} delay={0} isFirst={true} />
                    {podiumItems.length >= 3 && (
                      <PodiumPlatform key={podiumItems[2].id} rank={3} item={podiumItems[2]} label="" type={activeType} delay={0.2} isFirst={false} />
                    )}
                    {podiumItems.length === 2 && <div className="w-20 lg:w-32" />}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="flex items-end justify-center gap-2 lg:gap-5 opacity-20">
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full bg-[#282828] mb-2" />
                        <div className="w-24 lg:w-36 h-20 lg:h-28 bg-zinc-400 rounded-t-xl" />
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full bg-[#282828] mb-2" />
                        <div className="w-28 lg:w-44 h-28 lg:h-40 bg-amber-400 rounded-t-xl" />
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-[#282828] mb-2" />
                        <div className="w-20 lg:w-32 h-14 lg:h-20 bg-amber-600 rounded-t-xl" />
                      </div>
                    </div>
                    <p className="text-[#B3B3B3] text-sm mt-4">Sem dados para exibir o pódio ainda</p>
                  </div>
                )}
              </div>

              {/* List below podium */}
              <div className="space-y-1.5 lg:space-y-2">
                {belowPodium.map((item, index) => (
                  <RankingCard
                    key={item.id}
                    item={item}
                    rank={podiumItems.length + index + 1}
                    type={activeType}
                    onRate={handleRate(item.id, activeItemType)}
                    userRating={getUserRating(item.id, activeItemType)}
                  />
                ))}

                {activeTopList.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[#181818] flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-8 h-8 text-[#282828]" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Nada por aqui ainda</h3>
                    <p className="text-[#B3B3B3] text-sm">Seja o primeiro a avaliar!</p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}