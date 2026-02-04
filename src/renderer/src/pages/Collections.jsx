import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiArrowLeft } from "react-icons/fi";
import * as Icons from "react-icons/fa";
import { useCollections } from "../contexts/collectionsContext";
import { useTheme } from "../contexts/themeContext";
import AddGamesToCollectionModal from "../components/modals/AddGamesToCollectionModal";
import DeleteConfirmModal from "../components/modals/DeleteConfirmModal";
import GameCover from "../components/GameCover";
import { SearchBar, Modal, Button } from "../components/ui";

const ICONS = [
  "FaFolder",
  "FaStar",
  "FaHeart",
  "FaFire",
  "FaGamepad",
  "FaTrophy",
  "FaRocket",
  "FaGem",
  "FaBookmark",
  "FaCrown",
];

// Extracted form component to avoid duplication
const CollectionForm = ({ formData, setFormData, t }) => (
  <div className="space-y-3">
    <input
      type="text"
      value={formData.name}
      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
      placeholder={t("collections.namePlaceholder")}
      autoFocus
      className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-1 focus:ring-primary"
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        color: "var(--app-text)",
      }}
    />
    <input
      type="text"
      value={formData.description}
      onChange={(e) =>
        setFormData((p) => ({ ...p, description: e.target.value }))
      }
      placeholder={t("collections.descriptionPlaceholder")}
      className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-1 focus:ring-primary"
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        color: "var(--app-text)",
      }}
    />
    <div className="flex flex-wrap gap-1">
      {ICONS.map((iconName) => {
        const IconComp = Icons[iconName];
        const selected = formData.icon === iconName;
        return (
          <button
            key={iconName}
            onClick={() => setFormData((p) => ({ ...p, icon: iconName }))}
            className="p-2 rounded-lg transition-colors"
            style={{
              background: selected
                ? "var(--app-primary)"
                : "var(--app-surface)",
              color: selected ? "white" : "var(--app-textSecondary)",
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
    collections,
    loading,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    removeGamesFromCollection,
  } = useCollections();

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // State
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showAddGamesModal, setShowAddGamesModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);
  const [editingCollection, setEditingCollection] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "FaFolder",
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered collections
  const filteredCollections = useMemo(() => {
    if (!collections) return [];
    if (!searchQuery.trim()) return collections;
    return collections.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [collections, searchQuery]);

  // Update selected collection when collections change
  useEffect(() => {
    if (selectedCollection && collections) {
      const updated = collections.find((c) => c._id === selectedCollection._id);
      if (updated) setSelectedCollection(updated);
      else setSelectedCollection(null);
    }
  }, [collections, selectedCollection?._id]);

  // Handlers
  const handleCreate = useCallback(() => {
    setEditingCollection(null);
    setFormData({ name: "", description: "", icon: "FaFolder" });
    setShowCreateModal(true);
  }, []);

  const handleEdit = useCallback((col, e) => {
    e?.stopPropagation();
    setEditingCollection(col);
    setFormData({
      name: col.name,
      description: col.description || "",
      icon: col.icon || "FaFolder",
    });
    setShowCreateModal(true);
  }, []);

  const handleSave = async () => {
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
    }
    setSaving(false);
  };

  const handleDeleteClick = useCallback((col, e) => {
    e?.stopPropagation();
    setCollectionToDelete(col);
    setShowDeleteModal(true);
  }, []);

  const handleDelete = async () => {
    if (!collectionToDelete) return;
    try {
      await deleteCollection(collectionToDelete._id);
      if (selectedCollection?._id === collectionToDelete._id) {
        setSelectedCollection(null);
      }
      setShowDeleteModal(false);
      setCollectionToDelete(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveGame = async (gameId) => {
    if (!selectedCollection) return;
    try {
      await removeGamesFromCollection(selectedCollection._id, [gameId]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBack = () => {
    setSelectedCollection(null);
  };

  // Loading state
  if (loading || collections === null) {
    return (
      <div
        className="h-full overflow-y-auto p-6"
        style={getBackgroundStyle("gradient")}
      >
        <div
          className={`h-10 w-48 rounded-lg animate-pulse mb-6 ${isLight ? "bg-gray-200" : "bg-gray-800"}`}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`aspect-square rounded-2xl animate-pulse ${isLight ? "bg-gray-200" : "bg-gray-800"}`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Detail view - when a collection is selected
  if (selectedCollection) {
    const SelectedIcon = Icons[selectedCollection.icon] || Icons.FaFolder;

    return (
      <>
        <div
          className="h-full flex flex-col overflow-hidden"
          style={getBackgroundStyle("gradient")}
        >
          {/* Header */}
          <div
            className="px-6 py-4 flex items-center justify-between shrink-0"
            style={{ borderBottom: "1px solid var(--app-border)" }}
          >
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={<FiArrowLeft />}
                onClick={handleBack}
                aria-label="Back"
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "var(--app-primary)", color: "white" }}
              >
                <SelectedIcon className="w-6 h-6" />
              </div>
              <div>
                <h1
                  className="text-xl font-bold"
                  style={{ color: "var(--app-text)" }}
                >
                  {selectedCollection.name}
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "var(--app-textSecondary)" }}
                >
                  {selectedCollection.games?.length || 0}{" "}
                  {t("collections.games")}
                  {selectedCollection.description &&
                    ` • ${selectedCollection.description}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={<FiPlus className="w-4 h-4" />}
                onClick={() => setShowAddGamesModal(true)}
              >
                {t("collections.addGames")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={<FiEdit2 />}
                onClick={(e) => handleEdit(selectedCollection, e)}
                aria-label="Edit"
              />
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={<FiTrash2 />}
                onClick={(e) => handleDeleteClick(selectedCollection, e)}
                aria-label="Delete"
              />
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
                      className="group relative rounded-xl overflow-hidden"
                      style={{
                        background: "var(--app-surface)",
                        border: "1px solid var(--app-border)",
                      }}
                    >
                      <div className="aspect-[3/4] relative">
                        <GameCover
                          src={game.coverUrl}
                          alt={game.name}
                          className="w-full h-full object-cover"
                          size="cover_small"
                        />
                        <button
                          onClick={() => handleRemoveGame(gameId)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            background: "rgba(0,0,0,0.7)",
                            color: "white",
                          }}
                          aria-label="Remove from collection"
                        >
                          <FiX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-2">
                        <p
                          className="text-xs font-medium truncate"
                          style={{ color: "var(--app-text)" }}
                        >
                          {game.name}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: isLight
                      ? "rgba(0,0,0,0.05)"
                      : "rgba(255,255,255,0.05)",
                  }}
                >
                  <Icons.FaGamepad
                    className="w-9 h-9"
                    style={{ color: "var(--app-textSecondary)" }}
                  />
                </div>
                <p
                  className="text-lg font-medium mb-2"
                  style={{ color: "var(--app-text)" }}
                >
                  {t("collections.noGamesInCollection")}
                </p>
                <p
                  className="text-sm mb-6"
                  style={{ color: "var(--app-textSecondary)" }}
                >
                  {t("collections.addGamesToStart")}
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setShowAddGamesModal(true)}
                >
                  <FiPlus className="w-4 h-4 mr-2" />
                  {t("collections.addGames")}
                </Button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {showAddGamesModal && (
              <AddGamesToCollectionModal
                collection={selectedCollection}
                onClose={() => setShowAddGamesModal(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Shared Modals - rendered outside main view but inside fragment */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={
            editingCollection
              ? t("collections.edit")
              : t("collections.newCollection")
          }
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!formData.name.trim() || saving}
              >
                {saving
                  ? t("common.saving")
                  : editingCollection
                    ? t("common.save")
                    : t("common.create")}
              </Button>
            </>
          }
        >
          <CollectionForm formData={formData} setFormData={setFormData} t={t} />
        </Modal>

        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setCollectionToDelete(null);
          }}
          onConfirm={handleDelete}
          title={t("collections.deleteTitle")}
          message={t("collections.deleteMessage", {
            name: collectionToDelete?.name,
          })}
        />
      </>
    );
  }

  // Collections grid view
  return (
    <>
      <div
        className="h-full overflow-y-auto"
        style={getBackgroundStyle("gradient")}
      >
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: "var(--app-text)" }}
              >
                {t("collections.title")}
              </h1>
              <p
                className="text-sm"
                style={{ color: "var(--app-textSecondary)" }}
              >
                {t("collections.collectionCount", {
                  count: collections.length,
                })}
              </p>
            </div>
            <Button variant="primary" icon={<FiPlus />} onClick={handleCreate}>
              {t("collections.newCollection")}
            </Button>
          </div>

          {/* Search */}
          {collections.length > 3 && (
            <div className="mb-6 max-w-md">
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
                const gamesPreview = col.games?.slice(0, 4) || [];
                const gamesCount = col.games?.length || 0;

                return (
                  <motion.div
                    key={col._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => setSelectedCollection(col)}
                    className="group cursor-pointer"
                  >
                    {/* Card */}
                    <div
                      className="relative aspect-[4/5] rounded-xl overflow-hidden transition-all duration-200 group-hover:ring-2 group-hover:ring-primary"
                      style={{ background: "var(--app-surface)" }}
                    >
                      {/* Cover mosaic */}
                      {gamesPreview.length > 0 ? (
                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
                          {[0, 1, 2, 3].map((i) => {
                            const gameEntry = gamesPreview[i];
                            const game = gameEntry?.serverGameId || gameEntry;
                            return (
                              <div
                                key={i}
                                className="relative overflow-hidden"
                                style={{
                                  background: isLight ? "#e5e7eb" : "#374151",
                                }}
                              >
                                {game?.coverUrl && (
                                  <GameCover
                                    src={game.coverUrl}
                                    alt={game.name || ""}
                                    className="w-full h-full object-cover"
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
                          style={{
                            background: isLight ? "#f3f4f6" : "#1f2937",
                          }}
                        >
                          <Icon
                            className="w-12 h-12"
                            style={{
                              color: "var(--app-textSecondary)",
                              opacity: 0.3,
                            }}
                          />
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)",
                        }}
                      />

                      {/* Content overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: "var(--app-primary)" }}
                          >
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm text-white truncate">
                              {col.name}
                            </h3>
                            <p className="text-xs text-white/70">
                              {gamesCount} {t("collections.games")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Hover actions */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleEdit(col, e)}
                          className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                          aria-label="Edit"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(col, e)}
                          className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500 transition-colors"
                          aria-label="Delete"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
                style={{
                  background: isLight
                    ? "rgba(0,0,0,0.05)"
                    : "rgba(255,255,255,0.05)",
                }}
              >
                <Icons.FaFolderOpen
                  className="w-12 h-12"
                  style={{ color: "var(--app-textSecondary)" }}
                />
              </div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: "var(--app-text)" }}
              >
                {searchQuery
                  ? t("collections.noResults")
                  : t("collections.emptyState")}
              </h2>
              <p
                className="text-sm mb-6 max-w-md"
                style={{ color: "var(--app-textSecondary)" }}
              >
                {searchQuery
                  ? t("collections.noResultsFor", { query: searchQuery })
                  : t("collections.emptyStateDesc")}
              </p>
              {!searchQuery && (
                <Button
                  variant="primary"
                  size="lg"
                  icon={<FiPlus />}
                  onClick={handleCreate}
                >
                  {t("collections.createFirst")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shared Modals - rendered outside main view but inside fragment */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={
          editingCollection
            ? t("collections.edit")
            : t("collections.newCollection")
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!formData.name.trim() || saving}
            >
              {saving
                ? t("common.saving")
                : editingCollection
                  ? t("common.save")
                  : t("common.create")}
            </Button>
          </>
        }
      >
        <CollectionForm formData={formData} setFormData={setFormData} t={t} />
      </Modal>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setCollectionToDelete(null);
        }}
        onConfirm={handleDelete}
        title={t("collections.deleteTitle")}
        message={t("collections.deleteMessage", {
          name: collectionToDelete?.name,
        })}
      />
    </>
  );
};

export default Collections;
