import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { applyTheme, getThemeById, isLightTheme as checkIsLightTheme } from '../config/themes';
import logger from '../services/logger';
import { storeGet, storeSet } from '../utils/storeClient';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [theme, setTheme] = useState(null);

  // Change theme
  const changeTheme = useCallback((themeId) => {
    logger.info('[ThemeContext] Changing theme to:', themeId);
    const newTheme = applyTheme(themeId);
    setCurrentTheme(themeId);
    setTheme(newTheme);

    // Save the selection
    storeSet('selectedTheme', themeId);
  }, []);

  // Load the saved theme on startup
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await storeGet('selectedTheme');
        logger.info('[ThemeContext] Loaded saved theme:', savedTheme);
        if (savedTheme) {
          changeTheme(savedTheme);
        } else {
          changeTheme('default');
        }
      } catch (error) {
        logger.error('[ThemeContext] Error loading saved theme:', error);
        changeTheme('default');
      }
    };

    loadSavedTheme();
  }, [changeTheme]);

  // Detect if the current theme is light
  const isLight = useMemo(() => {
    return checkIsLightTheme(currentTheme);
  }, [currentTheme]);

  // Get a theme color
  const getColor = useCallback((colorKey) => {
    return theme?.colors?.[colorKey] || '#FFFFFF';
  }, [theme]);

  // Get a gradient
  const getGradient = useCallback((gradientKey) => {
    return theme?.gradients?.[gradientKey] || 'none';
  }, [theme]);

  // Get a shadow
  const getShadow = useCallback((shadowKey) => {
    return theme?.shadows?.[shadowKey] || 'none';
  }, [theme]);

  // Get an appropriate text class based on the variant
  const getTextClass = useCallback((variant = 'primary') => {
    const variants = {
      primary: 'text-text',
      secondary: 'text-text-secondary',
      inverse: isLight ? 'text-white' : 'text-gray-900',
    };
    return variants[variant] || variants.primary;
  }, [isLight]);

  // Get an appropriate glassmorphism class based on the theme
  const getGlassClass = useCallback(() => {
    return isLight
      ? 'backdrop-blur-xl bg-black/5 border border-black/10'
      : 'backdrop-blur-xl bg-white/5 border border-white/10';
  }, [isLight]);

  // Get an inline style for the background
  const getBackgroundStyle = useCallback((variant = 'primary') => {
    const variants = {
      primary: { background: 'var(--app-background)' },
      secondary: { background: 'var(--app-backgroundSecondary)' },
      surface: { background: 'var(--app-surface)' },
      gradient: { background: 'linear-gradient(to bottom right, var(--app-background), var(--app-backgroundSecondary))' },
    };
    return variants[variant] || variants.primary;
  }, []);

  const value = useMemo(() => ({
    currentTheme,
    theme,
    isLight,
    changeTheme,
    getColor,
    getGradient,
    getShadow,
    getTextClass,
    getGlassClass,
    getBackgroundStyle,
  }), [currentTheme, theme, isLight, changeTheme, getColor, getGradient, getShadow, getTextClass, getGlassClass, getBackgroundStyle]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
