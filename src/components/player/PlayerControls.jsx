import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Heart } from 'lucide-react';
import { Slider } from "@/components/ui/slider";

export default function PlayerControls({ 
  isPlaying, 
  onPlayPause, 
  onNext, 
  onPrev,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isFavorite,
  onFavoriteToggle,
  isShuffled,
  onShuffleToggle,
  repeatMode,
  onRepeatToggle
}) {
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={(value) => onSeek(value[0])}
          className="cursor-pointer [&_[role=slider]]:bg-violet-400 [&_[role=slider]]:border-violet-300 [&_[role=slider]]:shadow-[0_0_10px_rgba(139,92,246,0.5)] [&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-violet-600 [&_.bg-primary]:to-purple-400"
        />
        <div className="flex justify-between text-xs text-zinc-500 font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onShuffleToggle}
          className={`p-2 rounded-full transition-colors ${isShuffled ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Shuffle className="w-5 h-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPrev}
          className="p-3 text-zinc-300 hover:text-white transition-colors"
        >
          <SkipBack className="w-7 h-7 fill-current" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={onPlayPause}
          className="relative p-6 rounded-full text-white shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(192,132,252,0.8) 50%, rgba(236,72,153,0.7) 100%)',
            boxShadow: `
              0 0 40px rgba(139,92,246,0.7), 
              0 0 80px rgba(139,92,246,0.4),
              0 10px 50px rgba(0,0,0,0.5),
              inset 0 0 30px rgba(255,255,255,0.1)
            `,
            border: '2px solid rgba(192,192,192,0.3)'
          }}
        >
          {/* Animated glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.6), rgba(236,72,153,0.4))'
            }}
            animate={{
              opacity: isPlaying ? [0.3, 0.7, 0.3] : 0.3,
              scale: isPlaying ? [1, 1.1, 1] : 1
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {/* Metallic shine */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)'
            }}
          />
          {isPlaying ? (
            <Pause className="w-8 h-8 relative z-10 fill-current drop-shadow-lg" />
          ) : (
            <Play className="w-8 h-8 relative z-10 fill-current ml-1 drop-shadow-lg" />
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          className="p-3 text-zinc-300 hover:text-white transition-colors"
        >
          <SkipForward className="w-7 h-7 fill-current" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRepeatToggle}
          className={`p-2 rounded-full transition-colors relative ${repeatMode !== 'off' ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Repeat className="w-5 h-5" />
          {repeatMode === 'one' && (
            <span className="absolute -top-1 -right-1 text-[10px] font-bold text-violet-400">1</span>
          )}
        </motion.button>
      </div>

      {/* Secondary controls */}
      <div className="flex items-center justify-between">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onFavoriteToggle}
          className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-pink-500' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
        </motion.button>

        <div className="flex items-center gap-3 w-32">
          <Volume2 className="w-5 h-5 text-zinc-500" />
          <Slider
            value={[volume]}
            max={100}
            step={1}
            onValueChange={(value) => onVolumeChange(value[0])}
            className="cursor-pointer [&_[role=slider]]:bg-zinc-400 [&_[role=slider]]:w-3 [&_[role=slider]]:h-3"
          />
        </div>
      </div>
    </div>
  );
}