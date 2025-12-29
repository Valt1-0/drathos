// Configuration des thèmes de l'application
export const themes = {
  ocean: {
    id: 'ocean',
    name: 'Ocean Deep',
    description: 'Calme et professionnel',
    preview: '🌊',
    colors: {
      primary: '#06B6D4',
      primaryHover: '#0891B2',
      secondary: '#1E3A8A',
      secondaryHover: '#1E40AF',
      accent: '#14B8A6',
      accentHover: '#0D9488',
      background: '#0F172A',
      backgroundSecondary: '#1E293B',
      surface: '#334155',
      text: '#FFFFFF',
      textSecondary: '#94A3B8',
      border: 'rgba(6, 182, 212, 0.2)',
      success: '#14B8A6',
      error: '#F472B6',
      warning: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      secondary: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
      button: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    },
    shadows: {
      primary: '0 4px 20px rgba(6, 182, 212, 0.3)',
      secondary: '0 4px 20px rgba(30, 58, 138, 0.4)',
      accent: '0 4px 20px rgba(20, 184, 166, 0.3)',
    }
  },

  fire: {
    id: 'fire',
    name: 'Fire & Energy',
    description: 'Énergie et action',
    preview: '🔥',
    colors: {
      primary: '#F97316',
      primaryHover: '#EA580C',
      secondary: '#EF4444',
      secondaryHover: '#DC2626',
      accent: '#FBBF24',
      accentHover: '#F59E0B',
      background: '#18181B',
      backgroundSecondary: '#27272A',
      surface: '#3F3F46',
      text: '#FFFFFF',
      textSecondary: '#A1A1AA',
      border: 'rgba(249, 115, 22, 0.2)',
      success: '#FBBF24',
      error: '#EF4444',
      warning: '#F97316',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
      secondary: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      button: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    },
    shadows: {
      primary: '0 4px 20px rgba(249, 115, 22, 0.4)',
      secondary: '0 4px 20px rgba(239, 68, 68, 0.4)',
      accent: '0 4px 20px rgba(251, 191, 36, 0.3)',
    }
  },

  vaporwave: {
    id: 'vaporwave',
    name: 'Vaporwave',
    description: 'Rétro-futur et chill',
    preview: '🌸',
    colors: {
      primary: '#F0ABFC',
      primaryHover: '#E879F9',
      secondary: '#67E8F9',
      secondaryHover: '#22D3EE',
      accent: '#C084FC',
      accentHover: '#A855F7',
      background: '#1E1B4B',
      backgroundSecondary: '#312E81',
      surface: '#4C1D95',
      text: '#FFFFFF',
      textSecondary: '#DDD6FE',
      border: 'rgba(240, 171, 252, 0.2)',
      success: '#67E8F9',
      error: '#FB7185',
      warning: '#FDBA74',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #F0ABFC 0%, #E879F9 100%)',
      secondary: 'linear-gradient(135deg, #67E8F9 0%, #22D3EE 100%)',
      button: 'linear-gradient(135deg, #F0ABFC 0%, #E879F9 100%)',
    },
    shadows: {
      primary: '0 4px 20px rgba(240, 171, 252, 0.4)',
      secondary: '0 4px 20px rgba(103, 232, 249, 0.4)',
      accent: '0 4px 20px rgba(192, 132, 252, 0.4)',
    }
  },

  matrix: {
    id: 'matrix',
    name: 'Matrix Green',
    description: 'Hacker et tech',
    preview: '💚',
    colors: {
      primary: '#00FF41',
      primaryHover: '#00DD38',
      secondary: '#10B981',
      secondaryHover: '#059669',
      accent: '#84CC16',
      accentHover: '#65A30D',
      background: '#000000',
      backgroundSecondary: '#0A0F0A',
      surface: '#1A2F1A',
      text: '#00FF41',
      textSecondary: '#4ADE80',
      border: 'rgba(0, 255, 65, 0.2)',
      success: '#00FF41',
      error: '#FF4141',
      warning: '#FFFF41',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #00FF41 0%, #00DD38 100%)',
      secondary: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      button: 'linear-gradient(135deg, #00FF41 0%, #00DD38 100%)',
    },
    shadows: {
      primary: '0 4px 20px rgba(0, 255, 65, 0.5)',
      secondary: '0 4px 20px rgba(16, 185, 129, 0.4)',
      accent: '0 4px 20px rgba(132, 204, 22, 0.3)',
    }
  },

  gold: {
    id: 'gold',
    name: 'Premium Gold',
    description: 'Luxe et exclusif',
    preview: '✨',
    colors: {
      primary: '#FBBF24',
      primaryHover: '#F59E0B',
      secondary: '#FDE68A',
      secondaryHover: '#FCD34D',
      accent: '#D97706',
      accentHover: '#B45309',
      background: '#09090B',
      backgroundSecondary: '#18181B',
      surface: '#27272A',
      text: '#FAFAF9',
      textSecondary: '#E7E5E4',
      border: 'rgba(251, 191, 36, 0.2)',
      success: '#FBBF24',
      error: '#DC2626',
      warning: '#F59E0B',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
      secondary: 'linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)',
      button: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
    },
    shadows: {
      primary: '0 4px 20px rgba(251, 191, 36, 0.4)',
      secondary: '0 4px 20px rgba(253, 230, 138, 0.3)',
      accent: '0 4px 20px rgba(217, 119, 6, 0.3)',
    }
  },

  // Thème par défaut (actuel)
  default: {
    id: 'default',
    name: 'Drathos Classic',
    description: 'Thème original',
    preview: '🎯',
    colors: {
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      secondary: '#8B5CF6',
      secondaryHover: '#7C3AED',
      accent: '#06B6D4',
      accentHover: '#0891B2',
      background: '#030712',
      backgroundSecondary: '#111827',
      surface: '#1F2937',
      text: '#FFFFFF',
      textSecondary: '#9CA3AF',
      border: 'rgba(59, 130, 246, 0.2)',
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      secondary: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      button: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    },
    shadows: {
      primary: '0 4px 20px rgba(59, 130, 246, 0.3)',
      secondary: '0 4px 20px rgba(139, 92, 246, 0.3)',
      accent: '0 4px 20px rgba(6, 182, 212, 0.3)',
    }
  },

  // Mode Dark Moderne
  darkModern: {
    id: 'darkModern',
    name: 'Dark Modern',
    description: 'Sombre et élégant',
    preview: '🌙',
    colors: {
      primary: '#6366F1',
      primaryHover: '#4F46E5',
      secondary: '#8B5CF6',
      secondaryHover: '#7C3AED',
      accent: '#14B8A6',
      accentHover: '#0D9488',
      background: '#0A0A0A',
      backgroundSecondary: '#141414',
      surface: '#1A1A1A',
      text: '#FAFAFA',
      textSecondary: '#A3A3A3',
      border: 'rgba(99, 102, 241, 0.15)',
      success: '#22C55E',
      error: '#EF4444',
      warning: '#F59E0B',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
      secondary: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      button: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    },
    shadows: {
      primary: '0 8px 32px rgba(99, 102, 241, 0.25)',
      secondary: '0 8px 32px rgba(139, 92, 246, 0.25)',
      accent: '0 8px 32px rgba(20, 184, 166, 0.25)',
    }
  },

  // Mode Light Moderne - Repensé
  lightModern: {
    id: 'lightModern',
    name: 'Light Modern',
    description: 'Clair et raffiné',
    preview: '☀️',
    colors: {
      primary: '#6366F1',
      primaryHover: '#4F46E5',
      secondary: '#8B5CF6',
      secondaryHover: '#7C3AED',
      accent: '#14B8A6',
      accentHover: '#0D9488',
      background: '#FFFFFF',
      backgroundSecondary: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#1E293B',
      textSecondary: '#64748B',
      border: 'rgba(148, 163, 184, 0.2)',
      success: '#22C55E',
      error: '#EF4444',
      warning: '#F59E0B',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      secondary: 'linear-gradient(135deg, #14B8A6 0%, #6366F1 100%)',
      button: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    },
    shadows: {
      primary: '0 4px 12px rgba(99, 102, 241, 0.15)',
      secondary: '0 4px 12px rgba(139, 92, 246, 0.15)',
      accent: '0 4px 12px rgba(20, 184, 166, 0.15)',
    }
  },
};

