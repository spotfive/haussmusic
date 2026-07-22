import React from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Flame, Heart, Play, Music, Disc3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RankingCard from '@/components/rankings/RankingCard';

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

      {/* Tabs at top, then the numbered list below */}
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

          {tabConfigs.map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 pt-2">
                <h2 className="text-lg lg:text-xl font-bold text-white">{tab.activeLabel}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Top {tab.list.length} de {TOP_N}</p>
              </motion.div>

              <div className="space-y-1">
                {tab.list.map((item, index) => (
                  <RankingCard
                    key={item.id}
                    item={item}
                    rank={index + 1}
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
          ))}
        </Tabs>
      </div>
    </div>
  );
}
