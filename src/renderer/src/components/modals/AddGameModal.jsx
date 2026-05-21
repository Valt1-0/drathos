import { useState, useEffect } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { searchGamesFromIGDB } from "../../api/igdb";
import { addGameToServer } from "../../api/serverGames";
import { useAuth } from "../../contexts/authContext";
import { useUpload } from "../../contexts/uploadContext";
import logger from "../../services/logger";
import {
  FiSearch,
  FiX,
  FiUpload,
  FiCheck,
  FiLoader,
  FiFileText,
  FiLock,
  FiUnlock,
  FiAlertTriangle,
  FiCpu,
  FiUsers,
} from "react-icons/fi";
import { FaWindows, FaLinux, FaApple } from "react-icons/fa";

const PLATFORM_CONFIG = {
  windows: { icon: FaWindows, color: 'text-primary', label: 'Windows' },
  linux: { icon: FaLinux, color: 'text-warning', label: 'Linux' },
  mac: { icon: FaApple, color: 'text-text-secondary', label: 'Mac' }
};

const AddGameModal = ({ isOpen, onClose, onSuccess }) => {
  const containerRef = useFocusTrap(isOpen);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { startUpload, updateUploadProgress, completeUpload, failUpload, duplicateUpload } = useUpload();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [version, setVersion] = useState("1.0.0");
  const [executableName, setExecutableName] = useState("");
  const [availableExecutables, setAvailableExecutables] = useState([]);
  const [isLoadingExecutables, setIsLoadingExecutables] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [multiplayer, setMultiplayer] = useState({
    enabled: false,
    type: null,
    maxPlayers: null,
    modes: []
  });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchGamesFromIGDB(query);
        setSuggestions(data || []);
      } catch (err) {
        logger.error("[AddGameModal] IGDB search error:", err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (id) => {
    const game = suggestions.find((g) => g.id === id);
    setSelectedGame(game);
    setSuggestions([]);
    setQuery(game.name);
  };

  const handleSelectArchive = async () => {
    setIsLoadingExecutables(true);
    setAvailableExecutables([]);

    try {
      const result = await window.api.selectAndScanArchive();

      if (result.canceled) return;

      if (!result.success) {
        setErrorMessage(result.error || t("modals.addGame.errorScanArchive"));
        return;
      }

      setZipFile({ name: result.fileName, path: result.filePath });
      setAvailableExecutables(result.executables || []);

      // Auto-select the best executable
      const windowsExecs = result.executables?.filter(e => e.platform === 'windows') || [];
      if (windowsExecs.length === 1) {
        setExecutableName(windowsExecs[0].path);
      } else if (result.executables?.length === 1) {
        setExecutableName(result.executables[0].path);
      }
    } catch (error) {
      logger.error("[AddGameModal] Archive scan error:", error);
      setAvailableExecutables([]);
      setErrorMessage(t("modals.addGame.errorSelectFile"));
    } finally {
      setIsLoadingExecutables(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedGame || !zipFile) {
      setErrorMessage(t("modals.addGame.errorSelectGame"));
      return;
    }

    // Validate version format (should be X.Y.Z or similar)
    const versionPattern = /^\d+(\.\d+)*$/;
    if (!version.trim()) {
      setErrorMessage(t("modals.addGame.errorVersionRequired"));
      return;
    }
    if (!versionPattern.test(version.trim())) {
      setErrorMessage(t("modals.addGame.errorInvalidVersion"));
      return;
    }

    try {
      setErrorMessage("");

      // Save the info before closing the modal
      const gameInfo = {
        name: selectedGame.name,
        id: selectedGame.id,
        version,
        isPublic,
        multiplayer,
        executableName: executableName || null,
      };
      const fileInfo = { ...zipFile };

      // Close the modal IMMEDIATELY to avoid freezing
      handleClose();

      // Start the upload in the global context
      startUpload(gameInfo.name);

      // Run the process in the background (does not block the UI)
      setTimeout(async () => {
        try {
          let fileToUpload = fileInfo;

          // Convert the path to a File object if needed
          if (fileInfo.path && !fileInfo.size) {
            const fileData = await window.api.readArchiveFile(fileInfo.path);
            if (!fileData.success) throw new Error(fileData.error);

            const blob = new Blob([fileData.buffer], { type: 'application/octet-stream' });
            fileToUpload = new File([blob], fileInfo.name, { type: 'application/octet-stream' });
          }

          // Start the upload
          await addGameToServer(
            fileToUpload,
            gameInfo.version,
            gameInfo.isPublic,
            gameInfo.id,
            updateUploadProgress,
            gameInfo.executableName,
            gameInfo.multiplayer
          );

          // Upload successful
          completeUpload();

          // Refresh the list after a short delay
          setTimeout(() => {
            onSuccess?.();
          }, 500);
        } catch (uploadError) {
          logger.error("[AddGameModal] Upload error:", uploadError);
          if (uploadError.isDuplicate) {
            duplicateUpload();
          } else {
            failUpload(uploadError.message || t("modals.addGame.uploadFailed"));
          }
        }
      }, 100);
    } catch (err) {
      logger.error("[AddGameModal] Upload preparation error:", err);
      setErrorMessage(err.message || t("modals.addGame.uploadPrepFailed"));
      failUpload(err.message || t("modals.addGame.uploadPrepFailed"));
    }
  };

  const handleClose = () => {
    // Reset all states
    setSelectedGame(null);
    setZipFile(null);
    setVersion("1.0.0");
    setExecutableName("");
    setAvailableExecutables([]);
    setIsLoadingExecutables(false);
    setIsPublic(true);
    setMultiplayer({
      enabled: false,
      type: null,
      maxPlayers: null,
      modes: []
    });
    setQuery("");
    setSuggestions([]);
    setErrorMessage("");
    onClose();
  };

  if (!isOpen) return null;

  // Security check: Only admins can add games
  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="glass backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-surface hover:bg-surface/80 text-text-secondary hover:text-text transition-all duration-200"
                aria-label="Close"
              >
                <FiX className="text-lg" />
              </button>

              {/* Form */}
              <div className="p-8">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary">
                      <FiUpload className="text-3xl text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-text">
                        {t("modals.addGame.title")}
                      </h2>
                      <p className="text-text-secondary text-sm">
                        {t("modals.addGame.subtitle")}
                      </p>
                    </div>
                  </div>

                  {/* Error Message */}
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 bg-error/10 border border-error/20 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <FiAlertTriangle className="text-error text-lg flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-error font-semibold text-sm mb-1">
                            {t("common.error")}
                          </p>
                          <p className="text-text-secondary text-sm break-words">
                            {errorMessage}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Search Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t("modals.addGame.searchIGDB")}
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <FiSearch className="text-text-secondary" />
                      </div>
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setSelectedGame(null);
                        }}
                        placeholder={t("modals.addGame.searchPlaceholder")}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text placeholder-text-secondary"
                      />
                    </div>
                  </div>

                  {/* Suggestions List */}
                  {!selectedGame && (
                    <div className="mb-6 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-primary scrollbar-track-surface rounded-xl pr-2">
                      {loading && (
                        <div className="flex items-center justify-center py-8">
                          <FiLoader className="text-3xl text-primary animate-spin" />
                          <span className="ml-3 text-text-secondary">{t("modals.addGame.searching")}</span>
                        </div>
                      )}

                      {!loading && suggestions.length > 0 && (
                        <div className="space-y-2">
                          {suggestions.map((game, index) => (
                            <motion.div
                              key={game.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: index * 0.03,
                                duration: 0.3,
                                ease: "easeOut"
                              }}
                              onClick={() => handleSelect(game.id)}
                              className="group p-4 bg-surface border border-border hover:border-primary/50 rounded-xl cursor-pointer transition-all duration-200 hover:bg-surface/80"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-semibold text-text group-hover:text-primary transition-colors">
                                    {game.name}
                                  </div>
                                  <div className="text-sm text-text-secondary">
                                    {game.first_release_date
                                      ? new Date(game.first_release_date * 1000).getFullYear()
                                      : "Unknown Date"}
                                  </div>
                                </div>
                                <FiCheck className="text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {!loading && query.length >= 2 && suggestions.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="text-center py-8 text-text-secondary"
                        >
                          <FiSearch className="text-4xl mx-auto mb-2 opacity-50" />
                          <p>{t("modals.addGame.noResults", { query })}</p>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Selected Game Form */}
                  {selectedGame && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {/* Selected Game Card */}
                      <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <FiCheck className="text-success text-xl" />
                          </div>
                          <div>
                            <p className="text-sm text-text-secondary">{t("modals.addGame.selectedGame")}</p>
                            <p className="font-bold text-text text-lg">{selectedGame.name}</p>
                          </div>
                        </div>
                      </div>

                      {/* File Upload */}
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          {t("modals.addGame.gameFile")}
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={handleSelectArchive}
                            disabled={isLoadingExecutables}
                            className={`flex items-center justify-center gap-3 w-full p-4 rounded-xl border-2 border-dashed transition-all duration-300 group ${
                              zipFile
                                ? "bg-success/10 border-success/50"
                                : "bg-surface border border-border hover:border-primary"
                            } ${isLoadingExecutables ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                          >
                            {isLoadingExecutables ? (
                              <FiLoader className="text-xl text-primary animate-spin" />
                            ) : (
                              <FiUpload className={`text-xl transition-colors ${
                                zipFile ? "text-success" : "text-text-secondary group-hover:text-primary"
                              }`} />
                            )}
                            <span className={`transition-colors ${
                              zipFile ? "text-text" : "text-text-secondary group-hover:text-text"
                            }`}>
                              {isLoadingExecutables
                                ? t("modals.addGame.analyzing")
                                : zipFile
                                  ? zipFile.name
                                  : t("modals.addGame.chooseFile")}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Version Input */}
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                          <FiFileText />
                          {t("modals.addGame.version")}
                        </label>
                        <input
                          type="text"
                          value={version}
                          onChange={(e) => setVersion(e.target.value)}
                          placeholder="1.0.0"
                          className="w-full p-3 rounded-xl bg-surface border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text"
                        />
                      </div>

                      {/* Executable Selection */}
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                          <FiCpu />
                          {t("modals.addGame.executable")}
                        </label>


                        {/* Executables Found - Grouped list */}
                        {!isLoadingExecutables && availableExecutables.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-success flex items-center gap-1">
                                <FiCheck className="text-sm" />
                                {availableExecutables.length} {t("modals.addGame.executablesFound")}
                              </p>
                              {executableName && (
                                <button
                                  type="button"
                                  onClick={() => setExecutableName("")}
                                  className="text-xs text-text-secondary hover:text-text transition-colors"
                                >
                                  {t("modals.addGame.clearSelection")}
                                </button>
                              )}
                            </div>

                            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-primary scrollbar-track-surface rounded-xl">
                              {Object.entries(PLATFORM_CONFIG).map(([platform, config]) => {
                                const execs = availableExecutables.filter(e => e.platform === platform);
                                if (execs.length === 0) return null;

                                const { icon: Icon, color, label } = config;

                                return (
                                  <div key={platform} className="space-y-1">
                                    <div className={`flex items-center gap-2 px-2 py-1 ${color} text-xs font-semibold`}>
                                      <Icon className="text-sm" />
                                      {label} ({execs.length})
                                    </div>
                                    {execs.map((exe, index) => (
                                      <button
                                        key={index}
                                        type="button"
                                        onClick={() => setExecutableName(exe.path)}
                                        className={`w-full text-left p-3 rounded-lg transition-all ${
                                          executableName === exe.path
                                            ? 'bg-primary/20 border-2 border-primary'
                                            : 'bg-surface border border-border hover:border-border/60 hover:bg-surface/80'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-text text-sm truncate">{exe.name}</div>
                                            <div className="text-xs text-text-secondary mt-1 break-all">{exe.path}</div>
                                          </div>
                                          {executableName === exe.path && (
                                            <FiCheck className="text-primary flex-shrink-0 mt-1" />
                                          )}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* No Executables Found or No File - Manual Input */}
                        {!isLoadingExecutables && zipFile && availableExecutables.length === 0 && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={executableName}
                              onChange={(e) => setExecutableName(e.target.value)}
                              placeholder="ex: game.exe or bin/server.exe"
                              className="w-full p-3 rounded-xl bg-surface border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text placeholder-text-secondary"
                            />
                            <p className="text-xs text-warning flex items-center gap-1">
                              <FiAlertTriangle className="text-sm" />
                              {t("modals.addGame.noExecutables")}
                            </p>
                          </div>
                        )}

                        {/* No File Selected Yet */}
                        {!zipFile && (
                          <div className="p-3 rounded-xl bg-surface border border-border text-text-secondary text-sm">
                            {t("modals.addGame.selectFile")}
                          </div>
                        )}

                        <p className="text-xs text-text-secondary mt-2">
                          {t("modals.addGame.executableDesc")}
                        </p>
                      </div>

                      {/* Public/Private Toggle */}
                      <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border">
                        <div className="flex items-center gap-3">
                          {isPublic ? (
                            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                              <FiUnlock className="text-success text-xl" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                              <FiLock className="text-warning text-xl" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-text">
                              {isPublic ? t("modals.addGame.publicGame") : t("modals.addGame.privateGame")}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {isPublic
                                ? t("modals.addGame.publicDesc")
                                : t("modals.addGame.privateDesc")}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsPublic(!isPublic)}
                          className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                            isPublic ? "bg-success" : "bg-surface"
                          }`}
                        >
                          <motion.div
                            className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg"
                            animate={{ x: isPublic ? 28 : 0 }}
                            transition={{ duration: 0.2 }}
                          />
                        </button>
                      </div>

                      {/* Multiplayer Section */}
                      <div className="space-y-3">
                        {/* Main Toggle */}
                        <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              multiplayer.enabled ? "bg-secondary/20" : "bg-surface"
                            }`}>
                              <FiUsers className={`text-xl ${
                                multiplayer.enabled ? "text-secondary" : "text-text-secondary"
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium text-text">
                                {multiplayer.enabled ? t("modals.addGame.multiplayerGame") : t("modals.addGame.singlePlayerGame")}
                              </p>
                              <p className="text-xs text-text-secondary">
                                {multiplayer.enabled
                                  ? t("modals.addGame.multiplayerDesc")
                                  : t("modals.addGame.singlePlayerDesc")}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setMultiplayer(prev => ({ ...prev, enabled: !prev.enabled }))}
                            className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                              multiplayer.enabled ? "bg-secondary" : "bg-surface"
                            }`}
                          >
                            <motion.div
                              className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg"
                              animate={{ x: multiplayer.enabled ? 28 : 0 }}
                              transition={{ duration: 0.2 }}
                            />
                          </button>
                        </div>

                        {/* Multiplayer Details (conditional) */}
                        <AnimatePresence>
                          {multiplayer.enabled && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-3 overflow-hidden"
                            >
                              {/* Type */}
                              <div className="p-4 bg-surface rounded-xl border border-border">
                                <label className="block text-sm font-medium text-text mb-2">{t("modals.addGame.connectionType")}</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {['online', 'local', 'both'].map((type) => (
                                    <button
                                      key={type}
                                      onClick={() => setMultiplayer(prev => ({ ...prev, type }))}
                                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                        multiplayer.type === type
                                          ? 'bg-secondary text-white'
                                          : 'bg-background hover:bg-background-secondary text-text-secondary'
                                      }`}
                                    >
                                      {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Max Players */}
                              <div className="p-4 bg-surface rounded-xl border border-border">
                                <label className="block text-sm font-medium text-text mb-2">{t("modals.addGame.maxPlayers")}</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="999"
                                  value={multiplayer.maxPlayers || ''}
                                  onChange={(e) => setMultiplayer(prev => ({
                                    ...prev,
                                    maxPlayers: e.target.value ? parseInt(e.target.value) : null
                                  }))}
                                  placeholder="e.g., 4"
                                  className="w-full px-4 py-2 bg-background rounded-lg border border-border text-text focus:outline-none focus:ring-2 focus:ring-secondary"
                                />
                              </div>

                              {/* Modes */}
                              <div className="p-4 bg-surface rounded-xl border border-border">
                                <label className="block text-sm font-medium text-text mb-2">{t("modals.addGame.gameModes")}</label>
                                <div className="flex gap-3">
                                  {['co-op', 'pvp'].map((mode) => (
                                    <button
                                      key={mode}
                                      onClick={() => {
                                        setMultiplayer(prev => ({
                                          ...prev,
                                          modes: prev.modes.includes(mode)
                                            ? prev.modes.filter(m => m !== mode)
                                            : [...prev.modes, mode]
                                        }));
                                      }}
                                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        multiplayer.modes.includes(mode)
                                          ? 'bg-secondary text-white'
                                          : 'bg-background hover:bg-background-secondary text-text-secondary'
                                      }`}
                                    >
                                      {mode === 'co-op' ? 'Co-op' : 'PvP'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => {
                            setSelectedGame(null);
                            setZipFile(null);
                            setErrorMessage("");
                          }}
                          className="flex-1 px-6 py-3 bg-surface hover:bg-surface/80 text-text-secondary hover:text-text rounded-xl font-medium transition-all duration-200 border border-border"
                        >
                          {t("modals.addGame.back")}
                        </button>
                        <button
                          onClick={handleUpload}
                          disabled={!zipFile}
                          className="flex-1 px-6 py-3 bg-success hover:bg-success/80 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-glow-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <FiUpload />
                          {t("modals.addGame.upload")}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddGameModal;
