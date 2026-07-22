import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ROTATE_MS = 7000;

// Rotates through whatever hero slides are handed to it (the "Mais Ouvidas"
// song card, plus one per active admin banner) — sliding one out and the
// next one in, auto-advancing, with dots/arrows for manual control.
export default function HomeHeroCarousel({ slides }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[index] || slides[0];

  return (
    <div className="group relative rounded-2xl overflow-hidden mb-6" style={{ height: '280px' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.key}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          {slide.render()}
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-40 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-40 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            title="Próximo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setIndex(i)}
                className={`h-1 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'}`}
                title={s.key}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
