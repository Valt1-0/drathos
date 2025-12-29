import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import * as Icons from "react-icons/fa";
import { useTheme } from "../../contexts/themeContext";
import { useCollections } from "../../contexts/collectionsContext";

const ICON_OPTIONS = [
  'FaFolder', 'FaFolderOpen', 'FaStar', 'FaHeart', 'FaFire',
  'FaTrophy', 'FaGamepad', 'FaCrown', 'FaRocket', 'FaGem',
  'FaBookmark', 'FaFlag', 'FaBolt', 'FaMagic', 'FaGift',
  'FaMusic', 'FaFilm', 'FaCamera', 'FaPalette', 'FaCompass'
];

const CollectionDrawer = ({ isOpen, onClose, collection = null }) => {
  const { t } = useTranslation();
  const { getTextClass, isLight } = useTheme();
  const { createCollection, updateCollection } = useCollections();

  const isEditMode = !!collection;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'FaFolder',
    color: '#6366f1',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Réinitialiser le formulaire quand le drawer s'ouvre ou la collection change
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: collection?.name || '',
        description: collection?.description || '',
        icon: collection?.icon || 'FaFolder',
        color: collection?.color || '#6366f1',
      });
    }
  }, [isOpen, collection]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await updateCollection(collection._id, formData);
      } else {
        await createCollection(formData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save collection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const CurrentIcon = Icons[formData.icon] || Icons.FaFolder;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl glass z-50 shadow-2xl flex flex-col"
            style={{ borderLeft: '1px solid var(--app-border)' }}
          >
            {/* Header */}
            <div className="p-8 border-b border-border/50">
              <div className="flex items-center justify-between mb-2">
                <h2 className={`text-3xl font-bold ${getTextClass('primary')}`}>
                  {isEditMode ? t('collections.edit') : t('collections.newCollection')}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-3 rounded-xl hover:bg-surface/50 transition-colors"
                >
                  <FiX className={`text-2xl ${getTextClass('secondary')}`} />
                </motion.button>
              </div>
              <p className={`text-sm ${getTextClass('secondary')}`}>
                {isEditMode
                  ? t('collections.editDesc')
                  : t('collections.createDesc')
                }
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">

              {/* Name */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${getTextClass('primary')}`}>
                  {t('collections.name')} {!isEditMode && '*'}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  maxLength={100}
                  autoFocus
                  placeholder={t('collections.namePlaceholder')}
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    isLight ? 'border-gray-300 bg-white focus:border-primary' : 'border-gray-700 bg-gray-800 focus:border-primary'
                  } ${getTextClass('primary')} focus:outline-none focus:ring-2 focus:ring-primary/30`}
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${getTextClass('primary')}`}>
                  {t('collections.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  maxLength={500}
                  rows={3}
                  placeholder={t('collections.descriptionPlaceholder')}
                  className={`w-full px-4 py-3 rounded-lg border transition-all resize-none ${
                    isLight ? 'border-gray-300 bg-white focus:border-primary' : 'border-gray-700 bg-gray-800 focus:border-primary'
                  } ${getTextClass('primary')} focus:outline-none focus:ring-2 focus:ring-primary/30`}
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${getTextClass('primary')}`}>
                  {t('collections.icon')}
                </label>
                <div className="grid grid-cols-10 gap-2">
                  {ICON_OPTIONS.map((iconName) => {
                    const IconComp = Icons[iconName];
                    const isSelected = formData.icon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, icon: iconName }))}
                        className={`aspect-square p-2 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-primary text-white border-primary'
                            : isLight
                            ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                            : 'border-gray-700 hover:border-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        <IconComp className={`w-full h-full ${isSelected ? '' : getTextClass('secondary')}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-8 border-t border-border/50">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                    isLight ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-700 hover:bg-gray-600'
                  } ${getTextClass('primary')}`}
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.name.trim()}
                  className="flex-1 px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? t('collections.saving')
                    : isEditMode
                      ? t('collections.saveChanges')
                      : t('collections.createAction')
                  }
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CollectionDrawer;
