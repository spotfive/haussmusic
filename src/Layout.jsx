import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import Sidebar from '@/components/layout/Sidebar';
import MiniPlayer from '@/components/layout/MiniPlayer';
import RightSidebar from '@/components/player/RightSidebar';
import ExpandedMobilePlayer from '@/components/layout/ExpandedMobilePlayer';
import ProfileSetup from '@/components/profile/ProfileSetup';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Search, Library, Music2, Star, Award, LogIn, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { hasUserType } from '@/lib/utils';
import { useSongLikes } from '@/lib/songLikes';

export default function Layout({ children, currentPageName }) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { isLiked, toggle } = useSongLikes(user?.email);

  // ===== PLAYER STATE =====
  const audioA = useRef(null);
  const audioB = useRef(null);
  const currentAudioRef = useRef(null);
  const nextAudioRef = useRef(null);
  
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [shuffledSongs, setShuffledSongs] = useState([]);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showMobilePlayer, setShowMobilePlayer] = useState(false);
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(false);

  const needsProfile = !!user && !user.profile_completed && !user.display_name && !user.full_name;
  
  // ===== CROSSFADE CONFIG =====
  const CROSSFADE_DURATION = 5; // 5 seconds
  const isCrossfadingRef = useRef(false);
  const fadeTimerRef = useRef(null);
  // Tracks which song a fade was already attempted for, so a broken/slow
  // next track doesn't retry the crossfade on every single timeupdate tick.
  const autoFadeAttemptedForRef = useRef(null);
  // Live refs so an in-progress fade always reads the current volume/mute
  // state instead of the value that was in scope when the fade started.
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Every page shares this ['songs'] cache. They MUST all fetch the same
  // full list with the same sort, or their observers clobber each other's
  // data (e.g. this always-mounted Layout used to cap it at 50-by-plays,
  // which silently dropped liked songs outside the top 50 from Library's
  // "Curtidas"). Each page sorts/slices its own view locally instead.
  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.entities.Song.list('-created_date'),
    refetchInterval: 3000,
  });

  // ===== Initialize audio refs =====
  useEffect(() => {
    if (audioA.current && audioB.current) {
      currentAudioRef.current = audioA.current;
      nextAudioRef.current = audioB.current;
    }

    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, []);

  // ===== Listen for song play events =====
  useEffect(() => {
    const handlePlaySong = (e) => {
      playTrack(e.detail);
    };
    const handleTogglePlayPause = () => setIsPlaying(prev => !prev);

    window.addEventListener('playSong', handlePlaySong);
    window.addEventListener('togglePlayPause', handleTogglePlayPause);

    return () => {
      window.removeEventListener('playSong', handlePlaySong);
      window.removeEventListener('togglePlayPause', handleTogglePlayPause);
    };
  }, []);

  // ===== NOTIFY ACTIVE SONG =====
  const notifyActiveSong = (song) => {
    window.dispatchEvent(new CustomEvent('activeSongChanged', { detail: song }));
  };

  // ===== TIME UPDATE HANDLER =====
  const handleTimeUpdate = () => {
    const audio = isCrossfadingRef.current
      ? nextAudioRef.current
      : currentAudioRef.current;

    if (!audio || !Number.isFinite(audio.duration)) return;

    setCurrentTime(audio.currentTime);
    setDuration(audio.duration);
    setProgress((audio.currentTime / audio.duration) * 100);

    if (
      !isCrossfadingRef.current &&
      crossfadeEnabled &&
      isPlaying &&
      (songs.length > 1 || repeatMode) &&
      autoFadeAttemptedForRef.current !== currentSong?.id
    ) {
      const timeRemaining = audio.duration - audio.currentTime;

      if (
        Number.isFinite(timeRemaining) &&
        timeRemaining <= CROSSFADE_DURATION &&
        timeRemaining > 0 &&
        audio.duration > CROSSFADE_DURATION + 1
      ) {
        // Mark it attempted up front — startCrossfade takes over from here,
        // succeed or fail, so this tick doesn't retry every ~250ms.
        autoFadeAttemptedForRef.current = currentSong?.id;
        startCrossfade(repeatMode ? currentSong : null);
      }
    }
  };

  // ===== PLAYLIST HELPERS =====
  const getPlaylist = () => {
    return shuffleEnabled && shuffledSongs.length > 0 ? shuffledSongs : songs;
  };

  // Takes an explicit song instead of reading `currentSong` from state, so
  // callers inside a crossfade-in-progress (where the state update for the
  // new song hasn't been committed yet) always get the right answer.
  const getSongAfter = (song) => {
    const playList = getPlaylist();
    if (!playList.length || !song) return null;

    const index = playList.findIndex(s => s.id === song.id);
    const safeIndex = index >= 0 ? index : 0;
    const nextIndex = (safeIndex + 1) % playList.length;

    return playList[nextIndex];
  };

  const getNextSong = () => getSongAfter(currentSong);

  const prepareSpecificTrack = (song) => {
    const next = nextAudioRef.current;
    if (!next || !song?.audio_url) return false;

    next.pause();
    next.src = song.audio_url;
    next.currentTime = 0;
    next.volume = 0;
    next.load();

    return true;
  };

  // ===== CORE PLAYER FUNCTIONS =====
  // `skipCrossfade` is used by the crossfade's own error fallback (broken
  // next track) — without it, that fallback would call back into
  // startCrossfade and could loop forever on a track that never plays.
  const playTrack = (song, { skipCrossfade = false } = {}) => {
    const current = currentAudioRef.current;
    if (!current) return;

    // If crossfade is enabled and a song is already playing, use crossfade instead
    if (!skipCrossfade && crossfadeEnabled && currentSong && currentAudioRef.current?.src) {
      startCrossfade(song);
      return;
    }

    if (isCrossfadingRef.current) {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      isCrossfadingRef.current = false;
      nextAudioRef.current?.pause();
    }

    current.src = song.audio_url;
    current.currentTime = 0;
    current.volume = isMuted ? 0 : volume;

    setCurrentSong(song);
    autoFadeAttemptedForRef.current = null;
    notifyActiveSong(song);
    setCurrentTime(0);
    setDuration(0);
    setProgress(0);

    current.play().catch(() => {});
    setIsPlaying(true);
    setShowRightSidebar(true);
  };

  const prepareNextTrack = () => {
    const nextSong = getNextSong();
    if (!nextSong) return null;

    prepareSpecificTrack(nextSong);
    return nextSong;
  };

  const startCrossfade = async (forcedSong = null) => {
    // A fade is already running (e.g. the user hit skip again mid-fade).
    // Don't just bail out and leave the click feeling dead — snap the
    // in-flight transition to "done" and immediately start a new one from
    // whatever is audible right now, so every request always does something.
    if (isCrossfadingRef.current) {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      const interruptedFrom = currentAudioRef.current;
      const interruptedTo = nextAudioRef.current;
      interruptedFrom.pause();
      interruptedFrom.currentTime = 0;
      interruptedFrom.removeAttribute('src');
      interruptedFrom.load();
      interruptedFrom.volume = 0;

      currentAudioRef.current = interruptedTo;
      nextAudioRef.current = interruptedFrom;
      isCrossfadingRef.current = false;
    }

    const fromAudio = currentAudioRef.current;
    const toAudio = nextAudioRef.current;
    const nextSong = forcedSong || getNextSong();

    if (!fromAudio || !toAudio || !nextSong?.audio_url) return;

    isCrossfadingRef.current = true;

    toAudio.pause();
    toAudio.src = nextSong.audio_url;
    toAudio.currentTime = 0;
    toAudio.volume = 0;
    toAudio.load();

    try {
      await toAudio.play();
    } catch (error) {
      isCrossfadingRef.current = false;
      // Broken/unavailable next track — fall back to a hard cut instead of
      // silently doing nothing (and getting retried every tick).
      playTrack(nextSong, { skipCrossfade: true });
      return;
    }

    setCurrentSong(nextSong);
    notifyActiveSong(nextSong);
    setCurrentTime(0);
    setDuration(0);
    setProgress(0);
    autoFadeAttemptedForRef.current = null;

    const durationMs = CROSSFADE_DURATION * 1000;
    const startedAt = performance.now();

    // Elapsed-time based rather than a fixed step counter, so a throttled
    // background tab (where timers can slow to ~1/sec) still finishes the
    // fade in the right total time instead of taking minutes to complete.
    const fadeStep = () => {
      const elapsed = performance.now() - startedAt;
      const fadeProgress = Math.min(elapsed / durationMs, 1);
      const masterVolume = isMutedRef.current ? 0 : volumeRef.current;

      fromAudio.volume = Math.max(0, Math.min(1, masterVolume * (1 - fadeProgress)));
      toAudio.volume = Math.max(0, Math.min(1, masterVolume * fadeProgress));

      if (fadeProgress < 1) {
        fadeTimerRef.current = setTimeout(fadeStep, 50);
        return;
      }

      fromAudio.pause();
      fromAudio.currentTime = 0;
      fromAudio.removeAttribute('src');
      fromAudio.load();
      fromAudio.volume = 0;

      currentAudioRef.current = toAudio;
      nextAudioRef.current = fromAudio;

      const nextAfterThis = repeatMode ? nextSong : getSongAfter(nextSong);
      if (nextAfterThis) {
        prepareSpecificTrack(nextAfterThis);
      }

      isCrossfadingRef.current = false;
      fadeTimerRef.current = null;
    };

    fadeTimerRef.current = setTimeout(fadeStep, 50);
  };

  const skipTrack = () => {
    const nextSong = getNextSong();
    if (!nextSong) return;

    if (crossfadeEnabled) {
      startCrossfade(nextSong);
    } else {
      playTrack(nextSong);
    }
  };

  // ===== VOLUME & PLAYBACK CONTROLS =====
  const handleSeek = (time) => {
    // Seek whichever track the UI is actually showing progress for — during
    // a crossfade that's the incoming track, not the outgoing one.
    const audio = isCrossfadingRef.current ? nextAudioRef.current : currentAudioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(time, audio.duration));
      setCurrentTime(audio.currentTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);

    // Mid-fade, fadeStep owns both channels' volume every 50ms and reads
    // volumeRef/isMutedRef live — touching the elements here would just get
    // overwritten (or fight it) on the next tick.
    if (isCrossfadingRef.current) return;

    const current = currentAudioRef.current;
    if (current) current.volume = newVolume;
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (isCrossfadingRef.current) return;

    const current = currentAudioRef.current;
    if (current) current.volume = newMuted ? 0 : volume;
  };

  const handleToggleRepeat = () => {
    const newRepeatMode = !repeatMode;
    setRepeatMode(newRepeatMode);
  };

  const handleToggleShuffle = () => {
    const newShuffleState = !shuffleEnabled;
    setShuffleEnabled(newShuffleState);

    if (newShuffleState) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      setShuffledSongs(shuffled);
    } else {
      setShuffledSongs([]);
    }
  };

  const handleNext = () => {
    skipTrack();
  };

  const handlePrevious = () => {
    const playList = shuffleEnabled && shuffledSongs.length > 0 ? shuffledSongs : songs;
    if (playList.length === 0) return;

    const current = currentAudioRef.current;
    if (current && current.currentTime > 3) {
      // Se passou de 3s, volta pro início da música atual
      current.currentTime = 0;
      setCurrentTime(0);
    } else {
      // Caso contrário, vai pra música anterior
      const currentIndex = playList.findIndex(s => s.id === currentSong?.id);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : playList.length - 1;
      const prevSong = playList[prevIndex];
      playTrack(prevSong);
    }
  };

  const handleFavoriteToggle = () => {
    if (currentSong) toggle(currentSong);
  };

  // ===== HANDLE PLAY/PAUSE =====
  useEffect(() => {
    if (isPlaying) {
      currentAudioRef.current?.play().catch(() => {});
      // Mid-crossfade both channels are audibly playing — pausing only the
      // "current" one used to leave the incoming track playing on its own.
      if (isCrossfadingRef.current) {
        nextAudioRef.current?.play().catch(() => {});
      }
    } else {
      audioA.current?.pause();
      audioB.current?.pause();
    }
  }, [isPlaying]);

  // ===== HANDLE SONG END =====
  useEffect(() => {
    const a = audioA.current;
    const b = audioB.current;

    if (!a || !b) return;

    // currentAudioRef swaps between `a` and `b` after every crossfade, so
    // this has to work for whichever one is active — not just `a` — or
    // repeat/auto-advance silently stop working after the first crossfade.
    const handleEnded = (e) => {
      if (e.target !== currentAudioRef.current || isCrossfadingRef.current) return;

      if (!crossfadeEnabled && repeatMode) {
        e.target.currentTime = 0;
        e.target.play().catch(() => {});
      } else if (!crossfadeEnabled) {
        handleNext();
      }
    };

    a.addEventListener('timeupdate', handleTimeUpdate);
    b.addEventListener('timeupdate', handleTimeUpdate);
    a.addEventListener('ended', handleEnded);
    b.addEventListener('ended', handleEnded);

    return () => {
      a.removeEventListener('timeupdate', handleTimeUpdate);
      b.removeEventListener('timeupdate', handleTimeUpdate);
      a.removeEventListener('ended', handleEnded);
      b.removeEventListener('ended', handleEnded);
    };
  }, [isPlaying, crossfadeEnabled, repeatMode, currentSong, songs, shuffleEnabled, shuffledSongs]);

  const navItems = [
    { icon: Home, label: 'Início', page: 'Home' },
    { icon: Search, label: 'Buscar', page: 'Search' },
    { icon: Library, label: 'Biblioteca', page: 'Library' },
    ...(hasUserType(user, 'artista') || hasUserType(user, 'staff')
      ? [{ icon: Award, label: 'Artista', page: 'ArtistDashboard' }]
      : [{ icon: Music2, label: 'Artistas', page: 'Artists' }]
    ),
    { icon: Star, label: 'HAUSS HITS', page: 'Rankings' },
    ...(isAuthenticated ? [] : [{ icon: LogIn, label: 'Entrar', page: 'AuthPage' }]),
  ];

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Toaster position="top-center" theme="dark" />
      
      {/* Profile Setup Modal */}
      {needsProfile && user && (
        <ProfileSetup
          user={user}
          onComplete={refreshUser}
        />
      )}

      {/* Dual audio elements for crossfade */}
      <audio ref={audioA} crossOrigin="anonymous" />
      <audio ref={audioB} crossOrigin="anonymous" />



      <div className="flex h-screen relative z-10">
        {/* Sidebar */}
        <Sidebar currentPage={currentPageName} />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-32 lg:pb-24 bg-[#121212]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPageName}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Right Sidebar - Now Playing (Desktop) */}
      {/* AnimatePresence has to wrap the conditional itself (not live inside
          RightSidebar) — otherwise it unmounts in the same tick as its
          child and the exit/slide-out animation never gets to run. */}
      <AnimatePresence>
        {showRightSidebar && currentSong && (
          <RightSidebar
            key="right-sidebar"
            song={currentSong}
            isPlaying={isPlaying}
            onClose={() => setShowRightSidebar(false)}
            isFavorite={currentSong ? isLiked(currentSong) : false}
            onFavoriteToggle={handleFavoriteToggle}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onNext={handleNext}
            onPrevious={handlePrevious}
            repeatMode={repeatMode}
            onToggleRepeat={handleToggleRepeat}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
          />
        )}
      </AnimatePresence>

      {/* Reopen tab — shows once the now-playing panel has been closed, so
          there's still a way back to it besides hovering the mini player */}
      <AnimatePresence>
        {!showRightSidebar && currentSong && (
          <motion.button
            key="reopen-right-sidebar"
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowRightSidebar(true)}
            title="Mostrar tocando agora"
            className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 items-center justify-center w-8 h-14 bg-[#181818] hover:bg-[#282828] border border-r-0 border-white/10 rounded-l-xl shadow-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[#B3B3B3]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded Mobile Player */}
      {currentSong && (
        <ExpandedMobilePlayer
          isOpen={showMobilePlayer}
          onClose={() => setShowMobilePlayer(false)}
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onNext={handleNext}
          onPrevious={handlePrevious}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          isFavorite={currentSong ? isLiked(currentSong) : false}
          onFavoriteToggle={handleFavoriteToggle}
          repeatMode={repeatMode}
          onToggleRepeat={handleToggleRepeat}
          shuffleEnabled={shuffleEnabled}
          onToggleShuffle={handleToggleShuffle}
          crossfadeEnabled={crossfadeEnabled}
          onToggleCrossfade={() => setCrossfadeEnabled(!crossfadeEnabled)}
          volume={volume}
          onVolumeChange={handleVolumeChange}
        />
      )}

      {/* Mini player */}
      {currentPageName !== 'ArtistDashboard' && (
        <MiniPlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onNext={handleNext}
          onPrevious={handlePrevious}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          onExpand={() => setShowRightSidebar(true)}
          onExpandMobile={() => setShowMobilePlayer(true)}
          isFavorite={currentSong ? isLiked(currentSong) : false}
          onFavoriteToggle={handleFavoriteToggle}
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          repeatMode={repeatMode}
          onToggleRepeat={handleToggleRepeat}
          crossfadeEnabled={crossfadeEnabled}
          onToggleCrossfade={() => setCrossfadeEnabled(!crossfadeEnabled)}
          shuffleEnabled={shuffleEnabled}
          onToggleShuffle={handleToggleShuffle}
          crossfadeDuration={CROSSFADE_DURATION}
        />
      )}

      {/* Mobile navigation */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-[#181818]/95 backdrop-blur-md border-t border-[#282828]">
        {currentSong && currentPageName !== 'ArtistDashboard' && <div className="h-[88px]" />}
        <div className="flex items-center justify-around py-2 px-1 pb-[env(safe-area-inset-bottom,8px)]">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link key={item.page} to={createPageUrl(item.page)} className="flex-1">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ${
                    isActive ? 'text-[#c0c0c8]' : 'text-[#B3B3B3]'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                  <span className={`text-[10px] font-medium ${isActive ? 'text-[#c0c0c8]' : 'text-[#B3B3B3]'}`}>{item.label}</span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-[#c0c0c8]" />}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}