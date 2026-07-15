import { memo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FiSearch, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const SearchBar = memo(({
  placeholder,
  value = "",
  onChange,
  autoFocus = false,
  size = 'md',
  shortcut,
  className = '',
  ...props
}) => {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const resolvedPlaceholder = placeholder ?? t('common.search');
  const hasValue = value.length > 0;
  const active = focused || hasValue;

  const handleClear = () => {
    onChange({ target: { value: "" } });
    inputRef.current?.focus();
  };

  const py = size === 'sm' ? 'py-1.5' : size === 'lg' ? 'py-2.5' : 'py-2';

  return (
    <div
      className={`relative flex items-center rounded-xl border transition-all duration-200 ${className}`}
      style={{
        background: active ? 'var(--app-surface)' : 'var(--app-background)',
        borderColor: active ? 'var(--app-primary)' : 'var(--app-border)',
        boxShadow: focused
          ? '0 0 0 3px color-mix(in srgb, var(--app-primary) 12%, transparent)'
          : 'none',
      }}
    >
      <div className="pl-3 pr-1 shrink-0 flex items-center pointer-events-none">
        <motion.div animate={{ scale: focused ? 1.1 : 1 }} transition={{ duration: 0.15 }}>
          <FiSearch
            className="text-sm transition-colors duration-200"
            style={{ color: active ? 'var(--app-primary)' : 'var(--app-textSecondary)' }}
          />
        </motion.div>
      </div>

      <input
        ref={inputRef}
        type="text"
        placeholder={resolvedPlaceholder}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        aria-label={resolvedPlaceholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`flex-1 ${py} text-sm font-medium bg-transparent outline-none placeholder:text-text-secondary min-w-0`}
        style={{ color: 'var(--app-text)' }}
        {...props}
      />

      <div className="pr-2 shrink-0 flex items-center">
        <AnimatePresence mode="wait">
          {hasValue ? (
            <motion.button
              key="clear"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.12 }}
              onClick={handleClear}
              aria-label={t('common.clearSearch')}
              className="w-5 h-5 flex items-center justify-center rounded-full transition-colors"
              style={{ background: 'var(--app-border)', color: 'var(--app-textSecondary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--app-text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--app-textSecondary)'}
            >
              <FiX className="text-[10px]" />
            </motion.button>
          ) : shortcut && !focused ? (
            <motion.kbd
              key="shortcut"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-1.5 py-0.5 rounded text-[10px] font-mono leading-none"
              style={{ background: 'var(--app-border)', color: 'var(--app-textSecondary)' }}
            >
              {shortcut}
            </motion.kbd>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
