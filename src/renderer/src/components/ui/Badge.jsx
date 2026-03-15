import { motion } from "framer-motion";

/**
 * Badge Component - Drathos design system
 *
 * Badge component for displaying statuses, tags, etc.
 *
 * @param {string} variant - Style: 'primary', 'secondary', 'success', 'warning', 'error', 'ghost'
 * @param {string} size - Size: 'sm', 'md', 'lg'
 * @param {React.ReactNode} icon - Optional icon
 * @param {boolean} dot - Show an indicator dot
 * @param {boolean} pulse - Animate the dot
 * @param {string} className - Additional CSS classes
 */
const Badge = ({
  variant = 'primary',
  size = 'md',
  icon,
  dot = false,
  pulse = false,
  className = '',
  children,
  ...props
}) => {
  // Sizes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  // Styles by variant
  const getInlineStyles = () => {
    const styles = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
    };

    switch (variant) {
      case 'primary':
        styles.background = 'var(--app-primary)';
        styles.color = '#FFFFFF';
        break;

      case 'secondary':
        styles.background = 'var(--app-secondary)';
        styles.color = '#FFFFFF';
        break;

      case 'success':
        styles.background = 'var(--app-success)';
        styles.color = '#FFFFFF';
        break;

      case 'warning':
        styles.background = 'var(--app-warning)';
        styles.color = '#FFFFFF';
        break;

      case 'error':
        styles.background = 'var(--app-error)';
        styles.color = '#FFFFFF';
        break;

      case 'ghost':
        styles.background = 'rgba(255, 255, 255, 0.1)';
        styles.color = 'var(--app-text)';
        styles.border = '1px solid var(--app-border)';
        break;

      default:
        styles.background = 'var(--app-primary)';
        styles.color = '#FFFFFF';
    }

    return styles;
  };

  return (
    <motion.span
      className={`
        ${sizeClasses[size]}
        rounded-full
        font-semibold
        whitespace-nowrap
        ${className}
      `}
      style={getInlineStyles()}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {/* Indicator dot */}
      {dot && (
        <span className="relative flex items-center">
          <span
            className={`${dotSizes[size]} rounded-full bg-current`}
            style={{ opacity: 0.8 }}
          />
          {pulse && (
            <motion.span
              className={`absolute ${dotSizes[size]} rounded-full bg-current`}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.8, 0, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </span>
      )}

      {/* Icon */}
      {icon && <span className={iconSizes[size]}>{icon}</span>}

      {/* Text */}
      {children}
    </motion.span>
  );
};

export default Badge;
