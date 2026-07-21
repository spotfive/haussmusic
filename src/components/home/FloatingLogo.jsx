import React from 'react';
import { motion } from 'framer-motion';

export default function FloatingLogo() {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 lg:left-auto lg:right-6 lg:translate-x-0">
      <motion.div
        animate={{
          y: [0, -8, 0]
        }}
        transition={{
          y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        <motion.div
          className="relative w-16 h-16"
          whileHover={{ scale: 1.05 }}
        >

          {/* Simple clean logo */}
          <img
            src="/logo.png"
            alt="HAUSS MUSIC"
            className="w-full h-full object-contain opacity-90"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}