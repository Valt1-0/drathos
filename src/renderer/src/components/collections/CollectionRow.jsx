import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FiEdit2, FiTrash2, FiChevronRight } from "react-icons/fi";
import { FaFolder, FaStar, FaHeart, FaFire, FaGamepad, FaTrophy, FaRocket, FaGem, FaBookmark, FaCrown } from "react-icons/fa";

const FA_ICONS = { FaFolder, FaStar, FaHeart, FaFire, FaGamepad, FaTrophy, FaRocket, FaGem, FaBookmark, FaCrown };
import { useTheme } from "../../contexts/themeContext";
import { useCollections } from "../../contexts/collectionsContext";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";

const CollectionRow = ({ collection, onEdit, onAddGames }) => {
  const { t } = useTranslation();
  const { isLight } = useTheme();
  const { deleteCollection } = useCollections();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hovered, setHovered] = useState(false);

  const IconComponent = FA_ICONS[collection.icon] || FaFolder;
  const games = collection.games || [];
  const previews = games.slice(0, 5);

  const handleDelete = useCallback(async () => {
    await deleteCollection(collection._id);
  }, [deleteCollection, collection._id]);

  return (
    <>
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
        style={{
          background: hovered ? (isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)') : 'transparent',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onAddGames(collection)}
      >
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: isLight ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.15)' }}
        >
          <IconComponent className="w-4 h-4" style={{ color: 'var(--app-primary)' }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--app-text)' }}>
            {collection.name}
          </p>
          {collection.description && (
            <p className="text-xs truncate" style={{ color: 'var(--app-textSecondary)' }}>
              {collection.description}
            </p>
          )}
        </div>

        {/* Game Previews */}
        <div className="flex -space-x-2">
          {previews.map((g, i) => {
            const game = g.serverGameId || g;
            return (
              <div
                key={game._id || i}
                className="w-7 h-7 rounded-md overflow-hidden border-2"
                style={{
                  borderColor: 'var(--app-background)',
                  background: isLight ? '#e5e7eb' : '#374151'
                }}
              >
                {game.coverUrl && (
                  <img
                    src={game.coverUrl.replace('t_thumb', 't_cover_small')}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            );
          })}
          {games.length > 5 && (
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center border-2 text-[10px] font-medium"
              style={{
                borderColor: 'var(--app-background)',
                background: isLight ? '#e5e7eb' : '#374151',
                color: 'var(--app-textSecondary)'
              }}
            >
              +{games.length - 5}
            </div>
          )}
        </div>

        {/* Count */}
        <span className="text-xs px-2 py-0.5 rounded-full" style={{
          background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
          color: 'var(--app-textSecondary)'
        }}>
          {games.length}
        </span>

        {/* Actions */}
        {hovered ? (
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(collection); }}
              className="p-1.5 rounded-md transition-colors"
              style={{ background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }}
            >
              <FiEdit2 className="w-3.5 h-3.5" style={{ color: 'var(--app-textSecondary)' }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
              className="p-1.5 rounded-md transition-colors hover:bg-red-500/10"
            >
              <FiTrash2 className="w-3.5 h-3.5" style={{ color: 'var(--app-error)' }} />
            </button>
          </div>
        ) : (
          <FiChevronRight className="w-4 h-4" style={{ color: 'var(--app-textSecondary)', opacity: 0.5 }} />
        )}
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={t('collections.confirmDeleteCollection')}
        message={t('collections.confirmDeleteMessage', { name: collection.name })}
        confirmText={t('common.delete')}
      />
    </>
  );
};

export default React.memo(CollectionRow);
