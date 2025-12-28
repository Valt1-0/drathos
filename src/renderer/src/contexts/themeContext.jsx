import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { applyTheme, getThemeById, isLightTheme as checkIsLightTheme } from '../config/themes';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('darkModern');
  const [theme, setTheme] = useState(null);

  // Changer de thème
  const changeTheme = useCallback((themeId) => {
    console.log('[ThemeContext] Changing theme to:', themeId);
    const newTheme = applyTheme(themeId);
    setCurrentTheme(themeId);
    setTheme(newTheme);

    // Sauvegarder le choix
    window.store.set('selectedTheme', themeId);
  }, []);

  // Charger le thème sauvegardé au démarrage
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await window.store.get('selectedTheme');
        console.log('[ThemeContext] Loaded saved theme:', savedTheme);
        if (savedTheme) {
          changeTheme(savedTheme);
        } else {
          changeTheme('darkModern');
        }
      } catch (error) {
        console.error('[ThemeContext] Error loading saved theme:', error);
        changeTheme('default');
      }
    };

    loadSavedTheme();
  }, [changeTheme]);

  // Détecter si le thème actuel est clair
  const isLight = useMemo(() => {
    return checkIsLightTheme(currentTheme);
  }, [currentTheme]);

  // Obtenir la couleur d'un thème
  const getColor = (colorKey) => {
    return theme?.colors?.[colorKey] || '#FFFFFF';
  };

  // Obtenir un gradient
  const getGradient = (gradientKey) => {
    return theme?.gradients?.[gradientKey] || 'none';
  };

  // Obtenir une shadow
  const getShadow = (shadowKey) => {
    return theme?.shadows?.[shadowKey] || 'none';
  };

  // Obtenir une classe de texte appropriée selon le variant
  const getTextClass = useCallback((variant = 'primary') => {
    const variants = {
      primary: 'text-text',
      secondary: 'text-text-secondary',
      inverse: isLight ? 'text-white' : 'text-gray-900',
    };
    return variants[variant] || variants.primary;
  }, [isLight]);

  // Obtenir une classe glassmorphism appropriée selon le thème
  const getGlassClass = useCallback(() => {
    return isLight
      ? 'backdrop-blur-xl bg-black/5 border border-black/10'
      : 'backdrop-blur-xl bg-white/5 border border-white/10';
  }, [isLight]);

  // Obtenir un style inline pour le background
  const getBackgroundStyle = useCallback((variant = 'primary') => {
    const variants = {
      primary: { background: 'var(--app-background)' },
      secondary: { background: 'var(--app-backgroundSecondary)' },
      surface: { background: 'var(--app-surface)' },
      gradient: { background: 'linear-gradient(to bottom right, var(--app-background), var(--app-backgroundSecondary))' },
    };
    return variants[variant] || variants.primary;
  }, []);

  const value = {
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
  };

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
