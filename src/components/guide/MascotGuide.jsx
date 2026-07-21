import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tours = {
  home: [
    {
      title: "Bem-vindo ao HAUSS MUSIC! 🎵",
      message: "Olá! Eu sou o Atty, seu guia musical. Vou te mostrar como navegar pela plataforma!",
      position: 'center'
    },
    {
      title: "Explore as Músicas",
      message: "Aqui você encontra as músicas mais tocadas. Clique em qualquer uma para começar a ouvir!",
      position: 'bottom-left'
    },
    {
      title: "Monte suas Playlists",
      message: "Crie suas próprias playlists e organize suas músicas favoritas do seu jeito!",
      position: 'top-left'
    }
  ],
  library: [
    {
      title: "Sua Biblioteca Pessoal 📚",
      message: "Aqui ficam todas as suas músicas curtidas e playlists criadas!",
      position: 'center'
    },
    {
      title: "Edite seu Perfil",
      message: "Personalize seu perfil com foto e informações na aba 'Editar Perfil'.",
      position: 'top-right'
    }
  ],
  search: [
    {
      title: "Busca Inteligente 🔍",
      message: "Procure por músicas, artistas ou álbuns. Use os filtros de gênero para refinar sua busca!",
      position: 'top-center'
    }
  ],
  artists: [
    {
      title: "Lançamentos dos Artistas 🎤",
      message: "Fique por dentro dos últimos lançamentos e novidades dos seus artistas favoritos!",
      position: 'center'
    }
  ]
};

export default function MascotGuide({ page }) {
  const [showGuide, setShowGuide] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hauss_guide_completed');
    if (!hasSeenGuide && page === 'home') {
      setTimeout(() => setShowGuide(true), 1000);
    }
  }, [page]);

  const tourSteps = tours[page] || tours.home;
  const currentTour = tourSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setShowGuide(false);
    setDismissed(true);
    localStorage.setItem('hauss_guide_completed', 'true');
  };

  const positionClasses = {
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'bottom-left': 'bottom-24 left-8',
    'top-left': 'top-24 left-8',
    'top-right': 'top-24 right-8',
    'top-center': 'top-24 left-1/2 -translate-x-1/2'
  };

  return (
    <>
      {/* Mascot button - always visible */}
      <AnimatePresence>
        {!showGuide && !dismissed && (
          <motion.button
            initial={{ scale: 0, rotate: -180 }}
            animate={{ 
              scale: 1, 
              rotate: 0,
              y: [0, -10, 0]
            }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{
              y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={() => {
              setCurrentStep(0);
              setShowGuide(true);
            }}
            className="fixed bottom-24 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-zinc-400 via-zinc-400 to-neutral-400 shadow-2xl shadow-zinc-400/50 flex items-center justify-center group"
            style={{
              boxShadow: '0 0 40px rgba(200,200,210,0.6), inset 0 0 20px rgba(255,255,255,0.3)'
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)'
              }}
            />
            <Sparkles className="w-7 h-7 text-white relative z-10 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Guide overlay */}
      <AnimatePresence>
        {showGuide && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={handleDismiss}
            />
            
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className={`fixed ${positionClasses[currentTour.position]} z-50 max-w-md`}
            >
              <div className="relative">
                {/* Mascot character */}
                <motion.div
                  animate={{
                    rotate: [-5, 5, -5],
                    y: [0, -5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-16 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-zinc-500 flex items-center justify-center"
                  style={{
                    boxShadow: '0 10px 40px rgba(59,130,246,0.6), inset 0 0 20px rgba(255,255,255,0.3)'
                  }}
                >
                  <div className="text-4xl">🎵</div>
                  
                  {/* Sparkles around mascot */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [0, 1, 0],
                        rotate: [0, 180, 360],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.7
                      }}
                      className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                      style={{
                        top: `${20 + i * 20}%`,
                        left: `${80 + i * 10}%`
                      }}
                    />
                  ))}
                </motion.div>

                {/* Guide card */}
                <div className="mt-12 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-3xl p-6 border border-zinc-400/30 shadow-2xl">
                  <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-zinc-400" />
                  </button>

                  <h3 className="text-xl font-bold text-white mb-3 pr-8">
                    {currentTour.title}
                  </h3>
                  <p className="text-zinc-300 mb-6 leading-relaxed">
                    {currentTour.message}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {tourSteps.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 rounded-full transition-all ${
                            i === currentStep 
                              ? 'w-8 bg-gradient-to-r from-zinc-400 to-neutral-400' 
                              : 'w-1.5 bg-zinc-700'
                          }`}
                        />
                      ))}
                    </div>

                    <Button onClick={handleNext}>
                      {currentStep < tourSteps.length - 1 ? (
                        <>
                          Próximo
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      ) : (
                        'Entendi!'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Floating particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [-20, -60],
                        x: [0, Math.random() * 40 - 20],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.6
                      }}
                      className="absolute w-1 h-1 bg-zinc-300 rounded-full"
                      style={{
                        left: `${20 + i * 15}%`,
                        bottom: '10%'
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}