import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, X } from 'lucide-react';

// Turns each lyric line into an absolute timestamp so the view knows which
// line is "now". Lines authored with [mm:ss] carry their own time; any gaps
// are linearly interpolated between the nearest timed lines, and a lyric with
// no timing at all falls back to an even spread across the track duration.
function computeTimes(lines, duration) {
  const n = lines.length;
  if (!n) return [];
  const raw = lines.map((l) => (typeof l.time === 'number' ? l.time : null));

  if (raw.every((t) => t === null)) {
    const dur = duration || n * 3;
    return raw.map((_, i) => (dur * i) / n);
  }

  const times = raw.slice();
  if (times[0] === null) times[0] = 0;
  if (times[n - 1] === null) {
    const lastKnown = raw.reduce((m, t) => (t != null ? Math.max(m, t) : m), 0);
    times[n - 1] = duration && duration > lastKnown ? duration : lastKnown + 3;
  }
  for (let i = 0; i < n; i++) {
    if (times[i] === null) {
      let p = i - 1;
      while (p >= 0 && times[p] === null) p--;
      let q = i + 1;
      while (q < n && times[q] === null) q++;
      const t0 = p >= 0 ? times[p] : 0;
      const t1 = q < n ? times[q] : t0 + 3;
      times[i] = t0 + (t1 - t0) * ((i - p) / (q - p));
    }
  }
  return times;
}

export default function LyricsView({ song, currentTime = 0, duration = 0, onSeek, onClose }) {
  const lines = useMemo(() => {
    const raw = Array.isArray(song?.lyrics) ? song.lyrics : [];
    // Tolerate older/plain string arrays too, not just {text,time} objects.
    return raw.map((l) => (typeof l === 'string' ? { text: l, time: null } : l)).filter((l) => l && (l.text ?? '').length >= 0);
  }, [song?.id, song?.lyrics]);

  const times = useMemo(() => computeTimes(lines, duration || song?.duration || 0), [lines, duration, song?.duration]);

  const activeIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < times.length; i++) {
      if (times[i] <= currentTime + 0.15) idx = i;
      else break;
    }
    return idx;
  }, [times, currentTime]);

  const containerRef = useRef(null);
  const lineRefs = useRef([]);
  const [userScrolling, setUserScrolling] = useState(false);
  const scrollTimer = useRef(null);

  // Keep the active line centered, but back off for a moment whenever the
  // listener scrolls by hand so we're not yanking the view away from them.
  useEffect(() => {
    if (userScrolling || activeIndex < 0) return;
    const el = lineRefs.current[activeIndex];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex, userScrolling]);

  const onManualScroll = () => {
    setUserScrolling(true);
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => setUserScrolling(false), 2500);
  };

  const hasLyrics = lines.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col bg-black/95 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Mic className="w-4 h-4 text-[#c0c0c8] flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{song?.title}</p>
            <p className="text-xs text-white/50 truncate">{song?.artist}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Fechar letra"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Lyrics */}
      {hasLyrics ? (
        <div
          ref={containerRef}
          onWheel={onManualScroll}
          onTouchMove={onManualScroll}
          className="flex-1 overflow-y-auto px-6 py-8 space-y-1"
        >
          {lines.map((line, i) => {
            const isActive = i === activeIndex;
            const isPast = i < activeIndex;
            return (
              <p
                key={i}
                ref={(el) => (lineRefs.current[i] = el)}
                onClick={() => times[i] != null && onSeek?.(times[i])}
                className={`cursor-pointer leading-snug py-1.5 transition-all duration-300 origin-left ${
                  isActive
                    ? 'text-white text-2xl font-bold scale-100'
                    : isPast
                    ? 'text-white/35 text-xl font-semibold'
                    : 'text-white/45 text-xl font-semibold hover:text-white/70'
                } ${line.text ? '' : 'h-4'}`}
              >
                {line.text || ' '}
              </p>
            );
          })}
          <div className="h-40" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
            <Mic className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/70 font-medium">Sem letra disponível</p>
          <p className="text-white/40 text-sm mt-1">Esta música ainda não tem letra publicada</p>
        </div>
      )}
    </motion.div>
  );
}
