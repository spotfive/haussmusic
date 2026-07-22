import React from 'react';
import { motion } from 'framer-motion';
import { X, Award } from 'lucide-react';

export default function CreditsView({ song, credits, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col bg-black/95 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Award className="w-4 h-4 text-[#c0c0c8] flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{song?.title}</p>
            <p className="text-xs text-white/50 truncate">{song?.artist}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Fechar créditos"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {credits.map((c, i) => (
          <div key={i} className="pb-4 border-b border-white/[0.06] last:border-0">
            <p className="text-base font-semibold text-white leading-tight">{c.title || '—'}</p>
            {c.description && <p className="text-sm text-[#B3B3B3] mt-1">{c.description}</p>}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
