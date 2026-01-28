import { motion } from "framer-motion";
import { FiLoader } from "react-icons/fi";

const Button = ({
  variant = 'primary',
  size = 'md',
  gradient = false,
  icon,
  iconPosition = 'left',
  iconOnly = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  const isDisabled = disabled || loading;

  // Tailles compactes et modernes
  const sizes = {
    xs: iconOnly ? 'w-6 h-6' : 'px-2 py-1 text-[10px]',
    sm: iconOnly ? 'w-7 h-7' : 'px-2.5 py-1 text-xs',
    md: iconOnly ? 'w-8 h-8' : 'px-3 py-1.5 text-xs',
    lg: iconOnly ? 'w-9 h-9' : 'px-4 py-2 text-sm',
    xl: iconOnly ? 'w-11 h-11' : 'px-6 py-2.5 text-base',
  };

  const iconSizes = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 };

  // Styles par variant
  const getStyles = () => {
    if (isDisabled) {
      return {
        background: 'var(--app-surface)',
        color: 'var(--app-textSecondary)',
        border: '1px solid transparent',
        opacity: 0.5,
        cursor: 'not-allowed',
      };
    }

    const base = { border: '1px solid transparent' };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          background: gradient ? 'var(--app-gradient-primary)' : 'var(--app-primary)',
          color: '#fff',
          boxShadow: gradient ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
        };
      case 'secondary':
        return {
          ...base,
          background: gradient ? 'var(--app-gradient-secondary)' : 'var(--app-secondary)',
          color: '#fff',
          boxShadow: gradient ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
        };
      case 'ghost':
        return {
          ...base,
          background: 'transparent',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        };
      case 'danger':
        return {
          ...base,
          background: 'var(--app-error)',
          color: '#fff',
        };
      case 'success':
        return {
          ...base,
          background: 'var(--app-success)',
          color: '#fff',
        };
      default:
        return { ...base, background: 'var(--app-primary)', color: '#fff' };
    }
  };

  // Animations hover
  const hoverStyle = isDisabled ? {} : {
    scale: 1.02,
    filter: 'brightness(1.1)',
    boxShadow: variant === 'ghost'
      ? '0 0 0 1px var(--app-primary)'
      : '0 4px 12px rgba(0,0,0,0.2)',
  };

  // Contenu du bouton
  const renderContent = () => {
    const iconSize = iconSizes[size];

    if (loading) {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          className="flex items-center justify-center"
        >
          <FiLoader size={iconSize} />
        </motion.div>
      );
    }

    if (iconOnly && icon) {
      return <span className="flex items-center justify-center" style={{ fontSize: iconSize }}>{icon}</span>;
    }

    if (icon && children) {
      return (
        <span className="flex items-center justify-center gap-1.5">
          {iconPosition === 'left' && <span style={{ fontSize: iconSize }}>{icon}</span>}
          <span>{children}</span>
          {iconPosition === 'right' && <span style={{ fontSize: iconSize }}>{icon}</span>}
        </span>
      );
    }

    return children;
  };

  return (
    <motion.button
      className={`
        ${sizes[size]}
        rounded-lg font-medium
        flex items-center justify-center
        transition-colors duration-150
        ${className}
      `}
      style={getStyles()}
      whileHover={hoverStyle}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={isDisabled}
      {...props}
    >
      {renderContent()}
    </motion.button>
  );
};

export default Button;
