import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiArrowLeft, FiGrid } from "react-icons/fi";
import * as Icons from "react-icons/fa";
import { useCollections } from "../contexts/collectionsContext";
import { useTheme } from "../contexts/themeContext";
import AddGamesToCollectionModal from "../components/modals/AddGamesToCollectionModal";
import DeleteConfirmModal from "../components/modals/DeleteConfirmModal";
import GameCover from "../components/GameCover";
import { SearchBar, Modal, Button } from "../components/ui";

const ICONS = [
  "FaFolder", "FaStar", "FaHeart", "FaFire", "FaGamepad",
  "FaTrophy", "FaRocket", "FaGem", "FaBookmark", "FaCrown",
];

const MOSAIC_INDICES = [0, 1, 2, 3];
const DEFAULT_FORM = { name: "", description: "", icon: "FaFolder" };

const CollectionForm = ({ formData, setFormData, t }) => (
  <div className="space-y-3">
    <input
      type="text"
      value={formData.name}
      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
      placeholder={t("collections.namePlaceholder")}
      autoFocus
      className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-1 focus:ring-primary"
      style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
    />
    <input
      type="text"
      value={formData.description}
      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
      placeholder={t("collections.descriptionPlaceholder")}
      className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-1 focus:ring-primary"
      style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", color: "var(--app-text)" }}
    />
    <div className="flex flex-wrap gap-1.5">
      {ICONS.map((iconName) => {
        const IconComp = Icons[iconName];
        const selected = formData.icon === iconName;
        return (
          <button
            key={iconName}
            onClick={() => setFormData((p) => ({ ...p, icon: iconName }))}
            className="p-2.5 rounded-lg transition-all duration-150 hover:scale-110"
            style={{
              background: selected ? "var(--app-primary)" : "var(--app-surface)",
              color: selected ? "white" : "var(--app-textSecondary)",
              border: selected ? "1px solid var(--app-primary)" : "1px solid var(--app-border)",
            }}
          >
            <IconComp className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  </div>
);

const Collections = () => {
  const { t } = useTranslation();
  const { isLight, getBackgroundStyle } = useTheme();
  const {
    collections, loading, fetchCollections,
    createCollection, updateCollection,
    deleteCollection, removeGamesFromCollection,
  } = useCollections();

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showAddGamesModal, setShowAddGamesModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);
  const [editingCollection, setEditingCollection] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "", icon: "FaFolder" });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCollections = useMemo(() => {
    if (!collections) return [];
    if (!searchQuery.trim()) return collections;
    return collections.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [collections, searchQuery]);

  const totalGames = useMemo(
    () => (collections || []).reduce((sum, c) => sum + (c.games?.length || 0), 0),
    [collections]
  );

  const bannerCovers = useMemo(
    () => selectedCollection?.games?.slice(0, 4).map(g => (g.serverGameId || g)?.coverUrl).filter(Boolean) || [],
    [selectedCollection?.games]
  );

  useEffect(() => {
    if (selectedCollection && collections) {
      const updated = collections.find((c) => c._id === selectedCollection._id);
      if (updated) setSelectedCollection(updated);
      else setSelectedCollection(null);
    }
  }, [collections, selectedCollection?._id]);

  const handleCreate = useCallback(() => {
    setEditingCollection(null);
    setFormData(DEFAULT_FORM);
    setShowCreateModal(true);
  }, []);

  const handleEdit = useCallback((col, e) => {
    e?.stopPropagation();
    setEditingCollection(col);
    setFormData({ name: col.name, description: col.description || "", icon: col.icon || "FaFolder" });
    setShowCreateModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingCollection) {
        await updateCollection(editingCollection._id, formData);
      } else {
        const newCol = await createCollection(formData);
        if (newCol) setSelectedCollection(newCol);
      }
      setShowCreateModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }, [editingCollection, formData, updateCollection, createCollection]);

  const handleDeleteClick = useCallback((col, e) => {
    e?.stopPropagation();
    setCollectionToDelete(col);
    setShowDeleteModal(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!collectionToDelete) return;
    try {
      await deleteCollection(collectionToDelete._id);
      if (selectedCollection?._id === collectionToDelete._id) setSelectedCollection(null);
      setShowDeleteModal(false);
      setCollectionToDelete(null);
    } catch (e) { console.error(e); }
  }, [collectionToDelete, selectedCollection?._id, deleteCollection]);

  const handleRemoveGame = useCallback(async (gameId) => {
    if (!selectedCollection) return;
    try { await removeGamesFromCollection(selectedCollection._id, [gameId]); }
    catch (e) { console.error(e); }
  }, [selectedCollection, removeGamesFromCollection]);

  const emptyStateBg = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)";
  const mosaicPlaceholderBg = isLight ? "#d1d5db" : "#374151";
  const emptyCardBg = isLight ? "#f3f4f6" : "#1f2937";

  const sharedModals = (
    <>
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingCollection ? t("collections.edit") : t("collections.newCollection")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>{t("common.cancel")}</Button>
            <Button variant="primary" onClick={handleSave} disabled={!formData.name.trim() || saving}>
              {saving ? t("common.saving") : editingCollection ? t("common.save") : t("common.create")}
            </Button>
          </>
        }
      >
        <CollectionForm formData={formData} setFormData={setFormData} t={t} />
      </Modal>
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setCollectionToDelete(null); }}
        onConfirm={handleDelete}
        title={t("collections.deleteTitle")}
        message={t("collections.deleteMessage", { name: collectionToDelete?.name })}
      />
    </>
  );

  // Loading
  if (loading || collections === null) {
    return (
      <div className="h-full overflow-y-auto p-6" style={getBackgroundStyle("gradient")}>
        <div className={`h-8 w-44 rounded-lg animate-pulse mb-2 ${isLight ? "bg-gray-200" : "bg-gray-800"}`} />
        <div className={`h-4 w-28 rounded animate-pulse mb-8 ${isLight ? "bg-gray-200" : "bg-gray-700"}`} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className={`aspect-[4/5] rounded-2xl animate-pulse ${isLight ? "bg-gray-200" : "bg-gray-800"}`} />
          ))}
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedCollection) {
    const SelectedIcon = Icons[selectedCollection.icon] || Icons.FaFolder;

    return (
      <>
        <div className="h-full flex flex-col overflow-hidden" style={getBackgroundStyle("gradient")}>

          {/* Banner Header */}
          <div className="relative shrink-0 h-44 overflow-hidden">
            {/* Blurred cover mosaic as background */}
            {bannerCovers.length > 0 ? (
              <div className="absolute inset-0 flex">
                {bannerCovers.map((url, i) => (
                  <div key={i} className="flex-1 relative overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" style={{ filter: "blur(12px)", transform: "scale(1.15)" }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="absolute inset-0" style={{ background: "var(--app-surface)" }} />
            )}

            {/* Overlays */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.75) 100%)" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.3) 0%, transparent 60%)" }} />

            {/* Back button */}
            <button
              onClick={() => setSelectedCollection(null)}
              className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <FiArrowLeft className="w-4 h-4" />
              {t("collections.title")}
            </button>

            {/* Actions top-right */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => setShowAddGamesModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all hover:scale-105"
                style={{ background: "var(--app-primary)" }}
              >
                <FiPlus className="w-4 h-4" />
                {t("collections.addGames")}
              </button>
              <button
                onClick={(e) => handleEdit(selectedCollection, e)}
                className="p-2 rounded-lg text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                <FiEdit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleDeleteClick(selectedCollection, e)}
                className="p-2 rounded-lg text-white bg-white/10 hover:bg-red-500/70 transition-colors"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Collection info bottom */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 flex items-end gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xl" style={{ background: "var(--app-primary)" }}>
                <SelectedIcon className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-white truncate">{selectedCollection.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-white/70">
                    {selectedCollection.games?.length || 0} {t("collections.games")}
                  </span>
                  {selectedCollection.description && (
                    <>
                      <span className="text-white/40">•</span>
                      <span className="text-sm text-white/60 truncate max-w-xs">{selectedCollection.description}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Games Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedCollection.games?.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                {selectedCollection.games.map((gameEntry) => {
                  const game = gameEntry.serverGameId || gameEntry;
                  const gameId = game._id || gameEntry._id;
                  return (
                    <motion.div
                      key={gameId}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group relative rounded-xl overflow-hidden cursor-default"
                      style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)" }}
                    >
                      <div className="aspect-[3/4] relative">
                        <GameCover
                          src={game.coverUrl}
                          alt={game.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          size="cover_small"
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
                        <button
                          onClick={() => handleRemoveGame(gameId)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                          style={{ background: "rgba(0,0,0,0.75)", color: "white" }}
                          aria-label="Remove from collection"
                        >
                          <FiX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--app-text)" }}>{game.name}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: emptyStateBg }}
                >
                  <Icons.FaGamepad className="w-9 h-9" style={{ color: "var(--app-textSecondary)" }} />
                </motion.div>
                <p className="text-lg font-medium mb-2" style={{ color: "var(--app-text)" }}>{t("collections.noGamesInCollection")}</p>
                <p className="text-sm mb-6" style={{ color: "var(--app-textSecondary)" }}>{t("collections.addGamesToStart")}</p>
                <Button variant="primary" size="lg" onClick={() => setShowAddGamesModal(true)}>
                  <FiPlus className="w-4 h-4 mr-2" />{t("collections.addGames")}
                </Button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {showAddGamesModal && (
              <AddGamesToCollectionModal collection={selectedCollection} onClose={() => setShowAddGamesModal(false)} />
            )}
          </AnimatePresence>
        </div>
        {sharedModals}
      </>
    );
  }

  // Collections grid view
  return (
    <>
      <div className="h-full overflow-y-auto" style={getBackgroundStyle("gradient")}>
        <div className="p-6 max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--app-text)" }}>
                {t("collections.title")}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--app-textSecondary)" }}>
                  <FiGrid className="w-3.5 h-3.5" />
                  {t("collections.collectionCount", { count: collections.length })}
                </span>
                {totalGames > 0 && (
                  <>
                    <span style={{ color: "var(--app-border)" }}>•</span>
                    <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--app-textSecondary)" }}>
                      <Icons.FaGamepad className="w-3 h-3" />
                      {totalGames} {t("collections.games")}
                    </span>
                  </>
                )}
              </div>
            </div>
            <Button variant="primary" icon={<FiPlus />} onClick={handleCreate}>
              {t("collections.newCollection")}
            </Button>
          </div>

          {/* Search */}
          {collections.length > 3 && (
            <div className="mb-6 max-w-sm">
              <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("collections.searchCollection")}
                size="md"
              />
            </div>
          )}

          {/* Collections Grid */}
          {filteredCollections.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredCollections.map((col, index) => {
                const Icon = Icons[col.icon] || Icons.FaFolder;
                const games = col.games || [];
                const gamesPreview = games.slice(0, 4);
                const gamesCount = games.length;

                return (
                  <motion.div
                    key={col._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    onClick={() => setSelectedCollection(col)}
                    className="group cursor-pointer"
                  >
                    <div
                      className="relative aspect-[4/5] rounded-2xl overflow-hidden transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-2xl"
                      style={{
                        background: "var(--app-surface)",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                      }}
                    >
                      {/* Cover mosaic */}
                      {gamesPreview.length > 0 ? (
                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0">
                          {MOSAIC_INDICES.map((i) => {
                            const gameEntry = gamesPreview[i];
                            const game = gameEntry?.serverGameId || gameEntry;
                            return (
                              <div
                                key={i}
                                className="relative overflow-hidden"
                                style={{ background: mosaicPlaceholderBg }}
                              >
                                {game?.coverUrl && (
                                  <GameCover
                                    src={game.coverUrl}
                                    alt={game.name || ""}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    size="thumb"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ background: emptyCardBg }}
                        >
                          <Icon className="w-14 h-14" style={{ color: "var(--app-textSecondary)", opacity: 0.2 }} />
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)" }}
                      />

                      {/* Game count badge top-left */}
                      {gamesCount > 0 && (
                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
                          {gamesCount}
                        </div>
                      )}

                      {/* Hover actions top-right */}
                      <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                        <button
                          onClick={(e) => handleEdit(col, e)}
                          className="p-1.5 rounded-lg text-white transition-colors hover:scale-110"
                          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
                          aria-label="Edit"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(col, e)}
                          className="p-1.5 rounded-lg text-white transition-colors hover:bg-red-500 hover:scale-110"
                          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
                          aria-label="Delete"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Content bottom */}
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg"
                            style={{ background: "var(--app-primary)" }}
                          >
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm text-white truncate leading-tight">{col.name}</h3>
                            {col.description ? (
                              <p className="text-[10px] text-white/60 truncate mt-0.5">{col.description}</p>
                            ) : (
                              <p className="text-[10px] text-white/50">{gamesCount} {t("collections.games")}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Create new card */}
              {!searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: filteredCollections.length * 0.03 + 0.05 }}
                  onClick={handleCreate}
                  className="group cursor-pointer"
                >
                  <div
                    className="relative aspect-[4/5] rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-3 transition-all duration-300 group-hover:scale-[1.03]"
                    style={{
                      border: `2px dashed var(--app-border)`,
                      background: "transparent",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110"
                      style={{ background: "var(--app-surface)" }}
                    >
                      <FiPlus className="w-5 h-5" style={{ color: "var(--app-primary)" }} />
                    </div>
                    <p className="text-xs font-medium text-center px-3" style={{ color: "var(--app-textSecondary)" }}>
                      {t("collections.newCollection")}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
                style={{ background: emptyStateBg }}
              >
                <Icons.FaFolderOpen className="w-12 h-12" style={{ color: "var(--app-textSecondary)" }} />
              </motion.div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--app-text)" }}>
                {searchQuery ? t("collections.noResults") : t("collections.emptyState")}
              </h2>
              <p className="text-sm mb-6 max-w-md" style={{ color: "var(--app-textSecondary)" }}>
                {searchQuery ? t("collections.noResultsFor", { query: searchQuery }) : t("collections.emptyStateDesc")}
              </p>
              {!searchQuery && (
                <Button variant="primary" size="lg" icon={<FiPlus />} onClick={handleCreate}>
                  {t("collections.createFirst")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {sharedModals}
    </>
  );
};

export default Collections;
