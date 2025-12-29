import React, { useState, useEffect } from "react";
import { FiMinus, FiMaximize, FiMinimize, FiX } from "react-icons/fi";
import { motion } from "framer-motion";
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
      className="relative flex items-center justify-between h-9 select-none overflow-hidden"
      style={{
        WebkitAppRegion: 'drag',
        backgroundColor: 'var(--app-backgroundSecondary)',
        borderBottom: '1px solid var(--app-border)',
      }}
    >
      {/* Gradient overlay pour effet glassmorphism */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: 'var(--app-gradient-primary)',
          mixBlendMode: 'soft-light',
        }}
      />

      {/* Blur backdrop */}
      <div className="absolute inset-0 backdrop-blur-xl bg-black/10" />

      {/* Draggable Area */}
      <div className="relative flex items-center gap-3 px-4 flex-1 h-full z-10">
      </div>

      {/* Connection Indicator */}
      <div className="relative z-10 mr-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <ConnectionIndicator />
      </div>

      {/* Control Buttons */}
      <div className="relative flex h-full z-10" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Minimize */}
        <motion.button
          whileHover={{ opacity: 0.8 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMinimize}
          className="group w-12 h-full flex items-center justify-center transition-all duration-200 hover:bg-surface"
          aria-label="Minimize"
        >
          <FiMinus
            className="transition-all duration-200"
            style={{ color: 'var(--app-textSecondary)' }}
            size={16}
          />
        </motion.button>

        {/* Maximize/Restore */}
        <motion.button
          whileHover={{ opacity: 0.8 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMaximize}
          className="group w-12 h-full flex items-center justify-center transition-all duration-200 hover:bg-surface"
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <FiMinimize
              className="transition-all duration-200"
              style={{ color: 'var(--app-textSecondary)' }}
              size={14}
            />
          ) : (
            <FiMaximize
              className="transition-all duration-200"
              style={{ color: 'var(--app-textSecondary)' }}
              size={14}
            />
          )}
        </motion.button>

        {/* Close */}
        <motion.button
          whileHover={{
            backgroundColor: 'var(--app-error)',
          }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClose}
          className="group w-12 h-full flex items-center justify-center transition-all duration-200"
          aria-label="Close"
        >
          <FiX
            className="transition-all duration-200"
            style={{ color: 'var(--app-textSecondary)' }}
            size={18}
          />
        </motion.button>
      </div>
    </div>
  );
};

export default TitleBar;
