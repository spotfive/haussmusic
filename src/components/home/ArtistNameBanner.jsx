import React from 'react';

// Fallback "banner" shown wherever an artist hasn't uploaded a real profile
// banner: their name, in a glossy black display font, over a soft shaded
// white background.
export default function ArtistNameBanner({ name, className = '' }) {
  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f2f2f5 45%, #dcdce2 100%)' }}
    >
      {/* soft shading toward the edges */}
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.08), inset 0 0 120px rgba(0,0,0,0.16)' }} />
      <h2
        className="relative text-3xl lg:text-5xl font-bold tracking-wide px-6 text-center leading-tight"
        style={{
          fontFamily: "'Playfair Display', serif",
          background: 'linear-gradient(180deg, #060606 0%, #2e2e2e 45%, #000000 55%, #1b1b1b 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5)) drop-shadow(0 2px 8px rgba(0,0,0,0.2))',
        }}
      >
        {name}
      </h2>
    </div>
  );
}
