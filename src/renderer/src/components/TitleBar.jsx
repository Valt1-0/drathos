import React, { useState, useEffect } from "react";
import { FiMinus, FiMaximize, FiMinimize, FiX } from "react-icons/fi";
import { FaGamepad } from "react-icons/fa6";
import ConnectionIndicator from "./ConnectionIndicator";

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial state
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
      {/* Logo and Title - Draggable Area */}
      <div className="flex items-center gap-2 px-4 flex-1 h-full">
        <span className="text-xs font-semibold text-slate-300">Drathos</span>
      </div>

      {/* Connection Indicator */}
      <div className="mr-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <ConnectionIndicator />
      </div>

      {/* Control Buttons */}
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="group w-12 h-full flex items-center justify-center hover:bg-slate-800 transition-colors"
          aria-label="Minimize"
        >
          <FiMinus className="text-slate-400 group-hover:text-white transition-colors" size={16} />
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          className="group w-12 h-full flex items-center justify-center hover:bg-slate-800 transition-colors"
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <FiMinimize className="text-slate-400 group-hover:text-white transition-colors" size={14} />
          ) : (
            <FiMaximize className="text-slate-400 group-hover:text-white transition-colors" size={14} />
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="group w-12 h-full flex items-center justify-center hover:bg-red-600 transition-colors"
          aria-label="Close"
        >
          <FiX className="text-slate-400 group-hover:text-white transition-colors" size={18} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
