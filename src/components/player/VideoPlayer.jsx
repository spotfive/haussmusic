import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2 } from 'lucide-react';

export default function VideoPlayer({ song, isPlaying, onClose, onExpand }) {
  const videoRef = useRef(null);

  if (!song?.background_video_url) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        className="fixed right-4 bottom-32 w-80 h-60 z-40 rounded-2xl overflow-hidden shadow-2xl bg-black"
      >
        <video
          ref={videoRef}
          src={song.background_video_url}
          loop
          muted
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onExpand}
            className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-colors"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </motion.button>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white text-sm font-medium truncate">{song.title}</p>
          <p className="text-zinc-400 text-xs truncate">{song.artist}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}