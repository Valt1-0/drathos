import { motion } from "framer-motion";
import { FiLoader } from "react-icons/fi";

/**
 * Button Component - Système de design Drathos
 *
 * Composant bouton réutilisable avec support complet des thèmes,
 * variants, tailles, icônes et animations.
 *
 * @param {string} variant - Style du bouton: 'primary', 'secondary', 'ghost', 'danger', 'success'
 * @param {string} size - Taille: 'sm', 'md', 'lg', 'xl'
 * @param {boolean} gradient - Utiliser un fond gradient (par défaut pour primary)
 * @param {React.ReactNode} icon - Icône à afficher
 * @param {string} iconPosition - Position de l'icône: 'left', 'right' (default: 'left')
 * @param {boolean} iconOnly - Afficher uniquement l'icône sans texte
 * @param {boolean} loading - État de chargement
 * @param {boolean} disabled - État désactivé
 * @param {string} className - Classes CSS additionnelles
 * @param {React.ReactNode} children - Contenu du bouton
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  gradient = false,
  icon,
  iconPosition = 'left',
  iconOnly = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  // Styles de base selon la taille
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  // Styles pour boutons icon-only
  const iconOnlySizes = {
    sm: 'w-8 h-8 p-0',
    md: 'w-10 h-10 p-0',
    lg: 'w-12 h-12 p-0',
    xl: 'w-14 h-14 p-0',
  };

  // Tailles d'icônes selon la taille du bouton
  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  // Styles selon le variant
  const getVariantStyles = () => {
    const base = 'border transition-all duration-300 font-semibold';

    switch (variant) {
      case 'primary':
        if (gradient) {
          return `${base} border-transparent text-white`;
        }
        return `${base} border-transparent text-white`;

      case 'secondary':
        if (gradient) {
          return `${base} border-transparent text-white`;
        }
        return `${base} border-transparent text-white`;

      case 'ghost':
        return `${base} bg-transparent border-current`;

      case 'danger':
        return `${base} border-transparent text-white`;

      case 'success':
        return `${base} border-transparent text-white`;

      default:
        return base;
    }
  };

  // Styles inline pour les gradients et couleurs dynamiques
  const getInlineStyles = () => {
    if (disabled || loading) {
      return {
        background: 'var(--app-surface)',
        color: 'var(--app-textSecondary)',
        cursor: 'not-allowed',
        opacity: 0.6,
      };
    }

    const styles = {};

    switch (variant) {
      case 'primary':
        if (gradient) {
          styles.background = 'var(--app-gradient-primary)';
          styles.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        } else {
          styles.background = 'var(--app-primary)';
        }
        break;

      case 'secondary':
        if (gradient) {
          styles.background = 'var(--app-gradient-secondary)';
          styles.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        } else {
          styles.background = 'var(--app-secondary)';
        }
        break;

      case 'ghost':
        styles.color = 'var(--app-text)';
        styles.borderColor = 'var(--app-border)';
        break;

      case 'danger':
        styles.background = 'var(--app-error)';
        break;

      case 'success':
        styles.background = 'var(--app-success)';
        break;

      default:
        styles.background = 'var(--app-primary)';
    }

    return styles;
  };

  // Animations hover selon le variant
  const getHoverAnimation = () => {
    if (disabled || loading) return {};

    const base = { scale: 1.02 };

    switch (variant) {
      case 'primary':
      case 'secondary':
        return {
          ...base,
          boxShadow: 'var(--app-shadow-primary), 0 0 20px var(--app-primary)',
        };

      case 'danger':
        return {
          ...base,
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
        };

      case 'success':
        return {
          ...base,
          boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
        };

      case 'ghost':
        return {
          ...base,
          borderColor: 'var(--app-primary)',
          color: 'var(--app-primary)',
        };

      default:
        return base;
    }
  };

  // Rendu du contenu du bouton
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <FiLoader className={iconSizes[size]} />
          </motion.div>
          {!iconOnly && children && <span>Chargement...</span>}
        </div>
      );
    }

    if (iconOnly && icon) {
      return <div className="flex items-center justify-center">{icon}</div>;
    }

    if (icon && children) {
      return (
        <div className="flex items-center justify-center gap-2">
          {iconPosition === 'left' && <span className={iconSizes[size]}>{icon}</span>}
          <span>{children}</span>
          {iconPosition === 'right' && <span className={iconSizes[size]}>{icon}</span>}
        </div>
      );
    }

    if (icon && !children) {
      return <div className="flex items-center justify-center">{icon}</div>;
    }

    return <span>{children}</span>;
  };

  return (
    <motion.button
      className={`
        ${getVariantStyles()}
        ${iconOnly ? iconOnlySizes[size] : sizeClasses[size]}
        ${iconOnly ? 'flex items-center justify-center' : ''}
        rounded-xl
        ${className}
      `}
      style={getInlineStyles()}
      whileHover={getHoverAnimation()}
      whileTap={disabled || loading ? {} : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      disabled={disabled || loading}
      {...props}
    >
      {renderContent()}
    </motion.button>
  );
};

export default Button;
