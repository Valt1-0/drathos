import React, { useState, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight, FiClock, FiCalendar } from "react-icons/fi";
import * as Icons from "react-icons/fa";
import { useTheme } from "../../contexts/themeContext";
import { useCollections } from "../../contexts/collectionsContext";
import { Button, Badge } from "../ui";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";

const CollectionRow = ({ collection, onAddGames, onEdit }) => {
  const { t } = useTranslation();
  const { getTextClass, isLight } = useTheme();
  const { deleteCollection, removeGamesFromCollection } = useCollections();
  const [isHovered, setIsHovered] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gameToRemove, setGameToRemove] = useState(null);
  const [hoveredGameId, setHoveredGameId] = useState(null);
  const scrollRef = useRef(null);

  const IconComponent = Icons[collection.icon] || Icons.FaFolder;
  const games = collection.games || [];

  // Calculate collection stats
  const stats = useMemo(() => {
    if (games.length === 0) return null;

    let totalPlayTime = 0;
    let gamesWithStats = 0;
    let lastPlayed = null;

    games.forEach(gameEntry => {
      const game = gameEntry.serverGameId || gameEntry;

      // Check if game has local stats
      if (game.stats) {
        if (game.stats.totalPlayTime) {
          totalPlayTime += game.stats.totalPlayTime;
          gamesWithStats++;
        }
        if (game.stats.lastPlayed && (!lastPlayed || game.stats.lastPlayed > lastPlayed)) {
          lastPlayed = game.stats.lastPlayed;
        }
      }
    });

    return {
      totalPlayTime,
      gamesWithStats,
      lastPlayed,
      hasStats: totalPlayTime > 0 || lastPlayed !== null
    };
  }, [games]);

  // Format playtime
  const formatPlayTime = useCallback((milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    }
    return `${minutes}m`;
  }, []);

  // Format last played date
  const formatLastPlayed = useCallback((timestamp) => {
    if (!timestamp) return null;

    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return t('collections.today');
    if (days === 1) return t('collections.yesterday');
    if (days < 7) return t('collections.daysAgo', { count: days });
    if (days < 30) return t('collections.weeksAgo', { count: Math.floor(days / 7) });
    if (days < 365) return t('collections.monthsAgo', { count: Math.floor(days / 30) });
    return t('collections.yearsAgo', { count: Math.floor(days / 365) });
  }, [t]);

  const handleDelete = useCallback(async () => {
    await deleteCollection(collection._id);
  }, [deleteCollection, collection._id]);

  const handleRemoveGame = useCallback(async () => {
    if (!gameToRemove) return;

    await removeGamesFromCollection(collection._id, [gameToRemove._id]);
    setGameToRemove(null);
  }, [gameToRemove, removeGamesFromCollection, collection._id]);

  const scroll = useCallback((direction) => {
    if (scrollRef.current) {
      const scrollAmount = 800;
      const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);

      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  return (
    <div
      className="mb-10 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-8">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isLight ? 'bg-gray-100' : 'bg-gray-800'}`}>
            <IconComponent className={`text-xl ${getTextClass('primary')}`} />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${getTextClass('primary')}`}>
              {collection.name}
            </h2>
            {collection.description && (
              <p className={`text-sm ${getTextClass('secondary')}`}>
                {collection.description}
              </p>
            )}
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-2">
            <Badge variant="ghost" size="sm">
              {t('collections.gamesCount', { count: games.length })}
            </Badge>

            {stats?.hasStats && (
              <>
                {stats.totalPlayTime > 0 && (
                  <Badge variant="primary" size="sm" icon={<FiClock />}>
                    {formatPlayTime(stats.totalPlayTime)}
                  </Badge>
                )}

                {stats.lastPlayed && (
                  <Badge variant="success" size="sm" icon={<FiCalendar />}>
                    {formatLastPlayed(stats.lastPlayed)}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2"
            >
              <Button
                variant="primary"
                size="sm"
                icon={<FiPlus />}
                onClick={() => onAddGames(collection)}
              >
                {t('collections.add')}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={<FiEdit2 />}
                onClick={() => onEdit(collection)}
                title={t('collections.editTitle')}
              />

              <Button
                variant="danger"
                size="sm"
                iconOnly
                icon={<FiTrash2 />}
                onClick={() => setShowDeleteModal(true)}
                title={t('common.delete')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Games Row */}
      {games.length > 0 ? (
        <div className="relative group/row">
          {/* Left Arrow */}
          <AnimatePresence>
            {showLeftArrow && isHovered && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => scroll('left')}
                className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full shadow-lg transition-all ${
                  isLight
                    ? 'bg-white/90 hover:bg-white text-gray-800'
                    : 'bg-gray-900/90 hover:bg-gray-900 text-white'
                }`}
              >
                <FiChevronLeft className="text-2xl" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Right Arrow */}
          <AnimatePresence>
            {showRightArrow && isHovered && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => scroll('right')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full shadow-lg transition-all ${
                  isLight
                    ? 'bg-white/90 hover:bg-white text-gray-800'
                    : 'bg-gray-900/90 hover:bg-gray-900 text-white'
                }`}
              >
                <FiChevronRight className="text-2xl" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Games Scroll Container */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="overflow-x-auto scrollbar-hide px-8 scroll-smooth"
          >
            <div className="flex gap-4 pb-4">
              {games.map((gameEntry, index) => {
                const game = gameEntry.serverGameId || gameEntry;
                const coverUrl = game.coverUrl;

                return (
                  <motion.div
                    key={game._id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="flex-shrink-0 cursor-pointer group/card relative"
                  >
                    <div
                      className="w-44 h-60 rounded-xl overflow-hidden shadow-xl relative"
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
                            className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center rounded-xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <motion.div
                              initial={{ scale: 0.8, y: 10 }}
                              animate={{ scale: 1, y: 0 }}
                              exit={{ scale: 0.8, y: 10 }}
                            >
                              <Button
                                variant="ghost"
                                size="md"
                                icon={<FiTrash2 />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGameToRemove(game);
                                }}
                              >
                                {t('collections.remove')}
                              </Button>
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
                        className={`absolute inset-0 flex flex-col items-center justify-center p-4 ${
                          isLight ? 'bg-gray-200' : 'bg-gray-800'
                        }`}
                        style={{ display: coverUrl ? 'none' : 'flex' }}
                      >
                        <svg
                          className={`w-12 h-12 mb-2 ${getTextClass('secondary')}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className={`text-xs text-center font-medium ${getTextClass('secondary')}`}>
                          {game.name}
                        </p>
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // Empty state
        <div className="px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex flex-col items-center justify-center h-60 rounded-xl border-2 border-dashed transition-colors ${
              isLight
                ? 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
            }`}
          >
            <div className="text-center">
              <div className={`mb-4 ${getTextClass('secondary')}`}>
                <svg
                  className="w-16 h-16 mx-auto opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <p className={`text-sm mb-4 ${getTextClass('secondary')}`}>
                {t('collections.emptyCollection')}
              </p>
              <Button
                variant="primary"
                size="md"
                icon={<FiPlus />}
                onClick={() => onAddGames(collection)}
              >
                {t('collections.addGames')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

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
    </div>
  );
};

export default React.memo(CollectionRow);
