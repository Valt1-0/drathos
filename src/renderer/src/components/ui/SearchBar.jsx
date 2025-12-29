import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiX } from "react-icons/fi";

const SearchBar = ({
  placeholder = "Rechercher...",
  value = "",
  onChange,
  onClear,
  autoFocus = false,
  className = '',
  ...props
}) => {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div className={`relative ${className}`}>
      <FiSearch
        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-xl"
        style={{ color: 'var(--app-text)' }}
      />

      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        className="w-full pl-12 pr-12 py-3 rounded-xl border font-medium transition-all duration-300 focus:outline-none focus:border-primary"
        style={{
          background: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)'
        }}
        {...props}
      />

      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-error hover:text-white transition-colors"
            onClick={handleClear}
            type="button"
          >
            <FiX className="text-lg" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
