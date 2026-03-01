import { memo } from "react";
import { useTranslation } from "react-i18next";
import { FiSearch, FiX } from "react-icons/fi";

const sizeConfig = {
  sm: { input: 'pl-8 py-1.5 text-sm rounded-lg', icon: 'left-2.5 text-sm', clear: 'right-2 text-sm w-4 h-4' },
  md: { input: 'pl-10 py-2.5 text-sm rounded-lg', icon: 'left-3 text-base', clear: 'right-2.5 text-sm w-4 h-4' },
  lg: { input: 'pl-12 py-3 rounded-xl', icon: 'left-4 text-xl', clear: 'right-3 text-base w-5 h-5' },
};

const SearchBar = memo(({
  placeholder,
  value = "",
  onChange,
  autoFocus = false,
  size = 'md',
  className = '',
  ...props
}) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('common.search');
  const config = sizeConfig[size] || sizeConfig.md;
  const hasValue = value.length > 0;

  const handleClear = () => {
    onChange({ target: { value: "" } });
  };

  return (
    <div className={`relative ${className}`}>
      <FiSearch
        className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${config.icon}`}
        style={{ color: 'var(--app-textSecondary)' }}
      />

      <input
        type="text"
        placeholder={resolvedPlaceholder}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        aria-label={resolvedPlaceholder}
        className={`w-full ${config.input} ${hasValue ? 'pr-8' : 'pr-3'} border font-medium transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary`}
        style={{
          background: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)'
        }}
        {...props}
      />

      {hasValue && (
        <button
          onClick={handleClear}
          aria-label={t('common.clearSearch')}
          className={`absolute top-1/2 -translate-y-1/2 ${config.clear} flex items-center justify-center rounded-full transition-colors duration-150`}
          style={{ color: 'var(--app-textSecondary)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--app-text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--app-textSecondary)'}
        >
          <FiX />
        </button>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
