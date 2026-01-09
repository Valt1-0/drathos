import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPackage, FiSearch, FiCheckCircle, FiCircle } from "react-icons/fi";
import { toast } from "sonner";
import { useTheme } from "../../contexts/themeContext";
import { useDebounce } from "../../hooks/useDebounce";
import { getModsForGame, installMod, uninstallMod, toggleMod, getInstalledMods, verifyModIntegrity, deleteMod, normalizeGameId, normalizeModId } from "../../api/mods";
import ModCard from "./ModCard";
import Button from "../ui/Button";

const ModManager = ({ gameId, allowDownload = true }) => {
  const { getTextClass } = useTheme();
  const [activeTab, setActiveTab] = useState(allowDownload ? "available" : "installed");
  const [availableMods, setAvailableMods] = useState([]);
  const [installedMods, setInstalledMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [installing, setInstalling] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Pagination state (simplifié)
  const [pagination, setPagination] = useState({
    available: { page: 1, totalPages: 1, totalMods: 0 },
    installed: { page: 1, totalPages: 1, totalMods: 0 }
  });

  useEffect(() => {
    loadMods(true);
  }, [gameId]);

  const loadMods = async (reset = false) => {
    reset ? setLoading(true) : setLoadingMore(true);

    try {
      const [availableData, installedData] = await Promise.all([
        getModsForGame(gameId, { page: reset ? 1 : pagination.available.page, limit: 20 }),
        getInstalledMods({ limit: 100 })
      ]);

      // Normalize gameId for consistent comparison
      const normalizedGameId = normalizeGameId(gameId);
      const gameInstalledMods = installedData.installedMods.filter(
        (im) => normalizeGameId(im.gameId) === normalizedGameId
      );

      setAvailableMods(reset ? availableData.mods : prev => [...prev, ...availableData.mods]);
      setInstalledMods(gameInstalledMods);

      setPagination({
        available: {
          page: availableData.currentPage,
          totalPages: availableData.totalPages,
          totalMods: availableData.totalMods
        },
        installed: {
          page: 1,
          totalPages: 1,
          totalMods: gameInstalledMods.length
        }
      });
    } catch (error) {
      console.error("[ModManager] Load error:", error);

      let errorMessage = "Erreur de chargement des mods";
      if (error.message.includes("network") || error.message.includes("fetch")) {
        errorMessage = "Erreur réseau : Impossible de charger les mods";
      } else if (error.message.includes("404")) {
        errorMessage = "Jeu introuvable sur le serveur";
      } else if (error.message) {
        errorMessage = `Erreur : ${error.message}`;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreAvailable = async () => {
    if (pagination.available.page >= pagination.available.totalPages || loadingMore) return;

    setLoadingMore(true);
    try {
      const data = await getModsForGame(gameId, {
        page: pagination.available.page + 1,
        limit: 20
      });
      setAvailableMods(prev => [...prev, ...data.mods]);
      setPagination(prev => ({
        ...prev,
        available: { ...prev.available, page: prev.available.page + 1 }
      }));
    } catch (error) {
      console.error("[ModManager] Error loading more mods:", error);
      toast.error(`Erreur de chargement: ${error.message || "Impossible de charger plus de mods"}`);
    } finally {
      setLoadingMore(false);
    }
  };

  // Helper function to reload installed mods state
  const reloadInstalledMods = useCallback(async () => {
    try {
      const installedData = await getInstalledMods({ limit: 100 });

      // Normalize gameId for consistent comparison
      const normalizedGameId = normalizeGameId(gameId);
      const gameInstalledMods = installedData.installedMods.filter(
        (im) => normalizeGameId(im.gameId) === normalizedGameId
      );

      setInstalledMods(gameInstalledMods);
      setPagination(prev => ({
        ...prev,
        installed: { ...prev.installed, totalMods: gameInstalledMods.length }
      }));
      return gameInstalledMods;
    } catch (error) {
      console.error("[ModManager] Error reloading installed mods:", error);
      throw new Error(`Impossible de recharger les mods installés: ${error.message}`);
    }
  }, [gameId]);

  const handleInstall = useCallback(async (modId) => {
    setInstalling(modId);
    let installSucceeded = false;

    try {
      // Step 1: Download and install mod locally
      await installMod(modId, gameId);
      installSucceeded = true;

      // Step 2: Reload state from server to confirm
      try {
        await reloadInstalledMods();
        toast.success("Mod installé avec succès !");
      } catch (reloadError) {
        // Installation succeeded but reload failed - mod is still installed locally
        console.warn("[ModManager] Mod installed but state reload failed:", reloadError);
        toast.warning("Mod installé mais impossible de mettre à jour l'affichage. Rechargez la page.");
      }
    } catch (error) {
      console.error("[ModManager] Installation error:", error);

      // Provide detailed error message
      let errorMessage = "Erreur d'installation";
      if (error.message.includes("network") || error.message.includes("fetch")) {
        errorMessage = "Erreur réseau : Impossible de télécharger le mod";
      } else if (error.message.includes("disk") || error.message.includes("ENOSPC")) {
        errorMessage = "Espace disque insuffisant";
      } else if (error.message.includes("permission")) {
        errorMessage = "Permissions insuffisantes pour installer le mod";
      } else if (error.message) {
        errorMessage = `Erreur : ${error.message}`;
      }

      toast.error(errorMessage);

      // If installation succeeded but we're in the catch, it means reload failed
      if (installSucceeded) {
        toast.info("Le mod est peut-être installé. Vérifiez l'onglet 'Installés'.");
      }
    } finally {
      setInstalling(null);
    }
  }, [gameId, reloadInstalledMods]);

  const handleUninstall = useCallback(async (modId) => {
    try {
      await uninstallMod(modId);
      await reloadInstalledMods();
      toast.success("Mod désinstallé avec succès");
    } catch (error) {
      console.error("[ModManager] Uninstall error:", error);

      let errorMessage = "Erreur de désinstallation";
      if (error.message.includes("not found") || error.message.includes("404")) {
        errorMessage = "Mod introuvable ou déjà désinstallé";
      } else if (error.message.includes("permission")) {
        errorMessage = "Permissions insuffisantes pour supprimer les fichiers";
      } else if (error.message) {
        errorMessage = `Erreur : ${error.message}`;
      }

      toast.error(errorMessage);
    }
  }, [reloadInstalledMods]);

  const handleToggle = useCallback(async (modId, enabled) => {
    // Optimistic update
    setInstalledMods(prev => prev.map(m => m._id === modId ? { ...m, enabled } : m));

    try {
      await toggleMod(modId, enabled);
      toast.success(enabled ? "Mod activé" : "Mod désactivé");
    } catch (error) {
      console.error("[ModManager] Toggle error:", error);

      // Rollback on error
      setInstalledMods(prev => prev.map(m => m._id === modId ? { ...m, enabled: !enabled } : m));

      let errorMessage = `Impossible de ${enabled ? "activer" : "désactiver"} le mod`;
      if (error.message) {
        errorMessage = `Erreur : ${error.message}`;
      }
      toast.error(errorMessage);
    }
  }, []);

  const handleVerifyIntegrity = useCallback(async (modId) => {
    try {
      const result = await verifyModIntegrity(modId, gameId);
      if (!result.success) {
        toast.error(`Échec de la vérification : ${result.error || "Erreur inconnue"}`);
        return;
      }

      const messages = {
        valid: { type: 'success', text: '✓ Intégrité vérifiée - Fichiers OK' },
        corrupted: { type: 'error', text: '✗ Fichiers corrompus - Réinstallation recommandée' },
        missing: { type: 'error', text: '✗ Fichiers manquants - Réinstaller le mod' },
        unknown: { type: 'warning', text: '⚠ Hash inconnu - Impossible de vérifier' }
      };

      const msg = messages[result.integrity] || { type: 'info', text: result.message };
      toast[msg.type](msg.text, { duration: 4000 });
    } catch (error) {
      console.error("[ModManager] Integrity check error:", error);
      toast.error(`Erreur de vérification : ${error.message || "Impossible de vérifier les fichiers"}`);
    }
  }, [gameId]);

  const handleDelete = useCallback(async (modId) => {
    try {
      await deleteMod(modId);
      setAvailableMods(prev => prev.filter(m => m._id !== modId));
      setPagination(prev => ({
        ...prev,
        available: { ...prev.available, totalMods: prev.available.totalMods - 1 }
      }));
      toast.success("Mod supprimé du serveur");
    } catch (error) {
      console.error("[ModManager] Delete error:", error);

      let errorMessage = "Erreur de suppression";
      if (error.message.includes("404") || error.message.includes("not found")) {
        errorMessage = "Mod introuvable sur le serveur";
      } else if (error.message.includes("403") || error.message.includes("forbidden")) {
        errorMessage = "Permissions insuffisantes pour supprimer ce mod";
      } else if (error.message) {
        errorMessage = `Erreur : ${error.message}`;
      }

      toast.error(errorMessage);
    }
  }, []);

  // Memoize installed mod IDs for performance (normalized to strings)
  const installedModIds = useMemo(() =>
    new Set(installedMods.map(im => normalizeModId(im.modId)).filter(Boolean)),
    [installedMods]
  );

  const isModInstalled = (modId) => installedModIds.has(normalizeModId(modId));

  const getModEnabled = (modId) => {
    const normalizedId = normalizeModId(modId);
    return installedMods.find(im => normalizeModId(im.modId) === normalizedId)?.enabled || false;
  };

  const installedModsWithData = useMemo(() =>
    installedMods.map(im => ({ ...im.modId, enabled: im.enabled, installedAt: im.installedAt })),
    [installedMods]
  );

  const enabledCount = useMemo(() =>
    installedModsWithData.filter(m => m.enabled).length,
    [installedModsWithData]
  );

  // Filter mods based on search (debounced for performance)
  const filteredAvailableMods = useMemo(() => {
    if (!debouncedSearchQuery) return availableMods;

    const query = debouncedSearchQuery.toLowerCase();
    return availableMods.filter(mod =>
      mod.name.toLowerCase().includes(query) ||
      mod.author?.toLowerCase().includes(query) ||
      mod.description?.toLowerCase().includes(query)
    );
  }, [availableMods, debouncedSearchQuery]);

  const filteredInstalledMods = useMemo(() => {
    if (!debouncedSearchQuery) return installedModsWithData;

    const query = debouncedSearchQuery.toLowerCase();
    return installedModsWithData.filter(mod =>
      mod.name?.toLowerCase().includes(query) ||
      mod.author?.toLowerCase().includes(query) ||
      mod.description?.toLowerCase().includes(query)
    );
  }, [installedModsWithData, debouncedSearchQuery]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--app-primary)' }}></div>
        <p className="mt-4" style={{ color: 'var(--app-textSecondary)' }}>Chargement des mods...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
              style={{ background: 'var(--app-gradient-primary)' }}
            >
              <FiPackage className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>
                Mods
              </h2>
              <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>
                Gérez les modifications de votre jeu
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={`grid ${allowDownload ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-4`}>
          {allowDownload && (
            <div className="p-4 rounded-lg" style={{ background: 'var(--app-surface)' }}>
              <div className="flex items-center gap-2 mb-1">
                <FiPackage className="w-4 h-4" style={{ color: 'var(--app-primary)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--app-textSecondary)' }}>DISPONIBLES</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{pagination.available.totalMods}</p>
            </div>
          )}
          <div className="p-4 rounded-lg" style={{ background: 'var(--app-surface)' }}>
            <div className="flex items-center gap-2 mb-1">
              <FiCircle className="w-4 h-4" style={{ color: 'var(--app-secondary)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--app-textSecondary)' }}>INSTALLÉS</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{pagination.installed.totalMods}</p>
          </div>
          <div className="p-4 rounded-lg" style={{ background: 'var(--app-surface)' }}>
            <div className="flex items-center gap-2 mb-1">
              <FiCheckCircle className="w-4 h-4" style={{ color: 'var(--app-success)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--app-textSecondary)' }}>ACTIFS</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{enabledCount}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <FiSearch
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
            style={{ color: 'var(--app-textSecondary)' }}
          />
          <input
            type="text"
            placeholder="Rechercher un mod..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg outline-none transition-all"
            style={{
              background: 'var(--app-surface)',
              border: '1px solid var(--app-border)',
              color: 'var(--app-text)'
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {allowDownload && (
          <Button
            variant={activeTab === "available" ? "primary" : "ghost"}
            gradient={activeTab === "available"}
            size="md"
            onClick={() => setActiveTab("available")}
          >
            Disponibles ({pagination.available.totalMods})
          </Button>
        )}
        <Button
          variant={activeTab === "installed" ? "primary" : "ghost"}
          gradient={activeTab === "installed"}
          size="md"
          onClick={() => setActiveTab("installed")}
        >
          Installés ({pagination.installed.totalMods})
        </Button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {allowDownload && activeTab === "available" && (
          <motion.div
            key="available"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            {filteredAvailableMods.length === 0 ? (
              <div className="text-center py-16">
                <FiPackage className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--app-textSecondary)' }} />
                <p className="text-lg font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                  {debouncedSearchQuery ? "Aucun résultat" : "Aucun mod disponible"}
                </p>
                <p style={{ color: 'var(--app-textSecondary)' }}>
                  {searchQuery ? "Essayez une autre recherche" : "Aucun mod n'est disponible pour ce jeu pour le moment"}
                </p>
              </div>
            ) : (
              <>
                {filteredAvailableMods.map((mod) => (
                  <ModCard
                    key={mod._id}
                    mod={mod}
                    installed={isModInstalled(mod._id)}
                    enabled={getModEnabled(mod._id)}
                    installing={installing === mod._id}
                    onInstall={() => handleInstall(mod._id)}
                    onToggle={(enabled) => handleToggle(mod._id, enabled)}
                    onUninstall={() => handleUninstall(mod._id)}
                    onDelete={!allowDownload ? () => handleDelete(mod._id) : undefined}
                  />
                ))}

                {/* Load More Button */}
                {pagination.available.page < pagination.available.totalPages && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={loadMoreAvailable}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Chargement...
                        </>
                      ) : (
                        `Charger plus (${availableMods.length} / ${pagination.available.totalMods})`
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === "installed" && (
          <motion.div
            key="installed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            {filteredInstalledMods.length === 0 ? (
              <div className="text-center py-16">
                <FiPackage className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--app-textSecondary)' }} />
                <p className="text-lg font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                  {debouncedSearchQuery ? "Aucun résultat" : "Aucun mod installé"}
                </p>
                <p style={{ color: 'var(--app-textSecondary)' }}>
                  {searchQuery ? "Essayez une autre recherche" : (allowDownload ? "Installez des mods depuis l'onglet \"Disponibles\"" : "Aucun mod n'est installé pour ce jeu")}
                </p>
              </div>
            ) : (
              <>
                {filteredInstalledMods.map((mod) => (
                  <ModCard
                    key={mod._id}
                    mod={mod}
                    installed={true}
                    enabled={mod.enabled}
                    onToggle={(enabled) => handleToggle(mod._id, enabled)}
                    onUninstall={() => handleUninstall(mod._id)}
                    onVerifyIntegrity={() => handleVerifyIntegrity(mod._id)}
                  />
                ))}

              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModManager;
