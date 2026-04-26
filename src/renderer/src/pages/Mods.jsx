import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logger from "../services/logger";
import {
  FiPlus,
  FiPackage,
  FiRefreshCw,
  FiTrash2,
  FiUser,
  FiCalendar,
  FiWifiOff,
} from "react-icons/fi";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/themeContext";
import { useAuth } from "../contexts/authContext";
import { useConnection } from "../contexts/connectionContext";
import { getAllGamesForAdmin, getModsForGame, deleteMod } from "../api/mods";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import ConfirmationModal from "../components/modals/ConfirmationModal";

// Lazy load modal for optimization
const UploadModModal = lazy(
  () => import("../components/modals/UploadModModal"),
);

const StatCard = ({ icon: Icon, label, value, color, delay = 0 }) => {
  const colorGradients = {
    blue: "var(--app-gradient-primary)",
    green: "var(--app-gradient-success)",
    purple: "var(--app-gradient-secondary)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card variant="stat" gradientColor={color}>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
              style={{
                background: colorGradients[color] || colorGradients.blue,
              }}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p
                className="text-sm"
                style={{ color: "var(--app-textSecondary)" }}
              >
                {label}
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--app-text)" }}
              >
                {value}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const Mods = () => {
  const { t } = useTranslation();
  const { getBackgroundStyle, getTextClass, isLight } = useTheme();
  const { user } = useAuth();
  const { isOnline } = useConnection();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [mods, setMods] = useState([]);
  const [loadingMods, setLoadingMods] = useState(false);
  const [modToDelete, setModToDelete] = useState(null);

  const loadGames = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const gamesList = await getAllGamesForAdmin();
      setGames(gamesList);
    } catch (error) {
      logger.error("Error loading games:", error);
      setFetchError(error.message || t("mods.loadingError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadMods = useCallback(async () => {
    if (!selectedGame) return;
    setLoadingMods(true);
    try {
      const data = await getModsForGame(selectedGame._id, { limit: 100 });
      setMods(data.mods || []);
    } catch (error) {
      logger.error("Error loading mods:", error);
      toast.error(t("mods.loadingError"));
    } finally {
      setLoadingMods(false);
    }
  }, [selectedGame, t]);

  useEffect(() => {
    if (isOnline !== true) {
      setLoading(false);
      return;
    }
    loadGames();
  }, [isOnline, loadGames]);

  useEffect(() => {
    if (selectedGame && isOnline === true) {
      loadMods();
    }
  }, [selectedGame, isOnline, loadMods]);

  const handleUploadSuccess = () => {
    loadGames();
    if (selectedGame) {
      loadMods();
    }
  };

  const handleDeleteMod = async () => {
    if (!modToDelete) return;
    try {
      await deleteMod(modToDelete._id);
      setMods((prev) => prev.filter((m) => m._id !== modToDelete._id));
      toast.success(t("mods.deletedFromServer"));
    } catch (error) {
      logger.error("Error deleting mod:", error);
      toast.error(error.message || t("mods.errorDelete"));
    } finally {
      setModToDelete(null);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={getBackgroundStyle("gradient")}
      >
        <Card className="text-center max-w-md">
          <div className="p-8">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(239, 68, 68, 0.15)" }}
            >
              <FiPackage
                className="w-12 h-12"
                style={{ color: "var(--app-error)" }}
              />
            </div>
            <h2
              className="text-2xl font-bold mb-3"
              style={{ color: "var(--app-text)" }}
            >
              {t("mods.accessDenied")}
            </h2>
            <p
              className="text-base"
              style={{ color: "var(--app-textSecondary)" }}
            >
              {t("mods.adminOnly")}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Block if offline
  if (!isOnline) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={getBackgroundStyle("gradient")}
      >
        <Card className="text-center max-w-md">
          <div className="p-8">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(245, 158, 11, 0.15)" }}
            >
              <FiWifiOff
                className="w-12 h-12"
                style={{ color: "var(--app-warning)" }}
              />
            </div>
            <h2
              className="text-2xl font-bold mb-3"
              style={{ color: "var(--app-text)" }}
            >
              {t("mods.offlineTitle")}
            </h2>
            <p
              className="text-base"
              style={{ color: "var(--app-textSecondary)" }}
            >
              {t("mods.offlineMessage")}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={getBackgroundStyle("gradient")}
    >
      {/* Header */}
      <div className="glass-strong border-b border-border/50 px-8 py-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
              style={{ background: "var(--app-gradient-primary)" }}
            >
              <FiPackage className="w-7 h-7" />
            </div>
            <div>
              <h1
                className="text-3xl font-bold"
                style={{ color: "var(--app-text)" }}
              >
                {t("mods.title")}
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--app-textSecondary)" }}
              >
                {t("mods.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="md"
              icon={<FiRefreshCw className={loading ? "animate-spin" : ""} />}
              onClick={loadGames}
              disabled={loading}
            >
              {t("mods.refresh")}
            </Button>

            <Button
              variant="primary"
              gradient={true}
              size="md"
              icon={<FiPlus />}
              onClick={() => setShowUploadModal(true)}
            >
              {t("mods.upload")}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {fetchError && !loading && (
            <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
              <span className="flex-1">{fetchError}</span>
              <button onClick={loadGames} className="underline hover:no-underline shrink-0">{t('games.retry')}</button>
            </div>
          )}
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className={`${getTextClass("secondary")}`}>
                {t("common.loading")}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard
                  icon={FiPackage}
                  label={t("mods.gamesAvailable")}
                  value={games.length}
                  color="blue"
                  delay={0}
                />
                <StatCard
                  icon={FiPackage}
                  label={t("mods.modsOnServer")}
                  value={selectedGame ? mods.length : "-"}
                  color="green"
                  delay={0.1}
                />
              </div>

              {/* Games List */}
              <Card variant="glass">
                <Card.Header
                  icon={<FiPackage className="w-6 h-6" />}
                  title={t("mods.gamesWithMods")}
                  subtitle={t("mods.selectGame")}
                />

                <Card.Body>
                  {games.length === 0 ? (
                    <div className="text-center py-12">
                      <FiPackage
                        className="w-16 h-16 mx-auto mb-4"
                        style={{ color: "var(--app-textSecondary)" }}
                      />
                      <p
                        className="text-lg font-medium"
                        style={{ color: "var(--app-text)" }}
                      >
                        {t("mods.noGamesAvailable")}
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: "var(--app-textSecondary)" }}
                      >
                        {t("mods.noGamesDesc")}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {games.map((game) => (
                        <motion.button
                          key={game._id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedGame(game)}
                          aria-label={game.name}
                          aria-pressed={selectedGame?._id === game._id}
                          className="p-4 rounded-xl border text-left transition-all relative overflow-hidden"
                          style={{
                            borderColor:
                              selectedGame?._id === game._id
                                ? "var(--app-primary)"
                                : "var(--app-border)",
                          }}
                        >
                          {selectedGame?._id === game._id && (
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                background: "var(--app-primary)",
                                opacity: 0.1,
                              }}
                            />
                          )}
                          <div className="flex items-center gap-3">
                            {game.coverUrl && (
                              <img
                                src={game.coverUrl}
                                alt={game.name}
                                className="w-12 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-semibold truncate"
                                style={{ color: "var(--app-text)" }}
                              >
                                {game.name}
                              </p>
                              <p
                                className="text-sm"
                                style={{ color: "var(--app-textSecondary)" }}
                              >
                                v{game.version}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Selected Game Mods */}
              {selectedGame && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card variant="glass">
                    <Card.Header
                      icon={<FiPackage className="w-6 h-6" />}
                      title={t("mods.modsFor", { name: selectedGame.name })}
                      subtitle={t("mods.manageServerMods")}
                    />

                    <Card.Body>
                      {loadingMods ? (
                        <div className="text-center py-12">
                          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                          <p className={`${getTextClass("secondary")}`}>
                            {t("mods.loadingMods")}
                          </p>
                        </div>
                      ) : mods.length === 0 ? (
                        <div className="text-center py-12">
                          <FiPackage
                            className="w-16 h-16 mx-auto mb-4"
                            style={{ color: "var(--app-textSecondary)" }}
                          />
                          <p
                            className="text-lg font-medium mb-2"
                            style={{ color: "var(--app-text)" }}
                          >
                            {t("mods.noModsOnServer")}
                          </p>
                          <p
                            className="text-sm mb-4"
                            style={{ color: "var(--app-textSecondary)" }}
                          >
                            {t("mods.uploadFirst")}
                          </p>
                          <Button
                            variant="primary"
                            gradient={true}
                            size="md"
                            icon={<FiPlus />}
                            onClick={() => setShowUploadModal(true)}
                          >
                            {t("mods.upload")}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {mods.map((mod) => (
                            <motion.div
                              key={mod._id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 rounded-xl border transition-all hover:shadow-lg"
                              style={{
                                background: "var(--app-surface)",
                                borderColor: "var(--app-border)",
                              }}
                            >
                              <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div
                                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                                  style={{
                                    background: "var(--app-gradient-primary)",
                                  }}
                                >
                                  <FiPackage className="w-6 h-6" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <h3
                                    className="text-lg font-bold mb-1"
                                    style={{ color: "var(--app-text)" }}
                                  >
                                    {mod.name}
                                  </h3>
                                  {mod.description && (
                                    <p
                                      className="text-sm mb-2"
                                      style={{
                                        color: "var(--app-textSecondary)",
                                      }}
                                    >
                                      {mod.description}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-3 text-xs">
                                    {mod.author && (
                                      <div className="flex items-center gap-1.5">
                                        <FiUser
                                          className="w-3.5 h-3.5"
                                          style={{
                                            color: "var(--app-primary)",
                                          }}
                                        />
                                        <span
                                          style={{
                                            color: "var(--app-textSecondary)",
                                          }}
                                        >
                                          {mod.author}
                                        </span>
                                      </div>
                                    )}
                                    {mod.version && (
                                      <span
                                        className="px-2 py-0.5 rounded"
                                        style={{
                                          background: "var(--app-primary)",
                                          opacity: 0.2,
                                          color: "var(--app-primary)",
                                        }}
                                      >
                                        v{mod.version}
                                      </span>
                                    )}
                                    {mod.createdAt && (
                                      <div className="flex items-center gap-1.5">
                                        <FiCalendar
                                          className="w-3.5 h-3.5"
                                          style={{
                                            color: "var(--app-textSecondary)",
                                          }}
                                        />
                                        <span
                                          style={{
                                            color: "var(--app-textSecondary)",
                                          }}
                                        >
                                          {new Date(
                                            mod.createdAt,
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={<FiTrash2 />}
                                  onClick={() => setModToDelete(mod)}
                                  className="flex-shrink-0"
                                  style={{ color: "var(--app-error)" }}
                                >
                                  {t("common.delete")}
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <Suspense fallback={null}>
            <UploadModModal
              onClose={() => setShowUploadModal(false)}
              onSuccess={handleUploadSuccess}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!modToDelete}
        onClose={() => setModToDelete(null)}
        onConfirm={handleDeleteMod}
        title={t("mods.deleteFromServer")}
        message={t("mods.confirmDelete")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        confirmColor="red"
        icon={FiTrash2}
      />
    </div>
  );
};

export default Mods;
