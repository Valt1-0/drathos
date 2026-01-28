import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";
import * as Icons from "react-icons/fa";
import { useTheme } from "../../contexts/themeContext";
import { useCollections } from "../../contexts/collectionsContext";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";

const CollectionCard = ({ collection, onEdit, onAddGames }) => {
  const { t } = useTranslation();
  const { isLight } = useTheme();
  const { deleteCollection } = useCollections();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hovered, setHovered] = useState(false);

  const IconComponent = Icons[collection.icon] || Icons.FaFolder;
  const games = collection.games || [];
  const previews = games.slice(0, 3);

  const handleDelete = useCallback(async () => {
    await deleteCollection(collection._id);
  }, [deleteCollection, collection._id]);

  return (
    <>
      <div
        className="rounded-xl p-3 cursor-pointer transition-all group"
        style={{
          background: 'var(--app-surface)',
          border: '1px solid var(--app-border)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onAddGames(collection)}
      >
        {/* Game Previews */}
        <div className="flex gap-1.5 mb-3 h-20">
          {previews.length > 0 ? (
            previews.map((g, i) => {
              const game = g.serverGameId || g;
              return (
                <div
                  key={game._id || i}
                  className="flex-1 rounded-lg overflow-hidden"
                  style={{ background: isLight ? '#e5e7eb' : '#374151' }}
                >
                  {game.coverUrl ? (
                    <img
                      src={game.coverUrl.replace('t_thumb', 't_cover_small')}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[9px] text-center px-1" style={{ color: 'var(--app-textSecondary)' }}>
                        {game.name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div
              className="flex-1 rounded-lg flex items-center justify-center"
              style={{ background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)' }}
            >
              <FiPlus className="w-5 h-5" style={{ color: 'var(--app-textSecondary)', opacity: 0.4 }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex items-center gap-2">
          <IconComponent className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--app-primary)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--app-text)' }}>
              {collection.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--app-textSecondary)' }}>
              {games.length} {games.length === 1 ? t('collections.game') : t('collections.games')}
            </p>
          </div>

          {/* Actions */}
          {hovered && (
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(collection); }}
                className="p-1.5 rounded-md transition-colors"
                style={{ background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }}
              >
                <FiEdit2 className="w-3 h-3" style={{ color: 'var(--app-textSecondary)' }} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
                className="p-1.5 rounded-md transition-colors hover:bg-red-500/10"
              >
                <FiTrash2 className="w-3 h-3" style={{ color: 'var(--app-error)' }} />
              </button>
            </div>
          )}
        </div>
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

export default React.memo(CollectionCard);
