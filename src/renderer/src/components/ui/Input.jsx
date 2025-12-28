import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertCircle } from "react-icons/fi";

/**
 * Input Component - Système de design Drathos
 *
 * Composant champ de texte avec support d'icônes, états et animations.
 *
 * @param {React.ReactNode} icon - Icône à afficher
 * @param {string} iconPosition - Position de l'icône: 'left', 'right'
 * @param {string} label - Label du champ
 * @param {string} helperText - Texte d'aide en dessous du champ
 * @param {string} error - Message d'erreur
 * @param {boolean} disabled - État désactivé
 * @param {string} className - Classes CSS additionnelles
 */
const Input = ({
  icon,
  iconPosition = 'left',
  label,
  helperText,
  error,
  disabled = false,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--app-text)' }}
        >
          {label}
        </label>
      )}

      {/* Input Container */}
      <motion.div
        className="relative"
        animate={{
          scale: isFocused ? 1.01 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Icône gauche */}
        {icon && iconPosition === 'left' && (
          <div
            className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none"
            style={{ color: isFocused ? 'var(--app-primary)' : 'var(--app-textSecondary)' }}
          >
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          className={`
            w-full px-4 py-3 rounded-xl
            backdrop-blur-xl border
            font-medium
            transition-all duration-300
            focus:outline-none
            ${icon && iconPosition === 'left' ? 'pl-12' : ''}
            ${icon && iconPosition === 'right' ? 'pr-12' : ''}
            ${error ? 'pr-10' : ''}
            ${disabled ? 'cursor-not-allowed opacity-60' : ''}
          `}
          style={{
            background: disabled
              ? 'var(--app-surface)'
              : 'rgba(255, 255, 255, 0.05)',
            borderColor: error
              ? 'var(--app-error)'
              : isFocused
                ? 'var(--app-primary)'
                : 'rgba(255, 255, 255, 0.1)',
            color: 'var(--app-text)',
            boxShadow: isFocused && !error
              ? '0 0 0 3px rgba(99, 102, 241, 0.1)'
              : 'none',
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          {...props}
        />

        {/* Icône droite */}
        {icon && iconPosition === 'right' && !error && (
          <div
            className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none"
            style={{ color: isFocused ? 'var(--app-primary)' : 'var(--app-textSecondary)' }}
          >
            {icon}
          </div>
        )}

        {/* Icône erreur */}
        {error && (
          <div
            className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--app-error)' }}
          >
            <FiAlertCircle />
          </div>
        )}

        {/* Effet de glow au focus */}
        <AnimatePresence>
          {isFocused && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                boxShadow: '0 0 20px var(--app-primary)',
                opacity: 0.2,
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Helper Text ou Error */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 text-sm font-medium"
            style={{ color: 'var(--app-error)' }}
          >
            {error}
          </motion.p>
        )}
        {!error && helperText && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 text-sm"
            style={{ color: 'var(--app-textSecondary)' }}
          >
            {helperText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Input;
