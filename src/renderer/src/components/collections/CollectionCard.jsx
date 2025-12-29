import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";
import * as Icons from "react-icons/fa";
import { useTheme } from "../../contexts/themeContext";
import { useCollections } from "../../contexts/collectionsContext";
import { Button } from "../ui";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";

const CollectionCard = ({ collection, onEdit, onAddGames }) => {
  const { t } = useTranslation();
  const { getTextClass, isLight } = useTheme();
  const { deleteCollection, removeGamesFromCollection } = useCollections();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gameToRemove, setGameToRemove] = useState(null);
  const [hoveredGameId, setHoveredGameId] = useState(null);

  const IconComponent = Icons[collection.icon] || Icons.FaFolder;
  const games = collection.games || [];

  // Get first 4 games for preview
  const previewGames = games.slice(0, 4);

  const handleDelete = useCallback(async () => {
    await deleteCollection(collection._id);
  }, [deleteCollection, collection._id]);

  const handleRemoveGame = useCallback(async () => {
    if (!gameToRemove) return;

    await removeGamesFromCollection(collection._id, [gameToRemove._id]);
    setGameToRemove(null);
  }, [gameToRemove, removeGamesFromCollection, collection._id]);

  return (
    <>
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        className={`relative p-6 rounded-2xl border transition-all cursor-pointer group ${
          isLight
            ? 'bg-white/50 border-gray-200 hover:border-gray-300 hover:bg-white'
            : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-3 rounded-xl ${isLight ? 'bg-gray-100' : 'bg-gray-900/50'}`}>
              <IconComponent className={`text-2xl ${getTextClass('primary')}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-bold truncate ${getTextClass('primary')}`}>
                {collection.name}
              </h3>
              <p className={`text-sm ${getTextClass('secondary')}`}>
                {t('collections.gamesCount', { count: games.length })}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={<FiEdit2 />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(collection);
              }}
              title={t('collections.editTitle')}
            />

            <Button
              variant="danger"
              size="sm"
              iconOnly
              icon={<FiTrash2 />}
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              title={t('common.delete')}
            />
          </div>
        </div>

        {/* Description */}
        {collection.description && (
          <p className={`text-sm mb-4 line-clamp-2 ${getTextClass('secondary')}`}>
            {collection.description}
          </p>
        )}

        {/* Games Preview Grid */}
        {previewGames.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {previewGames.map((gameEntry, index) => {
              const game = gameEntry.serverGameId || gameEntry;
              const coverUrl = game.coverUrl;

              return (
                <div
                  key={game._id || index}
                  className="aspect-[3/4] rounded-lg overflow-hidden relative group/game"
                  onMouseEnter={() => setHoveredGameId(game._id)}
                  onMouseLeave={() => setHoveredGameId(null)}
                >
                  {/* Overlay with remove button */}
                  <AnimatePresence>
                    {hoveredGameId === game._id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 z-10 bg-black/60 flex items-center justify-center rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0.8 }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon={<FiTrash2 />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setGameToRemove(game);
                            }}
                            title={t('collections.remove')}
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {coverUrl ? (
                    <img
                      src={coverUrl.replace('t_thumb', 't_cover_small')}
                      alt={game.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}

                  {/* Fallback */}
                  <div
                    className={`w-full h-full flex items-center justify-center ${
                      isLight ? 'bg-gray-200' : 'bg-gray-700'
                    }`}
                    style={{ display: coverUrl ? 'none' : 'flex' }}
                  >
                    <p className={`text-xs text-center px-2 font-medium ${getTextClass('secondary')}`}>
                      {game.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed mb-4 ${
            isLight ? 'border-gray-300 bg-gray-50' : 'border-gray-700 bg-gray-800/50'
          }`}>
            <p className={`text-sm ${getTextClass('secondary')}`}>{t('collections.emptyCollection')}</p>
          </div>
        )}

        {/* Add button */}
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            variant="secondary"
            size="md"
            icon={<FiPlus />}
            onClick={()=> onAddGames(collection)}
            className="w-full"
          >
            {t('collections.addGames')}
          </Button>
        </div>
      </motion.div>

      {/* Delete Collection Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={t('collections.confirmDeleteCollection')}
        message={t('collections.confirmDeleteCollectionMessage', { name: collection.name })}
        confirmText={t('common.delete')}
      />

      {/* Remove Game Modal */}
      <DeleteConfirmModal
        isOpen={!!gameToRemove}
        onClose={() => setGameToRemove(null)}
        onConfirm={handleRemoveGame}
        title={t('collections.confirmRemoveGame')}
        message={t('collections.confirmRemoveGameMessage', { game: gameToRemove?.name, collection: collection.name })}
        confirmText={t('collections.remove')}
      />
    </>
  );
};

export default React.memo(CollectionCard);
