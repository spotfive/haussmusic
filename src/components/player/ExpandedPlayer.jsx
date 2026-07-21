import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Repeat1, Heart, X, MoreHorizontal
} from 'lucide-react';
import BackgroundMedia from '@/components/media/BackgroundMedia';

export default function ExpandedPlayer({ 
  song, 
  isPlaying, 
  onPlayPause, 
  onNext, 
  onPrevious,
  onClose,
  currentTime,
  duration,
  onSeek,
  isFavorite,
  onFavoriteToggle,
  audioRef
}) {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const videoRef = useRef(null);

  // Atualizar volume do áudio
  useEffect(() => {
    if (audioRef?.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.loop = repeatMode === 'one';
    }
  }, [volume, isMuted, repeatMode, audioRef]);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef?.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef?.current) {
      audioRef.current.volume = newMuted ? 0 : volume;
    }
  };

  const toggleRepeat = () => {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const newMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(newMode);
    if (audioRef?.current) {
      audioRef.current.loop = newMode === 'one';
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;
    if (!isNaN(newTime) && isFinite(newTime) && duration > 0) {
      onSeek(newTime);
    }
  };

  if (!song) return null;

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Main Content - Full Screen Video/Cover */}
      <div className="flex-1 relative overflow-hidden">
        {song.background_video_url ? (
          <BackgroundMedia
            src={song.background_video_url}
            alt={song.title}
            videoRef={videoRef}
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={song.cover_url}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        )}

        {/* Song Info Overlay */}
        <div className="absolute top-0 left-0 right-0 p-8 bg-gradient-to-b from-black/80 to-transparent">
          <h1 className="text-4xl font-bold text-white mb-2">{song.title}</h1>
          <p className="text-xl text-zinc-300">
            {song.artist}
            {song.featuring && ` feat. ${song.featuring}`}
          </p>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-zinc-950 border-t border-white/5 px-8 py-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div 
              className="h-1 bg-white/20 rounded-full cursor-pointer group relative"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-white rounded-full relative transition-all"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-between">
            {/* Left: Close & Favorite */}
            <div className="flex items-center gap-3 w-48">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onFavoriteToggle}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-pink-500 text-pink-500' : 'text-zinc-400'}`} />
              </motion.button>
            </div>

            {/* Center: Playback Controls */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleRepeat}
                className={`p-2 rounded-full transition-colors ${
                  repeatMode !== 'off' ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onPrevious}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <SkipBack className="w-6 h-6 text-white fill-current" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onPlayPause}
                className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-black fill-current" />
                ) : (
                  <Play className="w-6 h-6 text-black fill-current ml-0.5" />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onNext}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <SkipForward className="w-6 h-6 text-white fill-current" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-500 hover:text-white"
              >
                <MoreHorizontal className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Right: Volume */}
            <div className="flex items-center gap-3 w-48 justify-end">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </motion.button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                style={{
                  background: `linear-gradient(to right, white 0%, white ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}