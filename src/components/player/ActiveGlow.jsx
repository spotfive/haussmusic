import React from 'react';
import { motion } from 'framer-motion';

// Soft pulsing "LED" halo shown behind a player button while it's toggled
// on (crossfade, repeat, shuffle, favorite) — sits behind the icon via
// `relative` + `z-10` on the icon, so the button itself needs `relative`.
export default function ActiveGlow({ rounded = 'rounded-full' }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.35, 0.75, 0.35] }}
      exit={{ opacity: 0 }}
      transition={{ opacity: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } }}
      className={`absolute inset-0 ${rounded} bg-[#c0c0c8] blur-md pointer-events-none`}
    />
  );
}
