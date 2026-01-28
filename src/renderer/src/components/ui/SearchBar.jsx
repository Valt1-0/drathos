import { memo, useCallback } from "react";
import { FiSearch, FiX } from "react-icons/fi";

const sizeConfig = {
  sm: { input: 'pl-8 pr-10 py-1.5 text-sm rounded-lg', icon: 'left-2.5 text-sm', clear: 'right-2 text-sm' },
  md: { input: 'pl-10 pr-10 py-2.5 text-sm rounded-lg', icon: 'left-3 text-base', clear: 'right-3 text-base' },
  lg: { input: 'pl-12 pr-12 py-3 rounded-xl', icon: 'left-4 text-xl', clear: 'right-4 text-lg' },
};

const SearchBar = memo(({
  placeholder = "Rechercher...",
  value = "",
  onChange,
  onClear,
  autoFocus = false,
  size = 'md',
  className = '',
  ...props
}) => {
  const config = sizeConfig[size] || sizeConfig.md;

  const handleClear = useCallback(() => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  }, [onClear, onChange]);

  return (
    <div className={`relative ${className}`}>
      <FiSearch
        className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${config.icon}`}
        style={{ color: 'var(--app-textSecondary)' }}
      />

      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        aria-label={placeholder}
        className={`w-full ${config.input} border font-medium transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary`}
        style={{
          background: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)'
        }}
        {...props}
      />

      {value && (
        <button
          className={`absolute top-1/2 -translate-y-1/2 p-1 rounded hover:bg-error/20 hover:text-error transition-colors ${config.clear}`}
          onClick={handleClear}
          type="button"
          aria-label="Clear search"
          style={{ color: 'var(--app-textSecondary)' }}
        >
          <FiX />
        </button>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
