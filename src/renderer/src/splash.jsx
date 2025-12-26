import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { motion } from 'framer-motion';
import '@renderer/assets/main.css';

// Particules pré-générées
const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  x: Math.random() * 550,
  y: Math.random() * 350,
  duration: Math.random() * 3 + 2,
  delay: Math.random() * 2,
}));

function SplashScreen() {
  const [status, setStatus] = useState('Starting...');
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('');

  useEffect(() => {
    let progressInterval;
    let mounted = true;

    // Récupérer la version
    const init = async () => {
      try {
        if (window.api?.updater?.getStatus) {
          const result = await window.api.updater.getStatus();
          if (mounted && result?.currentVersion) {
            setVersion(result.currentVersion);
          }
        }
      } catch (error) {
        console.error('[Splash] Error getting version:', error);
      }

      // Animation de progression de base
      if (mounted) {
        setProgress(10);
        progressInterval = setInterval(() => {
          if (mounted) {
            setProgress((prev) => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + Math.random() * 5;
            });
          }
        }, 300);
      }
    };

    init();

    // Écouter les événements de mise à jour - avec un délai pour s'assurer que window.api est prêt
    setTimeout(() => {
      if (!mounted || !window.api?.updater) return;

      try {
        // Checking
        if (window.api.updater.onChecking) {
          window.api.updater.onChecking(() => {
            if (mounted) {
              setStatus('Checking for updates...');
              setProgress(30);
            }
          });
        }

        // Update available
        if (window.api.updater.onUpdateAvailable) {
          window.api.updater.onUpdateAvailable((data) => {
            if (mounted) {
              setStatus(`Update v${data.version} available`);
              setProgress(100);
            }
          });
        }

        // No update
        if (window.api.updater.onUpdateNotAvailable) {
          window.api.updater.onUpdateNotAvailable(() => {
            if (mounted) {
              setStatus('Up to date');
              setProgress(100);
            }
          });
        }

        // Error
        if (window.api.updater.onError) {
          window.api.updater.onError(() => {
            if (mounted) {
              setStatus('Starting Drathos...');
              setProgress(100);
            }
          });
        }
      } catch (error) {
        console.error('[Splash] Error setting up listeners:', error);
      }
    }, 100);

    return () => {
      mounted = false;
      if (progressInterval) clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-transparent overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-[550px] h-[350px] bg-gradient-to-br from-gray-900 to-slate-900 rounded-2xl border border-blue-500/30 shadow-2xl overflow-hidden"
      >
        {/* Particules d'arrière-plan */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {PARTICLES.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: p.x, y: p.y, opacity: 0 }}
              animate={{
                y: [p.y, Math.random() * 350],
                opacity: [0, 0.4, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: 'linear',
              }}
              className="absolute w-1 h-1 bg-blue-400/50 rounded-full"
            />
          ))}
        </div>

        {/* Contenu */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-12">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 w-20 h-20"
          >
            <svg
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="url(#gradient)"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M35 50L45 60L65 40"
                stroke="url(#gradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>

          {/* Titre */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-5xl font-black mb-2 bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent"
          >
            Drathos
          </motion.h1>

          {/* Version */}
          {version && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-gray-400 mb-10"
            >
              v{version}
            </motion.p>
          )}

          {/* Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3 mb-6"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full"
            />
            <span className="text-sm text-gray-300">{status}</span>
          </motion.div>

          {/* Barre de progression */}
          <div className="w-full max-w-xs">
            <div className="h-1 bg-gray-800/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}
              />
            </div>
            <div className="text-xs text-gray-500 text-center mt-2">
              {Math.round(progress)}%
            </div>
          </div>
        </div>

        {/* Glow en bas */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none" />
      </motion.div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SplashScreen />);
