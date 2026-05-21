import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import logger from "../../services/logger";
import { FiX, FiSearch, FiCheck } from "react-icons/fi";
import { useTheme } from "../../contexts/themeContext";
import { useCollections } from "../../contexts/collectionsContext";
import { getAllServerGames } from "../../api/serverGames";
import { Button } from "../ui";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const AddGamesToCollectionModal = ({ collection, onClose }) => {
  const containerRef = useFocusTrap(true);
  const { t } = useTranslation();
  const { getTextClass, isLight } = useTheme();
  const { addGamesToCollection } = useCollections();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGameIds, setSelectedGameIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user's games
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const response = await getAllServerGames();

        if (response) {
          // Response is directly an array of games
          const allGames = Array.isArray(response) ? response : (response.serverGames || []);

          // Filter out games already in the collection
          const existingGameIds = new Set(
            collection.games?.map(g => g.serverGameId?._id || g.serverGameId) || []
          );

          const availableGames = allGames.filter(
            game => !existingGameIds.has(game._id)
          );

          setGames(availableGames);
        }
      } catch (error) {
        logger.error('Failed to fetch games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [collection]);

  // Filter games based on search
  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) {
      return games;
    }

    const query = searchQuery.toLowerCase();
    return games.filter(game =>
      game.name?.toLowerCase().includes(query)
    );
  }, [games, searchQuery]);

  const handleToggleGame = (gameId) => {
    setSelectedGameIds(prev => {
      if (prev.includes(gameId)) {
        return prev.filter(id => id !== gameId);
      } else {
        return [...prev, gameId];
      }
    });
  };

  const handleSubmit = async () => {
    if (selectedGameIds.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addGamesToCollection(collection._id, selectedGameIds);
      onClose();
    } catch (error) {
      logger.error('Failed to add games:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative glass rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[80vh] flex flex-col"
        style={{ border: '1px solid var(--app-border)' }}
      >
          {/* Header */}
          <div className={`p-6 border-b ${isLight ? 'border-gray-300' : 'border-gray-700'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-2xl font-bold ${getTextClass('primary')}`}>
                  {t('collections.addGames')}
                </h2>
                <p className={`text-sm mt-1 ${getTextClass('secondary')}`}>
                  {collection.name}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-surface transition-colors"
                aria-label={t('common.close')}
              >
                <FiX className={`text-xl ${getTextClass('secondary')}`} />
              </motion.button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <FiSearch className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg ${getTextClass('secondary')}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('games.searchPlaceholder')}
                className={`w-full pl-12 pr-4 py-3 rounded-lg glass border transition-all ${
                  isLight ? 'border-gray-300' : 'border-gray-700'
                } ${getTextClass('primary')} focus:outline-none focus:ring-2 focus:ring-primary/50`}
              />
            </div>

            {/* Selected count */}
            <p className={`text-sm mt-3 ${getTextClass('secondary')}`}>
              {selectedGameIds.length > 0
                ? t('collections.selectedGames', { count: selectedGameIds.length })
                : t('collections.selectGamesToAdd')
              }
            </p>
          </div>

          {/* Games List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className={getTextClass('secondary')}>{t('common.loading')}</p>
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className={getTextClass('secondary')}>
                  {searchQuery ? t('games.noGamesFound') : t('collections.noGamesAvailable')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {filteredGames.map((game) => {
                  const isSelected = selectedGameIds.includes(game._id);

                  return (
                    <motion.button
                      key={game._id}
                      onClick={() => handleToggleGame(game._id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`flex items-center gap-4 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : isLight
                          ? 'border-gray-300 hover:border-gray-400'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {/* Game Cover */}
                      <div className="w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-surface">
                        {game.coverUrl && /^https?:\/\//i.test(game.coverUrl) ? (
                          <img
                            src={game.coverUrl.replace('t_thumb', 't_cover_small')}
                            alt={game.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className={`text-xs ${getTextClass('secondary')}`}>
                              {t('games.unknown')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Game Info */}
                      <div className="flex-1 text-left min-w-0">
                        <h3 className={`font-medium truncate ${getTextClass('primary')}`}>
                          {game.name}
                        </h3>
                        <p className={`text-sm ${getTextClass('secondary')}`}>
                          {game.version || 'v1.0.0'}
                        </p>
                      </div>

                      {/* Checkbox */}
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : isLight
                            ? 'border-gray-400'
                            : 'border-gray-600'
                        }`}
                      >
                        {isSelected && <FiCheck className="text-white text-sm" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-6 border-t ${isLight ? 'border-gray-300' : 'border-gray-700'}`}>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSubmit}
                disabled={selectedGameIds.length === 0}
                loading={isSubmitting}
              >
                {isSubmitting
                  ? t('collections.adding')
                  : t('collections.addSelected', { count: selectedGameIds.length })
                }
              </Button>
            </div>
          </div>
        </motion.div>
    </div>
  );
};

export default AddGamesToCollectionModal;
