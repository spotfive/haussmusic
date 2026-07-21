import React from 'react';
import { motion } from 'framer-motion';

export default function AudioVisualizer({ isPlaying }) {
  const bars = 32;
  
  return (
    <div className="flex items-end justify-center gap-1 h-20 px-4">
      {[...Array(bars)].map((_, i) => {
        const delay = i * 0.05;
        const baseHeight = Math.sin(i * 0.3) * 20 + 30;
        
        return (
          <motion.div
            key={i}
            className="w-1.5 rounded-full"
            style={{
              background: `linear-gradient(to top, 
                rgba(139,92,246,0.8) 0%, 
                rgba(192,132,252,0.9) 50%, 
                rgba(226,232,240,0.7) 100%)`
            }}
            animate={{
              height: isPlaying 
                ? [baseHeight, baseHeight + Math.random() * 40, baseHeight]
                : 8,
              opacity: isPlaying ? 1 : 0.3
            }}
            transition={{
              duration: 0.4 + Math.random() * 0.3,
              repeat: Infinity,
              delay: delay,
              ease: "easeInOut"
            }}
          />
        );
      })}
    </div>
  );
}