import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPackage } from "react-icons/fi";
import { toast } from "sonner";
import { useTheme } from "../../contexts/themeContext";
import { getModsForGame, installMod, uninstallMod, toggleMod, getInstalledMods } from "../../api/mods";
import ModCard from "./ModCard";
import Button from "../ui/Button";

const ModManager = ({ gameId }) => {
  const { getTextClass } = useTheme();
  const [activeTab, setActiveTab] = useState("available"); // available, installed
  const [availableMods, setAvailableMods] = useState([]);
  const [installedMods, setInstalledMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(null);

  useEffect(() => {
    loadMods();
  }, [gameId]);

  const loadMods = async () => {
    setLoading(true);
    try {
      // Charger les mods disponibles depuis le serveur
      const available = await getModsForGame(gameId);
      setAvailableMods(available);

      // Charger les mods installés
      const installed = await getInstalledMods();
      // Filtrer pour ce jeu uniquement
      const gameInstalledMods = installed.filter(
        (im) => im.gameId._id === gameId || im.gameId === gameId
      );
      setInstalledMods(gameInstalledMods);
    } catch (error) {
      console.error("[ModManager] Error loading mods:", error);
      toast.error("Erreur lors du chargement des mods");
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (modId) => {
    setInstalling(modId);
    try {
      await installMod(modId, gameId);
      toast.success("Mod installé avec succès!");
      await loadMods(); // Recharger la liste
    } catch (error) {
      console.error("[ModManager] Error installing mod:", error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (modId) => {
    try {
      await uninstallMod(modId);
      toast.success("Mod désinstallé");
      await loadMods();
    } catch (error) {
      console.error("[ModManager] Error uninstalling mod:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleToggle = async (modId, enabled) => {
    try {
      await toggleMod(modId, enabled);
      toast.success(enabled ? "Mod activé" : "Mod désactivé");
      await loadMods();
    } catch (error) {
      console.error("[ModManager] Error toggling mod:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  // Vérifier si un mod est installé
  const isModInstalled = (modId) => {
    return installedMods.some((im) => im.modId._id === modId || im.modId === modId);
  };

  // Récupérer l'état enabled d'un mod installé
  const getModEnabled = (modId) => {
    const installed = installedMods.find(
      (im) => im.modId._id === modId || im.modId === modId
    );
    return installed?.enabled || false;
  };

  // Combiner les mods pour l'onglet "installed"
  const installedModsWithData = useMemo(() => {
    return installedMods.map((im) => ({
      ...im.modId,
      enabled: im.enabled,
      installedAt: im.installedAt,
    }));
  }, [installedMods]);

  const enabledCount = installedModsWithData.filter((m) => m.enabled).length;

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'var(--app-gradient-primary)' }}
          >
            <FiPackage className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--app-text)' }}>
              Mods
            </h2>
            <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>
              {installedModsWithData.length} installés · {enabledCount} actifs
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "available" ? "primary" : "ghost"}
          gradient={activeTab === "available"}
          size="md"
          onClick={() => setActiveTab("available")}
        >
          Disponibles ({availableMods.length})
        </Button>
        <Button
          variant={activeTab === "installed" ? "primary" : "ghost"}
          gradient={activeTab === "installed"}
          size="md"
          onClick={() => setActiveTab("installed")}
        >
          Installés ({installedModsWithData.length})
        </Button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "available" && (
          <motion.div
            key="available"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            {availableMods.length === 0 ? (
              <div className="text-center py-16">
                <FiPackage className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--app-textSecondary)' }} />
                <p className="text-lg font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                  Aucun mod disponible
                </p>
                <p style={{ color: 'var(--app-textSecondary)' }}>
                  Aucun mod n'est disponible pour ce jeu pour le moment
                </p>
              </div>
            ) : (
              availableMods.map((mod) => (
                <ModCard
                  key={mod._id}
                  mod={mod}
                  installed={isModInstalled(mod._id)}
                  enabled={getModEnabled(mod._id)}
                  onInstall={() => handleInstall(mod._id)}
                  onToggle={(enabled) => handleToggle(mod._id, enabled)}
                  onUninstall={() => handleUninstall(mod._id)}
                />
              ))
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
            {installedModsWithData.length === 0 ? (
              <div className="text-center py-16">
                <FiPackage className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--app-textSecondary)' }} />
                <p className="text-lg font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                  Aucun mod installé
                </p>
                <p style={{ color: 'var(--app-textSecondary)' }}>
                  Installez des mods depuis l'onglet "Disponibles"
                </p>
              </div>
            ) : (
              installedModsWithData.map((mod) => (
                <ModCard
                  key={mod._id}
                  mod={mod}
                  installed={true}
                  enabled={mod.enabled}
                  onToggle={(enabled) => handleToggle(mod._id, enabled)}
                  onUninstall={() => handleUninstall(mod._id)}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModManager;
