import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import Button from "./Button";

/**
 * Modal Component - Système de design Drathos
 *
 * Composant modal de base avec glassmorphism et animations.
 *
 * @param {boolean} isOpen - État ouvert/fermé
 * @param {Function} onClose - Callback à la fermeture
 * @param {string} title - Titre du modal
 * @param {React.ReactNode} icon - Icône dans le header
 * @param {string} size - Taille: 'sm', 'md', 'lg', 'xl'
 * @param {boolean} closeOnBackdrop - Fermer en cliquant sur le backdrop
 * @param {boolean} showCloseButton - Afficher le bouton X
 * @param {React.ReactNode} children - Contenu du modal
 * @param {React.ReactNode} footer - Contenu du footer
 * @param {string} className - Classes CSS additionnelles
 */
const Modal = ({
  isOpen = false,
  onClose,
  title,
  icon,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  children,
  footer,
  className = '',
  ...props
}) => {
  // Tailles
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-md"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
            }}
          />

          {/* Modal Content */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`
              relative w-full ${sizes[size]}
              backdrop-blur-2xl
              border rounded-2xl
              shadow-2xl
              ${className}
            `}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
            {...props}
          >
            {/* Header */}
            {(title || icon || showCloseButton) && (
              <div
                className="flex items-start justify-between p-6 border-b"
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <div className="flex items-center gap-4">
                  {/* Icône */}
                  {icon && (
                    <div
                      className="flex items-center justify-center w-12 h-12 rounded-xl"
                      style={{
                        background: 'var(--app-gradient-primary)',
                        color: '#FFFFFF',
                      }}
                    >
                      <div className="text-2xl">{icon}</div>
                    </div>
                  )}

                  {/* Titre */}
                  {title && (
                    <h2
                      id="modal-title"
                      className="text-2xl font-bold"
                      style={{ color: 'var(--app-text)' }}
                    >
                      {title}
                    </h2>
                  )}
                </div>

                {/* Bouton fermer */}
                {showCloseButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={<FiX />}
                    onClick={onClose}
                    className="shrink-0"
                    aria-label="Close"
                  />
                )}
              </div>
            )}

            {/* Body */}
            <div className="p-6" style={{ color: 'var(--app-text)' }}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div
                className="flex items-center justify-end gap-3 p-6 border-t"
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
