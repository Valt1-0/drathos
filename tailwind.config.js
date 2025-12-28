import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme colors using CSS variables
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primaryHover)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondaryHover)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accentHover)',
        },
        background: {
          DEFAULT: 'var(--color-background)',
          secondary: 'var(--color-backgroundSecondary)',
        },
        surface: 'var(--color-surface)',
        'text': {
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-textSecondary)',
        },
        border: 'var(--color-border)',
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
      },
      backgroundImage: {
        'gradient-primary': 'var(--app-gradient-primary)',
        'gradient-secondary': 'var(--app-gradient-secondary)',
        'gradient-button': 'var(--app-gradient-button)',
        'mesh-gradient': `radial-gradient(at 40% 20%, var(--app-primary) 0px, transparent 50%),
                          radial-gradient(at 80% 0%, var(--app-secondary) 0px, transparent 50%),
                          radial-gradient(at 0% 50%, var(--app-accent) 0px, transparent 50%)`,
      },
      boxShadow: {
        'primary': 'var(--app-shadow-primary)',
        'secondary': 'var(--app-shadow-secondary)',
        'accent': 'var(--app-shadow-accent)',
        'glow-primary': '0 0 20px var(--app-primary), 0 0 40px var(--app-primary)',
        'glow-secondary': '0 0 20px var(--app-secondary), 0 0 40px var(--app-secondary)',
        'glow-accent': '0 0 20px var(--app-accent), 0 0 40px var(--app-accent)',
      },
      // Keyframes pour toutes les animations
      keyframes: {
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: 'var(--app-shadow-primary)'
          },
          '50%': {
            boxShadow: '0 0 30px var(--app-primary), 0 0 60px var(--app-primary)'
          },
        },
        'gradient-shift': {
          '0%, 100%': {
            backgroundPosition: '0% 50%'
          },
          '50%': {
            backgroundPosition: '100% 50%'
          },
        },
        'shine': {
          'to': {
            backgroundPosition: '200% center'
          },
        },
        'fadeIn': {
          'from': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'slideIn': {
          'from': {
            opacity: '0',
            transform: 'translateX(-20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        'shimmer': {
          '0%': {
            backgroundPosition: '-1000px 0',
          },
          '100%': {
            backgroundPosition: '1000px 0',
          },
        },
      },
      // Animations améliorées
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'shine': 'shine 1.5s ease infinite',
        'fadeIn': 'fadeIn 0.5s ease-out',
        'slideIn': 'slideIn 0.5s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      // Backdrop blur variants
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        DEFAULT: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '40px',
        '3xl': '64px',
      },
      // Backdrop saturation
      backdropSaturate: {
        150: '150%',
        180: '180%',
        200: '200%',
      },
      // Spacing custom pour cohérence
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      // Transitions personnalisées
      transitionDuration: {
        '400': '400ms',
      },
      // Scale personnalisé pour effets subtils
      scale: {
        '98': '0.98',
        '102': '1.02',
      },
    },
  },
  plugins: [
    // Plugin pour les effets glassmorphism
    plugin(function({ addUtilities }) {
      addUtilities({
        '.glass': {
          background: 'var(--app-glass-bg)',
          backdropFilter: 'blur(var(--app-glass-blur))',
          WebkitBackdropFilter: 'blur(var(--app-glass-blur))',
          border: '1px solid var(--app-glass-border)',
        },
        '.glass-frosted': {
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          background: 'var(--app-glass-bg)',
          border: '1px solid var(--app-glass-border)',
        },
        '.gradient-text': {
          background: 'var(--app-gradient-primary)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        },
        '.btn-press:active': {
          transform: 'scale(0.96)',
          filter: 'brightness(0.9)',
        },
        '.no-drag': {
          WebkitAppRegion: 'no-drag',
        },
        '.drag': {
          WebkitAppRegion: 'drag',
        },
      });
    }),

    // Plugin pour les effets de hover avancés
    plugin(function({ addUtilities }) {
      addUtilities({
        '.hover-glow': {
          transition: 'box-shadow 0.3s ease, transform 0.3s ease',
          '&:hover': {
            boxShadow: '0 0 20px var(--app-primary), 0 0 40px var(--app-primary), var(--app-shadow-primary)',
            transform: 'translateY(-4px)',
          },
        },
        '.hover-lift': {
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
          },
        },
        '.hover-scale': {
          transition: 'transform 0.3s ease',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        },
        '.hover-scale-sm': {
          transition: 'transform 0.2s ease',
          '&:hover': {
            transform: 'scale(1.02)',
          },
        },
      });
    }),
  ],
};
