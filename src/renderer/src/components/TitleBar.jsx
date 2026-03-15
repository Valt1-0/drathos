import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FiMinus, FiMaximize, FiMinimize, FiX } from "react-icons/fi";

const BTN_BASE = {
  width: 48,
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'default',
  transition: 'background 150ms ease',
  border: 'none',
  outline: 'none',
  background: 'transparent',
};

const TitleBar = () => {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);
  const [hovered, setHovered] = useState(null); // 'min' | 'max' | 'close'

  useEffect(() => {
    window.api.windowIsMaximized().then(setIsMaximized);
  }, []);

  const handleMaximize = useCallback(() => {
    window.api.windowMaximize();
    setIsMaximized(p => !p);
  }, []);

  const getButtonStyle = (key) => {
    if (key === 'close' && hovered === 'close') {
      return { ...BTN_BASE, background: '#e81123' };
    }
    if (hovered === key) {
      return { ...BTN_BASE, background: 'var(--app-surface)' };
    }
    return BTN_BASE;
  };

  const getIconColor = (key) => {
    if (key === 'close' && hovered === 'close') return '#ffffff';
    return hovered === key ? 'var(--app-text)' : 'var(--app-textSecondary)';
  };

  return (
    <div
      className="relative flex items-center justify-between h-9 select-none"
      style={{
        WebkitAppRegion: 'drag',
        backgroundColor: 'var(--app-backgroundSecondary)',
        borderBottom: '1px solid var(--app-border)',
      }}
    >
      {/* Draggable area */}
      <div className="flex-1 h-full" />

      {/* Control buttons */}
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Minimize */}
        <button
          onClick={() => window.api.windowMinimize()}
          onMouseEnter={() => setHovered('min')}
          onMouseLeave={() => setHovered(null)}
          style={getButtonStyle('min')}
          aria-label={t('common.minimize')}
        >
          <FiMinus size={16} style={{ color: getIconColor('min') }} />
        </button>

        {/* Maximize / Restore */}
        <button
          onClick={handleMaximize}
          onMouseEnter={() => setHovered('max')}
          onMouseLeave={() => setHovered(null)}
          style={getButtonStyle('max')}
          aria-label={isMaximized ? t('common.restore') : t('common.maximize')}
        >
          {isMaximized
            ? <FiMinimize size={13} style={{ color: getIconColor('max') }} />
            : <FiMaximize size={13} style={{ color: getIconColor('max') }} />
          }
        </button>

        {/* Close */}
        <button
          onClick={() => window.api.windowClose()}
          onMouseEnter={() => setHovered('close')}
          onMouseLeave={() => setHovered(null)}
          style={getButtonStyle('close')}
          aria-label={t('common.close')}
        >
          <FiX size={17} style={{ color: getIconColor('close'), transition: 'color 150ms ease' }} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
