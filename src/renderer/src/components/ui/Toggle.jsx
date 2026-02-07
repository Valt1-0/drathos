import { motion } from "framer-motion";

/**
 * Toggle Component - Système de design Drathos
 *
 * Composant switch avec animations fluides.
 *
 * @param {boolean} checked - État du toggle
 * @param {Function} onChange - Callback au changement
 * @param {boolean} disabled - État désactivé
 * @param {string} size - Taille: 'sm', 'md', 'lg'
 * @param {string} label - Label du toggle
 * @param {string} description - Description sous le label
 * @param {string} className - Classes CSS additionnelles
 */
const Toggle = ({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  label,
  description,
  className = '',
  ...props
}) => {
  // Tailles (container width/height, thumb size, offset when checked)
  const sizes = {
    sm: {
      width: 36,
      height: 20,
      thumbSize: 16,
      padding: 2,
    },
    md: {
      width: 44,
      height: 24,
      thumbSize: 20,
      padding: 2,
    },
    lg: {
      width: 52,
      height: 28,
      thumbSize: 24,
      padding: 2,
    },
  };

  const currentSize = sizes[size];
  const translateX = currentSize.width - currentSize.thumbSize - currentSize.padding * 2;

  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Toggle Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`
          relative shrink-0 rounded-full
          transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
        `}
        style={{
          width: currentSize.width,
          height: currentSize.height,
          background: checked
            ? disabled
              ? 'var(--app-textSecondary)'
              : 'var(--app-gradient-primary, var(--app-primary))'
            : 'var(--app-surface)',
          boxShadow: checked
            ? 'inset 0 0 0 1px rgba(255,255,255,0.1)'
            : 'inset 0 0 0 2px var(--app-border)',
        }}
        onClick={handleToggle}
        disabled={disabled}
        {...props}
      >
        <motion.span
          className="block rounded-full shadow-lg"
          style={{
            position: 'absolute',
            top: (currentSize.height - currentSize.thumbSize) / 2,
            left: 0,
            width: currentSize.thumbSize,
            height: currentSize.thumbSize,
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
          }}
          initial={false}
          animate={{
            x: checked ? translateX + currentSize.padding : currentSize.padding,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />
      </button>

      {/* Label et Description */}
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label
              className="block text-sm font-semibold mb-1 cursor-pointer"
              style={{ color: 'var(--app-text)' }}
              onClick={handleToggle}
            >
              {label}
            </label>
          )}
          {description && (
            <p
              className="text-xs"
              style={{ color: 'var(--app-textSecondary)' }}
            >
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Toggle;
