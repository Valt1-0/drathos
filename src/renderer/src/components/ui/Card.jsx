import { motion } from "framer-motion";
import { useTheme } from "../../contexts/themeContext";
import { isColorLight } from "../../config/themes";

const Card = ({
  variant = 'glass',
  hover = false,
  gradient = false,
  gradientColor = 'primary',
  className = '',
  children,
  ...props
}) => {
  const { theme } = useTheme();

  const getVariantClasses = () => {
    switch (variant) {
      case 'glass':
        return 'backdrop-blur-xl border';

      case 'solid':
        return 'border';

      case 'gradient':
        return 'border-0';

      case 'stat':
        return 'backdrop-blur-sm border';

      default:
        return 'backdrop-blur-xl border';
    }
  };

  const getInlineStyles = () => {
    const styles = {};

    const isLight = theme?.colors?.background && isColorLight(theme.colors.background);

    switch (variant) {
      case 'glass':
        if (isLight) {
          styles.background = 'rgba(0, 0, 0, 0.03)';
          styles.borderColor = 'rgba(0, 0, 0, 0.08)';
        } else {
          styles.background = 'rgba(255, 255, 255, 0.05)';
          styles.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
        break;

      case 'solid':
        styles.background = 'var(--app-surface)';
        styles.borderColor = 'var(--app-border)';
        break;

      case 'gradient':
        styles.background = `var(--app-gradient-${gradientColor})`;
        styles.color = '#FFFFFF';
        break;

      case 'stat':
        if (isLight) {
          styles.background = `linear-gradient(135deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.02) 100%)`;
          styles.borderColor = `rgba(0, 0, 0, 0.1)`;
        } else {
          styles.background = `linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)`;
          styles.borderColor = `var(--app-${gradientColor})`;
        }
        styles.borderWidth = '1px';
        break;

      default:
        break;
    }

    if (gradient && variant === 'glass') {
      styles.position = 'relative';
      styles.overflow = 'hidden';
    }

    return styles;
  };

  const getHoverAnimation = () => {
    if (!hover) return {};

    return {
      y: -4,
      boxShadow: `var(--app-shadow-${gradientColor}), 0 0 20px var(--app-${gradientColor})`,
    };
  };

  const gradientBorderClass = gradient && variant === 'glass' ? 'card-gradient-border' : '';

  return (
    <motion.div
      className={`
        ${getVariantClasses()}
        ${gradientBorderClass}
        rounded-2xl
        transition-all duration-300
        ${className}
      `}
      style={getInlineStyles()}
      whileHover={hover ? getHoverAnimation() : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      {...props}
    >
      {gradient && variant === 'glass' && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `var(--app-gradient-${gradientColor})`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1px',
            opacity: 0.3,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      <div className="relative z-10 flex flex-col">
        {children}
      </div>
    </motion.div>
  );
};

Card.Header = ({ icon, title, subtitle, action, className = '', ...props }) => {
  return (
    <div
      className={`flex items-center justify-between px-4 pt-4 pb-3 ${className}`}
      {...props}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
            style={{
              background: 'var(--app-gradient-primary)',
              color: '#FFFFFF',
            }}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--app-text)' }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              className="text-xs"
              style={{ color: 'var(--app-textSecondary)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

Card.Body = ({ className = '', children, ...props }) => {
  return (
    <div className={`px-4 pb-4 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Footer = ({ className = '', children, ...props }) => {
  return (
    <div
      className={`p-6 pt-4 border-t ${className}`}
      style={{ borderColor: 'var(--app-border)' }}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
