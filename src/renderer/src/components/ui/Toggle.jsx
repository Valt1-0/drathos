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
      container: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translateX: 14,
    },
    md: {
      container: 'w-10 h-5',
      thumb: 'w-4 h-4',
      translateX: 18,
    },
    lg: {
      container: 'w-12 h-6',
      thumb: 'w-5 h-5',
      translateX: 22,
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
          relative shrink-0 rounded-full
          transition-all duration-300
          focus:outline-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          background: checked
            ? disabled
              ? 'var(--app-textSecondary)'
              : 'var(--app-primary)'
            : 'var(--app-surface)',
          border: `2px solid ${checked ? 'transparent' : 'var(--app-border)'}`,
        }}
        onClick={handleToggle}
        disabled={disabled}
        {...props}
      >
        <motion.span
          className={`${currentSize.thumb} rounded-full shadow-md`}
          style={{
            background: '#FFFFFF',
            position: 'absolute',
            top: '50%',
            left: '2px',
            transform: 'translateY(-50%)',
          }}
          animate={{ x: checked ? currentSize.translateX : 0 }}
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
