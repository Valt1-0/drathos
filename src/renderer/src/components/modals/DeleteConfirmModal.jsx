import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiAlertTriangle } from "react-icons/fi";
import { useTheme } from "../../contexts/themeContext";

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Supprimer" }) => {
  const { t } = useTranslation();
  const { getTextClass, isLight } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`relative glass rounded-2xl shadow-2xl max-w-md w-full overflow-hidden ${
          isLight ? 'border border-gray-200' : 'border border-gray-700'
        }`}
      >
        {/* Icon */}
        <div className="p-6 pb-4">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
            isLight ? 'bg-red-50' : 'bg-red-500/10'
          }`}>
            <FiAlertTriangle className="text-3xl text-red-500" />
          </div>

          {/* Title */}
          <h3 className={`text-2xl font-bold text-center mb-3 ${getTextClass('primary')}`}>
            {title}
          </h3>

          {/* Message */}
          <p className={`text-center ${getTextClass('secondary')}`}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className={`p-6 pt-4 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className={`flex-1 px-5 py-3 rounded-xl font-medium transition-all ${
                isLight
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
              }`}
            >
              {t('common.cancel')}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              {confirmText}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(DeleteConfirmModal);
