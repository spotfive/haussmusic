import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, X, ChevronLeft, ChevronRight, ListMusic, Check, Loader2, Music2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// One collection per label — its name, its logo, and every song it manages
// (published directly by the label, or by an artist the label manages).
// No AI involved: this is a straightforward group-by over data the app
// already has.

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed % 233280 || 1;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTotal(songs) {
  const secs = songs.reduce((a, s) => a + (s.duration || 0), 0);
  const m = Math.round(secs / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`;
}

// The label's own logo when it has one; otherwise a mosaic of its songs'
// art under the HAUSS silver/black wash, same treatment used elsewhere so
// a label without a logo still reads as part of the same system.
function PlaylistCover({ label, songs, rounded = 'rounded-2xl' }) {
  if (label.profile_picture) {
    return (
      <div className={`absolute inset-0 ${rounded} overflow-hidden bg-[#18181b]`}>
        <img src={label.profile_picture} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/5" />
      </div>
    );
  }

  const covers = songs.map((s) => s.cover_url).filter(Boolean).slice(0, 4);
  return (
    <div className={`absolute inset-0 ${rounded} overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#334155] to-[#0b1026]" />
      {covers.length > 0 ? (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative overflow-hidden">
              {covers[i % covers.length] && (
                <img src={covers[i % covers.length]} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Music2 className="w-10 h-10 text-white/20" />
        </div>
      )}
      <div className="absolute inset-0 mix-blend-soft-light opacity-80 bg-gradient-to-br from-[#334155] to-[#0b1026]" />
      <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(120% 80% at 20% 0%, rgba(224,224,232,0.35) 0%, transparent 45%)' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
    </div>
  );
}

export default function MoodPlaylists({ songs = [], onPlaySong, userEmail }) {
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const [active, setActive] = useState(null); // opened playlist modal
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState([]);

  const { data: labels = [] } = useQuery({
    queryKey: ['labels'],
    queryFn: () => base44.entities.Label.list('-created_date', 100),
    staleTime: 60000,
  });

  const playlists = useMemo(() => {
    return labels
      .map((label) => {
        const managed = new Set(label.managed_artists || []);
        const labelSongs = songs.filter((s) => s.label_id === label.id || (s.artist_id && managed.has(s.artist_id)));
        return { id: label.id, label, songs: labelSongs };
      })
      .filter((pl) => pl.songs.length >= 1);
  }, [labels, songs]);

  // Vertical mouse wheel scrolls this row horizontally. Attached natively so it
  // can preventDefault (React's onWheel is passive). At either end we let the
  // wheel fall through so the page keeps scrolling instead of feeling stuck.
  // Momentum is eased by hand in a rAF loop against a `target` value, rather
  // than writing straight to scrollLeft under the container's CSS
  // scroll-behavior: smooth — modern browsers apply that smoothing to direct
  // scrollLeft writes too, so a burst of wheel ticks was queuing/cancelling
  // overlapping smooth-scroll animations against each other and making fast
  // scrolling feel like it had stopped responding.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let target = el.scrollLeft;
    let raf = null;

    const step = () => {
      const current = el.scrollLeft;
      const diff = target - current;
      if (Math.abs(diff) < 0.5) {
        el.scrollLeft = target;
        raf = null;
        return;
      }
      el.scrollLeft = current + diff * 0.22;
      raf = requestAnimationFrame(step);
    };

    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if ((e.deltaY < 0 && target <= 0) || (e.deltaY > 0 && target >= max - 1)) return;
      e.preventDefault();
      target = Math.max(0, Math.min(max, target + e.deltaY));
      if (raf == null) raf = requestAnimationFrame(step);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [playlists.length]);

  const nudge = (dir) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  const playPlaylist = (pl) => {
    const order = seededShuffle(pl.songs, pl.id.length * 7919);
    if (order[0]) onPlaySong?.(order[0]);
    toast(`Tocando ${pl.label.name}`);
  };

  const savePlaylist = async (pl) => {
    if (!userEmail) { toast.error('Entre para salvar playlists'); return; }
    setSaving(true);
    try {
      await base44.entities.Playlist.create({
        name: pl.label.name,
        description: `Lançamentos de ${pl.label.name}`,
        song_ids: pl.songs.map((s) => s.id),
        cover_url: pl.label.profile_picture || '',
      });
      setSavedIds((ids) => [...ids, pl.id]);
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success(`"${pl.label.name}" salva na sua biblioteca`);
    } catch {
      toast.error('Erro ao salvar playlist');
    }
    setSaving(false);
  };

  if (playlists.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-white">Por Gravadora</h2>
          <p className="text-xs text-[#B3B3B3] mt-0.5">As músicas de cada gravadora do acervo HAUSS</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <button onClick={() => nudge(-1)} className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => nudge(1)} className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Edge-fade mask makes cards dissolve as they scroll past either side */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pt-1 pb-4 -mx-1 px-1 scrollbar-hide"
        style={{ WebkitMaskImage: 'linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%)', maskImage: 'linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%)' }}
      >
        {playlists.map((pl, i) => (
          <motion.button
            key={pl.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 6) * 0.05, type: 'spring', damping: 20, stiffness: 220 }}
            whileHover={{ y: -6, scale: 1.03, transition: { type: 'spring', damping: 18, stiffness: 260 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActive(pl)}
            className="group relative shrink-0 w-40 sm:w-44 lg:w-52 aspect-square rounded-[20px] overflow-hidden ring-1 ring-white/[0.08] text-left transition-shadow duration-300 hover:ring-white/20 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]"
          >
            <PlaylistCover label={pl.label} songs={pl.songs} />
            {/* soft top sheen that brightens on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.16), transparent 40%)' }} />
            <div className="absolute inset-x-0 bottom-0 p-3.5">
              <h3 className="text-white font-extrabold text-base sm:text-lg leading-tight drop-shadow-lg">{pl.label.name}</h3>
              <p className="text-white/70 text-[11px] leading-snug mt-0.5 truncate">{pl.songs.length} {pl.songs.length === 1 ? 'música' : 'músicas'}</p>
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/35 backdrop-blur-md ring-1 ring-white/10">
              <span className="text-[9px] font-bold tracking-[0.15em] text-[#e5e5ea]">HAUSS</span>
            </div>
            {/* Play affordance on hover */}
            <div
              className="absolute bottom-3.5 right-3.5 w-11 h-11 rounded-full bg-[#c0c0c8] flex items-center justify-center shadow-xl shadow-black/40 opacity-0 translate-y-3 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-300 ease-out hover:bg-[#d4d4dc]"
              onClick={(e) => { e.stopPropagation(); playPlaylist(pl); }}
              role="button"
            >
              <Play className="w-5 h-5 text-black fill-black ml-0.5" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Detail modal — full playlist, escapes the masked row via fixed positioning */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full sm:max-w-lg max-h-[88vh] bg-[#121212] rounded-t-3xl sm:rounded-3xl border border-white/[0.08] overflow-hidden flex flex-col"
            >
              {/* Header with the big cover */}
              <div className="relative h-44 flex-shrink-0">
                <PlaylistCover label={active.label} songs={active.songs} rounded="rounded-none" />
                <button onClick={() => setActive(null)} className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 inset-x-0 p-5">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm w-fit mb-2">
                    <span className="text-[9px] font-bold tracking-wider text-[#e5e5ea]">GRAVADORA</span>
                  </div>
                  <h2 className="text-2xl font-black text-white drop-shadow-lg">{active.label.name}</h2>
                  <p className="text-white/70 text-sm">{active.songs.length} músicas · {formatTotal(active.songs)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
                <button
                  onClick={() => playPlaylist(active)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#c0c0c8] hover:bg-[#d4d4dc] text-black font-bold text-sm transition-colors"
                >
                  <Play className="w-4 h-4 fill-black" /> Reproduzir
                </button>
                <button
                  onClick={() => savePlaylist(active)}
                  disabled={saving || savedIds.includes(active.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 text-white text-sm font-medium hover:bg-white/[0.06] transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedIds.includes(active.id) ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
                  {savedIds.includes(active.id) ? 'Salva' : 'Salvar'}
                </button>
              </div>

              {/* Song list */}
              <div className="overflow-y-auto flex-1 p-2">
                {active.songs.map((song, idx) => (
                  <button
                    key={song.id}
                    onClick={() => { onPlaySong?.(song); }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.05] transition-colors text-left group/row"
                  >
                    <span className="w-5 text-center text-xs text-[#B3B3B3]">{idx + 1}</span>
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-[#282828] shrink-0">
                      {song.cover_url ? (
                        <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#c0c0c8]/25 to-[#18181b]">
                          <ListMusic className="w-4 h-4 text-[#535353]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{song.title}</p>
                      <p className="text-xs text-[#B3B3B3] truncate">{song.artist}</p>
                    </div>
                    <Play className="w-4 h-4 text-white/0 group-hover/row:text-white/60 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
