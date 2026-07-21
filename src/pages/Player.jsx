import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ListMusic, Share2, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import GlowingOrb from '@/components/player/GlowingOrb';
import AudioVisualizer from '@/components/player/AudioVisualizer';
import PlayerControls from '@/components/player/PlayerControls';
import SongCard from '@/components/ui/SongCard';

export default function Player() {
  const queryClient = useQueryClient();
  const audioRef = useRef(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // off, all, one
  const [showQueue, setShowQueue] = useState(false);

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.entities.Song.list('-plays', 50),
  });

  const currentSong = songs[currentSongIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (currentSong?.audio_url && audioRef.current) {
      audioRef.current.src = currentSong.audio_url;
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleNext = () => {
    if (isShuffled) {
      setCurrentSongIndex(Math.floor(Math.random() * songs.length));
    } else {
      setCurrentSongIndex((prev) => (prev + 1) % songs.length);
    }
  };

  const handlePrev = () => {
    if (currentTime > 3) {
      handleSeek(0);
    } else {
      setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length);
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      handleSeek(0);
      audioRef.current?.play();
    } else if (repeatMode === 'all' || currentSongIndex < songs.length - 1) {
      handleNext();
    } else {
      setIsPlaying(false);
    }
  };

  const toggleRepeat = () => {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  const handleFavorite = async () => {
    if (currentSong) {
      base44.entities.Song.update(currentSong.id, { is_favorite: !currentSong.is_favorite }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    }
  };

  const handlePlayFromQueue = (song) => {
    const index = songs.findIndex(s => s.id === song.id);
    if (index !== -1) {
      setCurrentSongIndex(index);
      setIsPlaying(true);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
      />

      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          animate={{
            scale: isPlaying ? [1, 1.3, 1] : 1,
            opacity: isPlaying ? [0.2, 0.4, 0.2] : 0.1
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(200,200,210,0.4) 0%, transparent 70%)',
            filter: 'blur(100px)'
          }}
        />
        <motion.div
          animate={{
            scale: isPlaying ? [1.2, 1, 1.2] : 1.1,
            opacity: isPlaying ? [0.15, 0.3, 0.15] : 0.1
          }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(210,210,218,0.3) 0%, transparent 60%)',
            filter: 'blur(80px)'
          }}
        />
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between p-6">
        <Link to={createPageUrl('Home')}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            <ChevronDown className="w-6 h-6" />
          </motion.button>
        </Link>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowQueue(!showQueue)}
            className={`p-2 rounded-full transition-colors ${showQueue ? 'bg-zinc-400/30 text-zinc-300' : 'bg-white/5 hover:bg-white/10 text-white'}`}
          >
            <ListMusic className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      <div className="relative flex flex-col lg:flex-row items-center lg:items-start gap-8 px-6 lg:px-12 pb-32">
        {/* Main player area */}
        <div className={`flex-1 flex flex-col items-center ${showQueue ? 'lg:w-1/2' : 'w-full'}`}>
          {/* Album art orb */}
          <div className="mb-8">
            <GlowingOrb isPlaying={isPlaying} coverUrl={currentSong?.cover_url} />
          </div>

          {/* Audio visualizer */}
          <div className="w-full max-w-xl mb-8">
            <AudioVisualizer isPlaying={isPlaying} />
          </div>

          {/* Song info */}
          <motion.div
            key={currentSong?.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              {currentSong?.title || 'Selecione uma música'}
            </h1>
            <p className="text-lg text-zinc-400">
              {currentSong?.artist || 'Artista desconhecido'}
            </p>
            {currentSong?.album && (
              <p className="text-sm text-zinc-500 mt-1">{currentSong.album}</p>
            )}
          </motion.div>

          {/* Controls */}
          <div className="w-full px-4">
            <PlayerControls
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              onNext={handleNext}
              onPrev={handlePrev}
              currentTime={currentTime}
              duration={duration || currentSong?.duration || 0}
              onSeek={handleSeek}
              volume={volume}
              onVolumeChange={setVolume}
              isFavorite={currentSong?.is_favorite}
              onFavoriteToggle={handleFavorite}
              isShuffled={isShuffled}
              onShuffleToggle={() => setIsShuffled(!isShuffled)}
              repeatMode={repeatMode}
              onRepeatToggle={toggleRepeat}
            />
          </div>
        </div>

        {/* Queue panel */}
        <AnimatePresence>
          {showQueue && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="w-full lg:w-1/2 bg-white/5 rounded-2xl backdrop-blur-xl border border-white/10 overflow-hidden"
            >
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Fila de reprodução</h2>
                <p className="text-sm text-zinc-500">{songs.length} músicas</p>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {songs.map((song, index) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    index={index}
                    isPlaying={isPlaying}
                    isCurrentSong={currentSongIndex === index}
                    onPlay={handlePlayFromQueue}
                    onFavorite={() => {}}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}