import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Play } from 'lucide-react';
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
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.015, 0.6) }}
      whileHover={{ x: 3 }}
      onClick={isSong ? handlePlay : undefined}
      className={`group relative flex items-center gap-3 bg-white/5 hover:bg-white/[0.08] rounded-xl pl-7 pr-3 py-2 border border-white/10 hover:border-zinc-400/30 transition-all ${isSong ? 'cursor-pointer' : ''}`}
    >
      {/* Rank badge */}
      <div className={`absolute left-1 w-6 h-6 rounded-full bg-gradient-to-br ${getBadgeColor(rank)} flex items-center justify-center text-[11px] font-bold text-white shadow`}>
        {rank}
      </div>

      {/* Cover */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden">
          {item.cover_url ? (
            <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-500 to-neutral-500" />
          )}
        </div>
        {isSong && (
          <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-white fill-current opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-zinc-300 transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-zinc-500 truncate">
          {item.artist}
          {item.featuring && <span className="text-zinc-600"> feat. {item.featuring}</span>}
        </p>
      </div>

      {/* Metric */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {type === 'likes' ? (
          <>
            <Heart className="w-3.5 h-3.5 text-pink-400 fill-current" />
            <span className="text-xs font-semibold text-pink-400">{(item.likes || 0).toLocaleString()}</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 text-cyan-400 fill-current" />
            <span className="text-xs font-semibold text-cyan-400">{(item.plays || 0).toLocaleString()}</span>
          </>
        )}
      </div>

      {/* Actions */}
      {isSong && (
        <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
          <AddToPlaylistMenu
            songId={item.id}
            buttonClassName="p-1.5 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
            iconClassName="w-4 h-4"
          />
        </div>
      )}
    </motion.div>
  );

  if (isSong) return content;
  return <Link to={createPageUrl('Release') + '?id=' + item.id}>{content}</Link>;
}
