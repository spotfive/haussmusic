import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Play, Pause, SkipForward, SkipBack, Heart, Repeat, Shuffle, Volume2 } from 'lucide-react';

export default function ExpandedMobilePlayer({
  isOpen,
  onClose,
  currentSong,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  currentTime,
  duration,
  onSeek,
  isFavorite,
  onFavoriteToggle,
  repeatMode,
  onToggleRepeat,
  shuffleEnabled,
  onToggleShuffle,
  volume,
  onVolumeChange,
}) {
  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct * duration);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[9999] lg:hidden bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0a0a0a] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-[#282828]">
            <button onClick={onClose} className="p-2 text-[#B3B3B3] active:text-white">
              <ChevronDown className="w-6 h-6" />
            </button>
            <span className="text-xs text-[#696969] font-medium">TOCANDO AGORA</span>
            <div className="w-10" />
          </div>

          {/* Content */}
          <div className="flex flex-col h-full overflow-y-auto pb-safe">
            {/* Album art - large */}
            <div className="flex-1 flex items-center justify-center px-6 py-8">
              <div className="w-64 h-64 rounded-xl shadow-2xl overflow-hidden">
                {currentSong?.cover_url ? (
                  <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                    <div className="w-24 h-24 rounded-lg bg-[#383838]" />
                  </div>
                )}
              </div>
            </div>

            {/* Song info */}
            <div className="px-6 pb-8 text-center">
              <h1 className="text-2xl font-bold text-white truncate mb-2">{currentSong?.title}</h1>
              <p className="text-base text-[#B3B3B3] truncate">{currentSong?.artist}</p>
            </div>

            {/* Progress bar */}
            <div className="px-6 pb-8">
              <div
                className="relative h-2 bg-[#282828] rounded-full cursor-pointer group/progress mb-4"
                onClick={handleProgressClick}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-[#c0c0c8] rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md opacity-0 group-active/progress:opacity-100"
                  style={{ left: `${progressPct}%`, marginLeft: '-8px' }}
                />
              </div>

              <div className="flex items-center justify-between text-sm text-[#B3B3B3]">
                <span className="tabular-nums">{formatTime(currentTime)}</span>
                <span className="tabular-nums">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main controls */}
            <div className="px-6 pb-8 flex items-center justify-center gap-6">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onToggleShuffle}
                className={`p-3 rounded-full transition-colors ${
                  shuffleEnabled ? 'text-[#c0c0c8] bg-[#c0c0c8]/10' : 'text-[#B3B3B3]'
                }`}
              >
                <Shuffle className="w-6 h-6" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onPrevious}
                className="p-3 rounded-full text-white"
              >
                <SkipBack className="w-8 h-8 fill-current" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.90 }}
                onClick={onPlayPause}
                className="w-20 h-20 rounded-full bg-[#c0c0c8] flex items-center justify-center shadow-2xl flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white fill-white" />
                ) : (
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onNext}
                className="p-3 rounded-full text-white"
              >
                <SkipForward className="w-8 h-8 fill-current" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onFavoriteToggle}
                className={`p-3 rounded-full transition-colors ${
                  isFavorite ? 'text-[#c0c0c8] bg-[#c0c0c8]/10' : 'text-[#B3B3B3]'
                }`}
              >
                <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
              </motion.button>
            </div>

            {/* Secondary controls */}
            <div className="px-6 pb-12 flex items-center justify-between">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onToggleRepeat}
                className={`p-2 rounded-full transition-colors ${
                  repeatMode ? 'text-[#c0c0c8] bg-[#c0c0c8]/10' : 'text-[#B3B3B3]'
                }`}
              >
                <Repeat className="w-5 h-5" />
              </motion.button>

              <div className="flex items-center gap-3 flex-1 mx-4">
                <Volume2 className="w-4 h-4 text-[#B3B3B3] flex-shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={onVolumeChange}
                  className="flex-1"
                  style={{
                    background: `linear-gradient(to right, #c0c0c8 0%, #c0c0c8 ${
                      volume * 100
                    }%, #383838 ${volume * 100}%, #383838 100%)`,
                  }}
                />
              </div>

              <div className="w-8" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}