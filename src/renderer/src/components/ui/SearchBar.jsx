import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiX } from "react-icons/fi";

/**
 * SearchBar Component - Système de design Drathos
 *
 * Barre de recherche améliorée avec animations et effets.
 *
 * @param {string} placeholder - Texte placeholder
 * @param {string} value - Valeur contrôlée
 * @param {Function} onChange - Callback au changement
 * @param {Function} onClear - Callback au clear
 * @param {boolean} autoFocus - Focus automatique
 * @param {string} className - Classes CSS additionnelles
 */
const SearchBar = ({
  placeholder = "Rechercher...",
  value = "",
  onChange,
  onClear,
  autoFocus = false,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <motion.div
      className={`relative ${className}`}
      animate={{
        scale: isFocused ? 1.01 : 1,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Icône de recherche */}
      <motion.div
        className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none"
        animate={{
          color: isFocused ? 'var(--app-primary)' : 'var(--app-textSecondary)',
        }}
      >
        <FiSearch className="text-xl" />
      </motion.div>

      {/* Input */}
      <input
        className="w-full pl-12 pr-12 py-3 rounded-xl backdrop-blur-xl border font-medium transition-all duration-300 focus:outline-none"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderColor: isFocused
            ? 'var(--app-primary)'
            : 'rgba(255, 255, 255, 0.1)',
          color: 'var(--app-text)',
          boxShadow: isFocused
            ? '0 0 0 3px rgba(99, 102, 241, 0.1), 0 0 20px var(--app-primary)'
            : 'none',
        }}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus={autoFocus}
        {...props}
      />

      {/* Bouton clear */}
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-colors duration-200"
            style={{
              color: 'var(--app-textSecondary)',
            }}
            whileHover={{
              backgroundColor: 'var(--app-error)',
              color: '#FFFFFF',
            }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClear}
            type="button"
          >
            <FiX className="text-lg" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Effet de glow au focus */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              boxShadow: '0 0 30px var(--app-primary)',
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SearchBar;
