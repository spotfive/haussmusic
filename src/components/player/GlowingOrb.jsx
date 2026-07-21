import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function GlowingOrb({ isPlaying, coverUrl }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      const rect = document.getElementById('orb-container')?.getBoundingClientRect();
      if (rect) {
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 20,
          y: ((e.clientY - rect.top) / rect.height - 0.5) * 20
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div id="orb-container" className="relative w-80 h-80 flex items-center justify-center" style={{ perspective: '1000px' }}>
      {/* Multiple layered glow rings for depth */}
      <motion.div
        animate={{
          scale: isPlaying ? [1, 1.3, 1] : 1,
          opacity: isPlaying ? [0.4, 0.7, 0.4] : 0.3
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-full h-full rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(200,200,210,0.6) 0%, rgba(210,210,218,0.4) 30%, transparent 70%)',
          filter: 'blur(50px)'
        }}
      />
      
      <motion.div
        animate={{
          scale: isPlaying ? [1.1, 1.4, 1.1] : 1.1,
          opacity: isPlaying ? [0.3, 0.5, 0.3] : 0.2,
          rotate: [0, 180, 360]
        }}
        transition={{ 
          scale: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" }
        }}
        className="absolute w-[130%] h-[130%] rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, rgba(210,210,218,0.3), transparent, rgba(200,200,210,0.3), transparent)',
          filter: 'blur(60px)'
        }}
      />

      <motion.div
        animate={{
          scale: isPlaying ? [1.05, 1.25, 1.05] : 1.05,
          opacity: isPlaying ? [0.2, 0.4, 0.2] : 0.1
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute w-[140%] h-[140%] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(150,150,160,0.2) 0%, transparent 50%)',
          filter: 'blur(80px)'
        }}
      />

      {/* 3D Metallic rings with multiple layers */}
      <motion.div
        animate={{
          rotateZ: isPlaying ? 360 : 0,
          rotateX: mousePos.y,
          rotateY: mousePos.x
        }}
        transition={{
          rotateZ: { duration: 15, repeat: Infinity, ease: "linear" },
          rotateX: { duration: 0.3 },
          rotateY: { duration: 0.3 }
        }}
        className="absolute w-[340px] h-[340px] rounded-full"
        style={{
          transformStyle: 'preserve-3d',
          border: '3px solid transparent',
          backgroundImage: 'linear-gradient(#09090b, #09090b), linear-gradient(135deg, rgba(192,192,192,0.4), rgba(200,200,210,0.6), rgba(192,192,192,0.4))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: `
            0 0 30px rgba(192,192,192,0.3),
            inset 0 0 30px rgba(200,200,210,0.2),
            0 0 60px rgba(200,200,210,0.4)
          `
        }}
      />

      <motion.div
        animate={{
          rotateZ: isPlaying ? -360 : 0,
          rotateX: -mousePos.y * 0.8,
          rotateY: mousePos.x * 0.8
        }}
        transition={{
          rotateZ: { duration: 20, repeat: Infinity, ease: "linear" },
          rotateX: { duration: 0.3 },
          rotateY: { duration: 0.3 }
        }}
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          transformStyle: 'preserve-3d',
          border: '2px solid transparent',
          backgroundImage: 'linear-gradient(#09090b, #09090b), linear-gradient(45deg, rgba(150,150,160,0.4), transparent, rgba(200,200,210,0.5), transparent)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: '0 0 40px rgba(150,150,160,0.3), inset 0 0 20px rgba(200,200,210,0.1)'
        }}
      />

      {/* Animated neon rings */}
      <motion.div
        animate={{
          rotateZ: isPlaying ? 360 : 0,
          scale: isPlaying ? [1, 1.05, 1] : 1
        }}
        transition={{ 
          rotateZ: { duration: 12, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute w-64 h-64 rounded-full"
        style={{
          background: `
            conic-gradient(from 0deg, 
              transparent, 
              rgba(200,200,210,0.6), 
              transparent 25%, 
              rgba(210,210,218,0.6) 50%, 
              transparent 75%, 
              rgba(150,150,160,0.6),
              transparent
            )
          `,
          filter: 'blur(2px)'
        }}
      />

      {/* Main album art container with glass effect */}
      <motion.div
        animate={{
          rotateY: mousePos.x * 0.5,
          rotateX: -mousePos.y * 0.5,
          scale: isPlaying ? 1 : 0.95
        }}
        transition={{ duration: 0.3 }}
        className="relative w-56 h-56 rounded-full overflow-hidden"
        style={{
          transformStyle: 'preserve-3d',
          boxShadow: `
            0 0 60px rgba(200,200,210,0.7),
            0 0 100px rgba(200,200,210,0.5),
            0 20px 60px rgba(0,0,0,0.6),
            inset 0 0 60px rgba(0,0,0,0.5),
            inset 0 0 30px rgba(200,200,210,0.3)
          `,
          border: '2px solid rgba(192,192,192,0.2)'
        }}
      >
        {/* Glass reflection overlay */}
        <div className="absolute inset-0 pointer-events-none z-10" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)'
        }} />
        {coverUrl ? (
          <motion.img
            src={coverUrl}
            alt="Album cover"
            className="w-full h-full object-cover"
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900 flex items-center justify-center">
            <motion.div
              animate={{
                scale: isPlaying ? [1, 1.2, 1] : 1
              }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-6xl"
            >
              🎵
            </motion.div>
          </div>
        )}
        
        {/* Vinyl record center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-900 to-black border-4 border-zinc-800 shadow-inner">
            <div className="w-full h-full rounded-full flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-silver/50 to-zinc-600" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced 3D floating particles */}
      {isPlaying && [...Array(16)].map((_, i) => {
        const angle = (i * 22.5 * Math.PI) / 180;
        const radius = 150 + (i % 3) * 30;
        const colors = ['rgba(200,200,210,0.8)', 'rgba(210,210,218,0.8)', 'rgba(150,150,160,0.6)', 'rgba(192,192,192,0.7)'];
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            initial={{ 
              x: 0, 
              y: 0, 
              opacity: 0,
              scale: 0,
              z: 0
            }}
            animate={{
              x: [0, Math.cos(angle) * radius, Math.cos(angle) * (radius + 20)],
              y: [0, Math.sin(angle) * radius, Math.sin(angle) * (radius + 20)],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              z: [0, 50, 100]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeOut"
            }}
            style={{
              width: i % 2 === 0 ? '8px' : '4px',
              height: i % 2 === 0 ? '8px' : '4px',
              background: colors[i % 4],
              filter: 'blur(1px)',
              boxShadow: `0 0 20px ${colors[i % 4]}`,
              transformStyle: 'preserve-3d'
            }}
          />
        );
      })}
      
      {/* Orbiting energy particles */}
      {isPlaying && [...Array(6)].map((_, i) => (
        <motion.div
          key={`orbit-${i}`}
          className="absolute w-3 h-3"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.3, 1]
          }}
          transition={{
            rotate: { duration: 8 - i * 0.5, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }
          }}
          style={{
            left: '50%',
            top: '50%',
            marginLeft: -6,
            marginTop: -6 + (120 + i * 20)
          }}
        >
          <div 
            className="w-full h-full rounded-full"
            style={{
              background: i % 2 === 0 ? 'rgba(200,200,210,0.9)' : 'rgba(192,192,192,0.8)',
              boxShadow: `0 0 15px ${i % 2 === 0 ? 'rgba(200,200,210,1)' : 'rgba(192,192,192,1)'}`
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}