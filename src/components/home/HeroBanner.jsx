import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Calendar } from 'lucide-react';

export default function HeroBanner({ banners }) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden mb-8">
      {/* Glowing border */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none z-50" style={{
        boxShadow: 'inset 0 0 0 1px rgba(200,200,210,0.2), 0 0 40px rgba(200,200,210,0.1)'
      }} />
      
      {/* Immersive background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-800/20 to-transparent z-10" />
          <motion.img
            src={currentBanner.image_url}
            alt={currentBanner.title}
            className="w-full h-full object-cover"
            animate={{ scale: [1, 1.05] }}
            transition={{ duration: 10, ease: "linear" }}
          />
          
          {/* Scan lines effect */}
          <div className="absolute inset-0 z-10 opacity-10 pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(200,200,210,0.3) 2px, rgba(200,200,210,0.3) 4px)'
          }} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-30 h-full flex flex-col justify-end p-8 lg:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 bg-gradient-to-r from-zinc-500/30 to-neutral-500/30 border border-zinc-400/30 backdrop-blur-xl"
              style={{
                boxShadow: '0 0 20px rgba(200,200,210,0.3)'
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-zinc-300"
              />
              <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Novo Lançamento</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl lg:text-6xl font-black text-white mb-3 leading-tight"
              style={{
                textShadow: '0 2px 40px rgba(0,0,0,0.8), 0 0 30px rgba(200,200,210,0.3)'
              }}
            >
              {currentBanner.title}
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-zinc-300 mb-4 font-medium"
            >
              {currentBanner.artist_name}
            </motion.p>

            {currentBanner.description && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-zinc-400 mb-6 max-w-xl"
              >
                {currentBanner.description}
              </motion.p>
            )}

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(200,200,210,0.5)' }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-8 py-3.5 rounded-full font-bold text-white overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(200,200,210,0.9), rgba(210,210,218,0.9))',
                boxShadow: '0 8px 24px rgba(200,200,210,0.4)'
              }}
            >
              <motion.div
                className="absolute inset-0"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
                }}
              />
              <span className="relative flex items-center gap-2">
                <Play className="w-5 h-5 fill-current" />
                Ouvir Agora
              </span>
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1 rounded-full transition-all ${
                  i === currentIndex ? 'w-6 bg-white' : 'w-1 bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}