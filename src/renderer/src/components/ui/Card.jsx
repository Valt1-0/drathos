import { motion } from "framer-motion";
import { useTheme } from "../../contexts/themeContext";

/**
 * Card Component - Système de design Drathos
 *
 * Composant carte réutilisable avec effet glassmorphism,
 * variants et animations.
 *
 * @param {string} variant - Style de la carte: 'glass', 'solid', 'gradient', 'stat'
 * @param {boolean} hover - Activer les effets hover
 * @param {boolean} gradient - Utiliser une bordure gradient
 * @param {string} gradientColor - Couleur du gradient: 'primary', 'secondary', 'accent'
 * @param {string} className - Classes CSS additionnelles
 * @param {React.ReactNode} children - Contenu de la carte
 */
const Card = ({
  variant = 'glass',
  hover = false,
  gradient = false,
  gradientColor = 'primary',
  className = '',
  children,
  ...props
}) => {
  const { theme } = useTheme();

  // Styles de base selon le variant
  const getVariantClasses = () => {
    switch (variant) {
      case 'glass':
        return 'backdrop-blur-xl border';

      case 'solid':
        return 'border';

      case 'gradient':
        return 'border-0';

      case 'stat':
        return 'backdrop-blur-sm border';

      default:
        return 'backdrop-blur-xl border';
    }
  };

  // Styles inline selon le variant et le thème
  const getInlineStyles = () => {
    const styles = {};

    // Déterminer si le thème est clair
    const isLight = theme?.colors?.background &&
      parseInt(theme.colors.background.replace('#', ''), 16) > 0x808080;

    switch (variant) {
      case 'glass':
        if (isLight) {
          styles.background = 'rgba(0, 0, 0, 0.03)';
          styles.borderColor = 'rgba(0, 0, 0, 0.08)';
        } else {
          styles.background = 'rgba(255, 255, 255, 0.05)';
          styles.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
        break;

      case 'solid':
        styles.background = 'var(--app-surface)';
        styles.borderColor = 'var(--app-border)';
        break;

      case 'gradient':
        styles.background = `var(--app-gradient-${gradientColor})`;
        styles.color = '#FFFFFF';
        break;

      case 'stat':
        if (isLight) {
          styles.background = `linear-gradient(135deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.02) 100%)`;
          styles.borderColor = `rgba(0, 0, 0, 0.1)`;
        } else {
          styles.background = `linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)`;
          styles.borderColor = `var(--app-${gradientColor})`;
        }
        styles.borderWidth = '1px';
        break;

      default:
        break;
    }

    // Bordure gradient pour glass cards
    if (gradient && variant === 'glass') {
      styles.position = 'relative';
      styles.overflow = 'hidden';
    }

    return styles;
  };

  // Animation hover
  const getHoverAnimation = () => {
    if (!hover) return {};

    return {
      y: -4,
      boxShadow: `var(--app-shadow-${gradientColor}), 0 0 20px var(--app-${gradientColor})`,
    };
  };

  // Classe pour bordure gradient
  const gradientBorderClass = gradient && variant === 'glass' ? 'card-gradient-border' : '';

  return (
    <motion.div
      className={`
        ${getVariantClasses()}
        ${gradientBorderClass}
        rounded-2xl
        transition-all duration-300
        ${className}
      `}
      style={getInlineStyles()}
      whileHover={hover ? getHoverAnimation() : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      {...props}
    >
      {/* Bordure gradient overlay */}
      {gradient && variant === 'glass' && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `var(--app-gradient-${gradientColor})`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1px',
            opacity: 0.3,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Contenu */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

// Sous-composants pour une meilleure organisation

/**
 * Card.Header - En-tête de carte
 */
Card.Header = ({ icon, title, subtitle, action, className = '', ...props }) => {
  return (
    <div
      className={`flex items-start justify-between p-6 pb-4 ${className}`}
      {...props}
    >
      <div className="flex items-start gap-4 flex-1">
        {icon && (
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
            style={{
              background: 'var(--app-gradient-primary)',
              color: '#FFFFFF',
            }}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <h3
              className="text-lg font-semibold mb-1"
              style={{ color: 'var(--app-text)' }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              className="text-sm"
              style={{ color: 'var(--app-textSecondary)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

/**
 * Card.Body - Corps de la carte
 */
Card.Body = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * Card.Footer - Pied de carte
 */
Card.Footer = ({ className = '', children, ...props }) => {
  return (
    <div
      className={`p-6 pt-4 border-t ${className}`}
      style={{ borderColor: 'var(--app-border)' }}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
