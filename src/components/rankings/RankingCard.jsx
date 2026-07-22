import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Heart, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AddToPlaylistMenu from '@/components/playlist/AddToPlaylistMenu';

export default function RankingCard({ item, rank, type }) {
  const isSong = !!item.audio_url;

  const getBadgeColor = (rank) => {
    if (rank === 1) return 'from-yellow-500 to-amber-500';
    if (rank === 2) return 'from-zinc-400 to-zinc-500';
    if (rank === 3) return 'from-amber-600 to-orange-600';
    return 'from-zinc-700 to-zinc-800';
  };

  const handlePlay = () => {
    if (isSong) window.dispatchEvent(new CustomEvent('playSong', { detail: item }));
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.02 }}
      whileHover={{ x: 5, scale: 1.01 }}
      onClick={isSong ? handlePlay : undefined}
      className={`group relative bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-zinc-400/30 transition-all ${isSong ? 'cursor-pointer' : ''}`}
    >
      {/* Rank badge */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${getBadgeColor(rank)} flex items-center justify-center font-bold text-white shadow-lg`}
        >
          {rank}
        </motion.div>
      </div>

      <div className="flex items-center gap-4 ml-6">
        {/* Cover */}
        <div className="relative group/img flex-shrink-0">
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden">
            {item.cover_url ? (
              <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-500 to-neutral-500" />
            )}
          </div>
          {rank === 1 && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-xl bg-yellow-400/20"
            />
          )}
          {isSong && (
            <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
              <Play className="w-6 h-6 text-white fill-current opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate group-hover:text-zinc-300 transition-colors">
            {item.title}
          </h3>
          <p className="text-sm text-zinc-500 truncate">
            {item.artist}
            {item.featuring && <span className="text-zinc-600"> feat. {item.featuring}</span>}
          </p>

          <div className="flex items-center gap-1.5 mt-2">
            {type === 'likes' ? (
              <>
                <Heart className="w-4 h-4 text-pink-400 fill-current" />
                <span className="text-sm font-semibold text-pink-400">{(item.likes || 0).toLocaleString()}</span>
                <span className="text-xs text-zinc-600">curtidas</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-cyan-400 fill-current" />
                <span className="text-sm font-semibold text-cyan-400">{(item.plays || 0).toLocaleString()}</span>
                <span className="text-xs text-zinc-600">plays</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        {isSong && (
          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
            <AddToPlaylistMenu
              songId={item.id}
              buttonClassName="p-2.5 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
              iconClassName="w-5 h-5"
            />
          </div>
        )}
      </div>

      {/* Trending indicator for top 3 */}
      {rank <= 3 && (
        <motion.div
          animate={{ y: [-2, 2, -2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-2 right-2"
        >
          <TrendingUp className="w-4 h-4 text-[#e5e5ea]" />
        </motion.div>
      )}
    </motion.div>
  );

  if (isSong) return content;
  return <Link to={createPageUrl('Release') + '?id=' + item.id}>{content}</Link>;
}
