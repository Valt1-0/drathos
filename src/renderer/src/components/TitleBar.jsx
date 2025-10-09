import React, { useState, useEffect } from "react";
import { FiMinus, FiMaximize, FiMinimize, FiX } from "react-icons/fi";
import { FaGamepad } from "react-icons/fa6";

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Vérifier l'état initial
    window.api.windowIsMaximized().then(setIsMaximized);
  }, []);

  const handleMinimize = () => {
    window.api.windowMinimize();
  };

  const handleMaximize = () => {
    window.api.windowMaximize();
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    window.api.windowClose();
  };

  return (
    <div
      className="flex items-center justify-between h-8 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800/50 select-none"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Logo et titre - zone draggable */}
      <div className="flex items-center gap-2 px-4 flex-1 h-full">
        <span className="text-xs font-semibold text-slate-300">Drathos</span>
      </div>

      {/* Boutons de contrôle */}
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Minimiser */}
        <button
          onClick={handleMinimize}
          className="group w-12 h-full flex items-center justify-center hover:bg-slate-800 transition-colors"
          aria-label="Minimiser"
        >
          <FiMinus className="text-slate-400 group-hover:text-white transition-colors" size={16} />
        </button>

        {/* Agrandir/Restaurer */}
        <button
          onClick={handleMaximize}
          className="group w-12 h-full flex items-center justify-center hover:bg-slate-800 transition-colors"
          aria-label={isMaximized ? "Restaurer" : "Agrandir"}
        >
          {isMaximized ? (
            <FiMinimize className="text-slate-400 group-hover:text-white transition-colors" size={14} />
          ) : (
            <FiMaximize className="text-slate-400 group-hover:text-white transition-colors" size={14} />
          )}
        </button>

        {/* Fermer */}
        <button
          onClick={handleClose}
          className="group w-12 h-full flex items-center justify-center hover:bg-red-600 transition-colors"
          aria-label="Fermer"
        >
          <FiX className="text-slate-400 group-hover:text-white transition-colors" size={18} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
