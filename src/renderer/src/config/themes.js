// Application theme configuration
export const themes = {
  ocean: {
    id: "ocean",
    name: "Ocean Deep",
    description: "Calme et professionnel",
    colors: {
      primary: "#06B6D4",
      primaryHover: "#0891B2",
      secondary: "#0369A1",
      secondaryHover: "#0284C7",
      accent: "#14B8A6",
      accentHover: "#0D9488",
      background: "#0F172A",
      backgroundSecondary: "#1E293B",
      surface: "#334155",
      text: "#FFFFFF",
      textSecondary: "#94A3B8",
      border: "rgba(6, 182, 212, 0.2)",
      success: "#14B8A6",
      error: "#F472B6",
      warning: "#FBBF24",
    },
    gradients: {
      primary: "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
      secondary: "linear-gradient(135deg, #0369A1 0%, #0284C7 100%)",
      button: "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
    },
    shadows: {
      primary: "0 4px 20px rgba(6, 182, 212, 0.3)",
      secondary: "0 4px 20px rgba(3, 105, 161, 0.4)",
      accent: "0 4px 20px rgba(20, 184, 166, 0.3)",
    },
  },

  gold: {
    id: "gold",
    name: "Premium Gold",
    description: "Luxe et exclusif",
    colors: {
      primary: "#FBBF24",
      primaryHover: "#F59E0B",
      secondary: "#FDE68A",
      secondaryHover: "#FCD34D",
      accent: "#D97706",
      accentHover: "#B45309",
      background: "#09090B",
      backgroundSecondary: "#18181B",
      surface: "#27272A",
      text: "#FAFAF9",
      textSecondary: "#E7E5E4",
      border: "rgba(251, 191, 36, 0.2)",
      success: "#FBBF24",
      error: "#DC2626",
      warning: "#F59E0B",
    },
    gradients: {
      primary: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
      secondary: "linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)",
      button: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
    },
    shadows: {
      primary: "0 4px 20px rgba(251, 191, 36, 0.4)",
      secondary: "0 4px 20px rgba(253, 230, 138, 0.3)",
      accent: "0 4px 20px rgba(217, 119, 6, 0.3)",
    },
  },

  // Default theme (current)
  default: {
    id: "default",
    name: "Drathos Classic",
    description: "Thème original",
    colors: {
      primary: "#3B82F6",
      primaryHover: "#2563EB",
      secondary: "#8B5CF6",
      secondaryHover: "#7C3AED",
      accent: "#06B6D4",
      accentHover: "#0891B2",
      background: "#030712",
      backgroundSecondary: "#111827",
      surface: "#1F2937",
      text: "#FFFFFF",
      textSecondary: "#9CA3AF",
      border: "rgba(59, 130, 246, 0.2)",
      success: "#10B981",
      error: "#EF4444",
      warning: "#F59E0B",
    },
    gradients: {
      primary: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
      secondary: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
      button: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    },
    shadows: {
      primary: "0 4px 20px rgba(59, 130, 246, 0.3)",
      secondary: "0 4px 20px rgba(139, 92, 246, 0.3)",
      accent: "0 4px 20px rgba(6, 182, 212, 0.3)",
    },
  },

  // Dark Modern mode
  darkModern: {
    id: "darkModern",
    name: "Dark Modern",
    description: "Sombre et élégant",
    colors: {
      primary: "#6366F1",
      primaryHover: "#4F46E5",
      secondary: "#8B5CF6",
      secondaryHover: "#7C3AED",
      accent: "#14B8A6",
      accentHover: "#0D9488",
      background: "#0A0A0A",
      backgroundSecondary: "#141414",
      surface: "#1A1A1A",
      text: "#FAFAFA",
      textSecondary: "#A3A3A3",
      border: "rgba(99, 102, 241, 0.15)",
      success: "#22C55E",
      error: "#EF4444",
      warning: "#F59E0B",
    },
    gradients: {
      primary: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
      secondary: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
      button: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
    },
    shadows: {
      primary: "0 8px 32px rgba(99, 102, 241, 0.25)",
      secondary: "0 8px 32px rgba(139, 92, 246, 0.25)",
      accent: "0 8px 32px rgba(20, 184, 166, 0.25)",
    },
  },

  // Light Modern mode - Redesigned
  lightModern: {
    id: "lightModern",
    name: "Light Modern",
    description: "Clair et raffiné",
    colors: {
      primary: "#4F46E5",
      primaryHover: "#4338CA",
      secondary: "#7C3AED",
      secondaryHover: "#6D28D9",
      accent: "#0D9488",
      accentHover: "#0F766E",
      background: "#D0D0DA",
      backgroundSecondary: "#C4C4CE",
      surface: "#DADAE4",
      text: "#16161E",
      textSecondary: "#65657A",
      border: "rgba(79, 70, 229, 0.16)",
      success: "#16A34A",
      error: "#DC2626",
      warning: "#D97706",
    },
    gradients: {
      primary: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
      secondary: "linear-gradient(135deg, #0D9488 0%, #4F46E5 100%)",
      button: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
    },
    shadows: {
      primary: "0 2px 12px rgba(79, 70, 229, 0.18)",
      secondary: "0 2px 12px rgba(124, 58, 237, 0.15)",
      accent: "0 2px 12px rgba(13, 148, 136, 0.15)",
    },
  },
};

// Get all themes as an array
export const getThemesList = () => Object.values(themes);

// Get a theme by its ID
export const getThemeById = (id) => themes[id] || themes.default;

// Detect if a theme is light
export const isLightTheme = (themeId) => {
  const theme = themes[themeId];
  if (!theme) return false;

  // Explicitly check if it is lightModern
  if (themeId === "lightModern") return true;

  // Otherwise, check the brightness of the background
  if (theme.colors?.background) {
    const hex = theme.colors.background.replace("#", "");
    const rgb = parseInt(hex, 16);
    return rgb > 0x808080; // More than 50% brightness
  }

  return false;
};

// Apply a theme via CSS variables
export const applyTheme = (themeId) => {
  const theme = getThemeById(themeId);
  const root = document.documentElement;

  root.setAttribute("data-theme", themeId);

  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--app-${key}`, value, "important");
  });

  Object.entries(theme.gradients).forEach(([key, value]) => {
    root.style.setProperty(`--app-gradient-${key}`, value, "important");
  });

  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--app-shadow-${key}`, value, "important");
  });

  return theme;
};
