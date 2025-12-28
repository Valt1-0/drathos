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
  // Tailles
  const sizes = {
    sm: {
      container: 'w-9 h-5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-4',
    },
    md: {
      container: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
    lg: {
      container: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7',
    },
  };

  const currentSize = sizes[size];

  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-start gap-4 ${className}`}>
      {/* Toggle Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`
          ${currentSize.container}
          relative inline-flex shrink-0 rounded-full
          border-2 border-transparent
          transition-all duration-300
          focus:outline-none focus:ring-4
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          background: checked
            ? disabled
              ? 'var(--app-textSecondary)'
              : 'var(--app-gradient-primary)'
            : 'rgba(255, 255, 255, 0.1)',
          boxShadow: checked && !disabled
            ? '0 0 12px var(--app-primary)'
            : 'none',
          focusRingColor: 'var(--app-primary)',
        }}
        onClick={handleToggle}
        disabled={disabled}
        {...props}
      >
        <motion.span
          className={`
            ${currentSize.thumb}
            inline-block rounded-full
            shadow-lg
          `}
          style={{
            background: '#FFFFFF',
          }}
          animate={{
            x: checked ? (size === 'sm' ? 16 : size === 'md' ? 20 : 28) : 0,
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
