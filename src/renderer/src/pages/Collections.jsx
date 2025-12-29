import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiGrid, FiList, FiAlignLeft, FiHash, FiClock } from "react-icons/fi";
import { useCollections } from "../contexts/collectionsContext";
import { useTheme } from "../contexts/themeContext";
import { Button, SearchBar, ViewToggle, SortSelect } from "../components/ui";
import CollectionRow from "../components/collections/CollectionRow";
import CollectionCard from "../components/collections/CollectionCard";
import CollectionDrawer from "../components/collections/CollectionDrawer";
import AddGamesToCollectionModal from "../components/modals/AddGamesToCollectionModal";

const Collections = () => {
  const { t } = useTranslation();
  const { getBackgroundStyle, getTextClass, isLight } = useTheme();
  const { collections, loading } = useCollections();

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [showAddGamesModal, setShowAddGamesModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, games, recent
  const [viewMode, setViewMode] = useState('rows'); // rows, grid

  // Filter and sort collections
  const filteredCollections = useMemo(() => {
    if (!collections) return [];

    let filtered = [...collections];

    // Recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(col =>
        col.name.toLowerCase().includes(query) ||
        col.description?.toLowerCase().includes(query)
      );
    }

    // Tri
    switch (sortBy) {
      case 'games':
        filtered.sort((a, b) => (b.games?.length || 0) - (a.games?.length || 0));
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt);
          const dateB = new Date(b.updatedAt || b.createdAt);
          return dateB - dateA;
        });
        break;
      case 'name':
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return filtered;
  }, [collections, searchQuery, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!collections) return { totalCollections: 0, totalGames: 0 };

    const totalGames = collections.reduce((acc, col) => {
      return acc + (col.games?.length || 0);
    }, 0);

    return {
      totalCollections: collections.length,
      totalGames
    };
  }, [collections]);

  const handleEdit = useCallback((collection) => {
    setEditingCollection(collection);
    setShowDrawer(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setShowDrawer(false);
    setTimeout(() => setEditingCollection(null), 300);
  }, []);

  const handleAddGames = useCallback((collection) => {
    setSelectedCollection(collection);
    setShowAddGamesModal(true);
  }, []);

  const handleCloseAddGamesModal = useCallback(() => {
    setShowAddGamesModal(false);
    setTimeout(() => setSelectedCollection(null), 300);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col" style={getBackgroundStyle('gradient')}>
        {/* Header Skeleton */}
        <div className="glass-strong border-b border-border/50 px-8 py-6 animate-pulse">
          <div className={`h-10 w-64 rounded-lg mb-3 ${isLight ? 'bg-gray-200' : 'bg-gray-800'}`} />
          <div className={`h-5 w-96 rounded-lg ${isLight ? 'bg-gray-200' : 'bg-gray-800'}`} />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 overflow-y-auto py-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-10 px-8">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-lg ${isLight ? 'bg-gray-200' : 'bg-gray-800'}`} />
                <div className={`h-7 w-48 rounded-lg ${isLight ? 'bg-gray-200' : 'bg-gray-800'}`} />
              </div>
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <div key={j} className={`w-44 h-60 rounded-xl ${isLight ? 'bg-gray-200' : 'bg-gray-800'}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={getBackgroundStyle('gradient')}>
      {/* Header */}
      <div className="glass-strong border-b border-border/50 px-8 py-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <div>
              <h1 className={`text-4xl font-bold mb-2 ${getTextClass('primary')}`}>
                {t('collections.title')}
              </h1>
              <p className={`text-sm ${getTextClass('secondary')}`}>
                {t('collections.subtitle')}
              </p>
            </div>

            {/* Stats */}
            {collections && collections.length > 0 && (
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-lg ${
                  isLight ? 'bg-gray-100' : 'bg-gray-800'
                }`}>
                  <div className={`text-2xl font-bold ${getTextClass('primary')}`}>
                    {stats.totalCollections}
                  </div>
                  <div className={`text-xs ${getTextClass('secondary')}`}>
                    {stats.totalCollections === 1 ? 'Collection' : 'Collections'}
                  </div>
                </div>

                <div className={`px-4 py-2 rounded-lg ${
                  isLight ? 'bg-gray-100' : 'bg-gray-800'
                }`}>
                  <div className={`text-2xl font-bold ${getTextClass('primary')}`}>
                    {stats.totalGames}
                  </div>
                  <div className={`text-xs ${getTextClass('secondary')}`}>
                    {t('collections.gamesCount', { count: stats.totalGames })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            size="lg"
            gradient
            icon={<FiPlus />}
            onClick={() => setShowDrawer(true)}
          >
            {t('collections.newCollection')}
          </Button>
        </div>

        {/* Search and Sort Bar */}
        {collections && collections.length > 0 && (
          <div className="flex items-center gap-3">
            {/* Search */}
            <SearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('collections.searchCollection')}
              className="flex-1"
            />

            {/* Sort */}
            <SortSelect
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'name', label: t('collections.sortByName'), icon: <FiAlignLeft /> },
                { value: 'games', label: t('collections.sortByGames'), icon: <FiHash /> },
                { value: 'recent', label: t('collections.sortByRecent'), icon: <FiClock /> }
              ]}
            />

            {/* View Toggle */}
            <ViewToggle
              options={[
                { value: 'rows', icon: <FiList />, label: t('collections.viewRows') },
                { value: 'grid', icon: <FiGrid />, label: t('collections.viewGrid') }
              ]}
              value={viewMode}
              onChange={setViewMode}
            />
          </div>
        )}
      </div>

      {/* Collections Content */}
      <div className="flex-1 overflow-y-auto py-8">
        {collections && collections.length > 0 ? (
          filteredCollections.length > 0 ? (
            viewMode === 'rows' ? (
              // Rows View
              <AnimatePresence mode="popLayout">
                {filteredCollections.map((collection, index) => (
                  <motion.div
                    key={collection._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <CollectionRow
                      collection={collection}
                      onEdit={handleEdit}
                      onAddGames={handleAddGames}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              // Grid View
              <div className="px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredCollections.map((collection, index) => (
                      <motion.div
                        key={collection._id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                      >
                        <CollectionCard
                          collection={collection}
                          onEdit={handleEdit}
                          onAddGames={handleAddGames}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )
          ) : (
            // No results state
            <div className="h-full flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-md"
              >
                <div className="text-6xl mb-4">🔍</div>
                <h3 className={`text-2xl font-bold mb-2 ${getTextClass('primary')}`}>
                  {t('collections.noResults')}
                </h3>
                <p className={`mb-6 ${getTextClass('secondary')}`}>
                  {t('collections.noSearchResults')} "{searchQuery}"
                </p>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setSearchQuery('')}
                >
                  {t('collections.clearSearch')}
                </Button>
              </motion.div>
            </div>
          )
        ) : (
          // Empty State
          <div className="h-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-md"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mb-6 text-7xl"
              >
                📚
              </motion.div>
              <h3 className={`text-3xl font-bold mb-3 ${getTextClass('primary')}`}>
                {t('collections.emptyState')}
              </h3>
              <p className={`mb-8 text-lg ${getTextClass('secondary')}`}>
                {t('collections.emptyStateDesc')}
              </p>
              <Button
                variant="primary"
                size="xl"
                gradient
                icon={<FiPlus />}
                onClick={() => setShowDrawer(true)}
              >
                {t('collections.createFirst')}
              </Button>
            </motion.div>
          </div>
        )}
      </div>

      {/* Drawer */}
      <CollectionDrawer
        isOpen={showDrawer}
        onClose={handleCloseDrawer}
        collection={editingCollection}
      />

      {/* Add Games Modal */}
      <AnimatePresence>
        {showAddGamesModal && selectedCollection && (
          <AddGamesToCollectionModal
            collection={selectedCollection}
            onClose={handleCloseAddGamesModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Collections;
