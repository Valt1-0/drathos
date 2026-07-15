import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiAlertTriangle } from "react-icons/fi";
import { useTheme } from "../../contexts/themeContext";
import { Button } from "../ui";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText }) => {
  const containerRef = useFocusTrap(isOpen);
  const { t } = useTranslation();
  const deleteText = confirmText || t('common.delete');
  const { getTextClass, isLight } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`relative glass rounded-2xl shadow-2xl max-w-md w-full overflow-hidden ${
          isLight ? 'border border-gray-200' : 'border border-gray-700'
        }`}
      >
        <div className="p-6 pb-4">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
            isLight ? 'bg-red-50' : 'bg-red-500/10'
          }`}>
            <FiAlertTriangle className="text-3xl text-red-500" />
          </div>

          <h3 className={`text-2xl font-bold text-center mb-3 ${getTextClass('primary')}`}>
            {title}
          </h3>

          <p className={`text-center ${getTextClass('secondary')}`}>
            {message}
          </p>
        </div>

        <div className={`p-6 pt-4 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {deleteText}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(DeleteConfirmModal);
