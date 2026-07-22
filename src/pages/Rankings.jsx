import React from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Flame, Heart, Play, Music, Disc3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RankingCard from '@/components/rankings/RankingCard';

function PodiumPlatform({ rank, item, type, delay, isFirst }) {
  const heights = { 1: 'h-24 lg:h-36', 2: 'h-16 lg:h-24', 3: 'h-12 lg:h-16' };
  const colors = {
    1: 'bg-gradient-to-t from-amber-500 to-amber-400 shadow-lg shadow-amber-500/30',
    2: 'bg-gradient-to-t from-zinc-400 to-zinc-300 shadow-lg shadow-zinc-400/20',
    3: 'bg-gradient-to-t from-amber-700 to-amber-600 shadow-lg shadow-amber-700/20',
  };
  const widths = { 1: 'w-24 lg:w-40', 2: 'w-20 lg:w-32', 3: 'w-16 lg:w-28' };
  const imgSizes = { 1: 'w-14 h-14 lg:w-20 lg:h-20', 2: 'w-12 h-12 lg:w-16 lg:h-16', 3: 'w-10 h-10 lg:w-14 lg:h-14' };
  const ringColors = { 1: 'ring-amber-400', 2: 'ring-zinc-300', 3: 'ring-amber-600' };

  const statValue = type === 'likes' ? (item.likes || 0).toLocaleString() : (item.plays || 0).toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 120 }}
      className="flex flex-col items-center justify-end"
    >
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
          {type === 'likes' ? (
            <Heart className="w-3 h-3 text-pink-400 fill-current" />
          ) : (
            <Play className="w-3 h-3 text-[#c0c0c8] fill-current" />
          )}
          <span className="text-[10px] lg:text-xs text-[#B3B3B3] font-medium">{statValue}</span>
        </div>
      </div>

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

const TOP_N = 100;

export default function Rankings() {
  const { data: posts = [] } = useQuery({
    queryKey: ['rankings-posts'],
    queryFn: () => base44.entities.Post.list('-plays'),
    refetchInterval: 3000,
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['rankings-songs'],
    queryFn: () => base44.entities.Song.list('-plays'),
    refetchInterval: 3000,
  });

  // Every chart pulls from the full catalog (not just whatever's most
  // recent) and re-sorts client-side, so a play/like on anything — old or
  // new — is reflected within one refetch instead of only affecting
  // whatever happened to already be in a capped "recent" query.
  const topAlbums = [...posts]
    .filter(p => (p.plays || 0) > 0)
    .sort((a, b) => (b.plays || 0) - (a.plays || 0))
    .slice(0, TOP_N);

  const topSongs = [...songs]
    .filter(s => (s.plays || 0) > 0)
    .sort((a, b) => (b.plays || 0) - (a.plays || 0))
    .slice(0, TOP_N);

  const topLiked = [...posts]
    .filter(p => (p.likes || 0) > 0)
    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
    .slice(0, TOP_N);

  // The one chart that mixes both types — the overall "most played on the
  // platform" list, songs and albums together, ranked purely by plays.
  const topPlaysOverall = [...posts, ...songs]
    .filter(item => (item.plays || 0) > 0)
    .sort((a, b) => (b.plays || 0) - (a.plays || 0))
    .slice(0, TOP_N);

  const tabConfigs = [
    { value: 'albums', icon: Disc3, label: 'Álbuns', activeLabel: 'Álbuns Mais Ouvidos', type: 'plays', list: topAlbums },
    { value: 'songs', icon: Music, label: 'Músicas', activeLabel: 'Músicas Mais Ouvidas', type: 'plays', list: topSongs },
    { value: 'likes', icon: Heart, label: 'Curtidas', activeLabel: 'Mais Curtidos', type: 'likes', list: topLiked },
    { value: 'plays', icon: Play, label: 'Plays', activeLabel: 'Mais Tocados (Geral)', type: 'plays', list: topPlaysOverall },
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
            style={{ background: 'radial-gradient(circle, rgba(200,200,210,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }}
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute bottom-10 left-10 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(224,224,230,0.2) 0%, transparent 70%)', filter: 'blur(80px)' }}
          />
        </div>

        <div className="relative px-4 lg:px-6 xl:px-8 pt-6 lg:pt-8 pb-4 lg:pb-6">
          <div className="flex items-center gap-3 lg:gap-4">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-12 lg:w-16 h-12 lg:h-16 rounded-2xl bg-gradient-to-br from-[#c0c0c8] to-[#e5e5ea] flex items-center justify-center shadow-lg shadow-[#c0c0c8]/30"
            >
              <Flame className="w-6 lg:w-8 h-6 lg:h-8 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl lg:text-4xl font-bold text-white">HAUSS HITS</h1>
              <p className="text-sm lg:text-base text-[#B3B3B3]">O top 100 de cada categoria, atualizado ao vivo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs at top, then podium + list below */}
      <div className="px-4 lg:px-6 xl:px-8">
        <Tabs defaultValue="albums" className="w-full">
          <TabsList className="bg-[#181818] border border-[#282828] mb-4 w-full grid grid-cols-4 p-1 rounded-xl">
            {tabConfigs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-[#c0c0c8]/20 data-[state=active]:text-[#e5e5ea] text-[11px] sm:text-sm lg:text-base flex items-center gap-1.5 lg:gap-2 rounded-lg">
                <tab.icon className="w-3.5 lg:w-4 h-3.5 lg:h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabConfigs.map(tab => {
            const podiumItems = tab.list.slice(0, Math.min(3, tab.list.length));
            const belowPodium = tab.list.slice(podiumItems.length);

            return (
              <TabsContent key={tab.value} value={tab.value} className="overflow-visible">
                {/* Podium */}
                <div className="pt-4 lg:pt-6 pb-6 lg:pb-8 overflow-visible">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-3 lg:mb-5">
                    <h2 className="text-lg lg:text-xl font-bold text-white">{tab.activeLabel}</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Top {tab.list.length} de {TOP_N}</p>
                  </motion.div>

                  {podiumItems.length > 0 ? (
                    <div className="flex items-end justify-center gap-2 lg:gap-5">
                      {podiumItems.length >= 2 && (
                        <PodiumPlatform key={podiumItems[1].id} rank={2} item={podiumItems[1]} type={tab.type} delay={0.1} isFirst={false} />
                      )}
                      <PodiumPlatform key={podiumItems[0].id} rank={1} item={podiumItems[0]} type={tab.type} delay={0} isFirst={true} />
                      {podiumItems.length >= 3 && (
                        <PodiumPlatform key={podiumItems[2].id} rank={3} item={podiumItems[2]} type={tab.type} delay={0.2} isFirst={false} />
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
                      type={tab.type}
                    />
                  ))}

                  {tab.list.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-[#181818] flex items-center justify-center mx-auto mb-4">
                        <Flame className="w-8 h-8 text-[#282828]" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Nada por aqui ainda</h3>
                      <p className="text-[#B3B3B3] text-sm">Assim que algo bombar, aparece aqui.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
