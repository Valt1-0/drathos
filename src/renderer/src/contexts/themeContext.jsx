import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { applyTheme, applyThemeObject, getThemeById, isLightTheme as checkIsLightTheme, isColorLight } from '../config/themes';
import logger from '../services/logger';
import { storeGet, storeSet } from '../utils/storeClient';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [theme, setTheme] = useState(null);
  const [customThemes, setCustomThemes] = useState([]);
  const customThemesRef = useRef([]);

  useEffect(() => { customThemesRef.current = customThemes; }, [customThemes]);

  const changeTheme = useCallback((themeId) => {
    logger.info('[ThemeContext] Changing theme to:', themeId);
    const custom = customThemesRef.current.find(t => t.id === themeId);
    const newTheme = custom ? applyThemeObject(custom) : applyTheme(themeId);
    setCurrentTheme(themeId);
    setTheme(newTheme);
    storeSet('selectedTheme', themeId);
  }, []);

  const saveCustomTheme = useCallback((themeObj) => {
    setCustomThemes(prev => {
      const updated = prev.some(t => t.id === themeObj.id)
        ? prev.map(t => t.id === themeObj.id ? themeObj : t)
        : [...prev, themeObj];
      storeSet('customThemes', updated);
      customThemesRef.current = updated;
      return updated;
    });
  }, []);

  const deleteCustomTheme = useCallback((themeId) => {
    setCustomThemes(prev => {
      const updated = prev.filter(t => t.id !== themeId);
      storeSet('customThemes', updated);
      customThemesRef.current = updated;
      return updated;
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const saved = await storeGet('customThemes');
        const customs = Array.isArray(saved) ? saved : [];
        setCustomThemes(customs);
        customThemesRef.current = customs;

        const savedTheme = await storeGet('selectedTheme');
        logger.info('[ThemeContext] Loaded saved theme:', savedTheme);
        changeTheme(savedTheme || 'default');
      } catch (error) {
        logger.error('[ThemeContext] Error loading saved theme:', error);
        changeTheme('default');
      }
    };
    init();
  }, [changeTheme]);

  const isLight = useMemo(() => {
    if (checkIsLightTheme(currentTheme)) return true;
    const custom = customThemes.find(t => t.id === currentTheme);
    if (custom?.colors?.background) return isColorLight(custom.colors.background);
    return false;
  }, [currentTheme, customThemes]);

  const getColor = useCallback((colorKey) => theme?.colors?.[colorKey] || '#FFFFFF', [theme]);
  const getGradient = useCallback((gradientKey) => theme?.gradients?.[gradientKey] || 'none', [theme]);
  const getShadow = useCallback((shadowKey) => theme?.shadows?.[shadowKey] || 'none', [theme]);

  const getTextClass = useCallback((variant = 'primary') => {
    const variants = {
      primary: 'text-text',
      secondary: 'text-text-secondary',
      inverse: isLight ? 'text-white' : 'text-gray-900',
    };
    return variants[variant] || variants.primary;
  }, [isLight]);

  const getGlassClass = useCallback(() => isLight
    ? 'backdrop-blur-xl bg-black/5 border border-black/10'
    : 'backdrop-blur-xl bg-white/5 border border-white/10', [isLight]);

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
    currentTheme, theme, isLight,
    changeTheme, saveCustomTheme, deleteCustomTheme, customThemes,
    getColor, getGradient, getShadow, getTextClass, getGlassClass, getBackgroundStyle,
  }), [currentTheme, theme, isLight, changeTheme, saveCustomTheme, deleteCustomTheme,
      customThemes, getColor, getGradient, getShadow, getTextClass, getGlassClass, getBackgroundStyle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