// Obtenir tous les thèmes en tableau
export const getThemesList = () => Object.values(themes);

// Obtenir un thème par son ID
export const getThemeById = (id) => themes[id] || themes.default;

// Détecter si un thème est clair
export const isLightTheme = (themeId) => {
  const theme = themes[themeId];
  if (!theme) return false;

  // Vérifier explicitement si c'est lightModern
  if (themeId === 'lightModern') return true;

  // Sinon, vérifier la luminosité du background
  if (theme.colors?.background) {
    const hex = theme.colors.background.replace('#', '');
    const rgb = parseInt(hex, 16);
    return rgb > 0x808080; // Plus de 50% de luminosité
  }

  return false;
};

// Appliquer un thème en CSS variables
export const applyTheme = (themeId) => {
  const theme = getThemeById(themeId);
  const root = document.documentElement;

  console.log('[Themes] Applying theme:', themeId);
  console.log('[Themes] Primary color:', theme.colors.primary);

  // Ajouter un attribut data-theme pour forcer le changement visuel
  root.setAttribute('data-theme', themeId);

  // Appliquer les couleurs avec !important pour écraser le CSS
  Object.entries(theme.colors).forEach(([key, value]) => {
    const varName = `--app-${key}`;
    root.style.setProperty(varName, value, 'important');
  });

  // Appliquer les gradients
  Object.entries(theme.gradients).forEach(([key, value]) => {
    const varName = `--app-gradient-${key}`;
    root.style.setProperty(varName, value, 'important');
  });

  // Appliquer les shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    const varName = `--app-shadow-${key}`;
    root.style.setProperty(varName, value, 'important');
  });

  console.log('[Themes] ✅ Theme applied successfully - CSS vars set on :root with !important');
  return theme;
};
