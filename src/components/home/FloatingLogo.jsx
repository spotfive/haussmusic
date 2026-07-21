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
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694d5d3ac5830688f08c9355/ae27efd7d_Gemini_Generated_Image_5yxuzp5yxuzp5yxu-removebg-preview.png"
            alt="Atlantix"
            className="w-full h-full object-contain opacity-90"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}