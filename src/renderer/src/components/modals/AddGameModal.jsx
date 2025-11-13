import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchGamesFromIGDB } from "../../api/igdb";
import { addGameToServer } from "../../api/serverGames";
import { useAuth } from "../../contexts/authContext";
import { useUpload } from "../../contexts/uploadContext";
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
} from "react-icons/fi";
import { FaWindows, FaLinux, FaApple } from "react-icons/fa";

const PLATFORM_CONFIG = {
  windows: { icon: FaWindows, color: 'text-blue-400', label: 'Windows' },
  linux: { icon: FaLinux, color: 'text-yellow-400', label: 'Linux' },
  mac: { icon: FaApple, color: 'text-gray-400', label: 'Mac' }
};

const AddGameModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { startUpload, updateUploadProgress, completeUpload, failUpload } = useUpload();
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
        console.error("Erreur dans la recherche IGDB :", err);
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
        setErrorMessage(result.error || "Error scanning archive");
        setUploadState("error");
        return;
      }

      setZipFile({ name: result.fileName, path: result.filePath });
      setAvailableExecutables(result.executables || []);

      // Auto-sélection du meilleur exécutable
      const windowsExecs = result.executables?.filter(e => e.platform === 'windows') || [];
      if (windowsExecs.length === 1) {
        setExecutableName(windowsExecs[0].path);
      } else if (result.executables?.length === 1) {
        setExecutableName(result.executables[0].path);
      }
    } catch (error) {
      console.error("[AddGameModal] Erreur scan archive:", error);
      setAvailableExecutables([]);
      setErrorMessage("Error selecting file");
      setUploadState("error");
    } finally {
      setIsLoadingExecutables(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedGame || !zipFile) {
      setErrorMessage("Please select a game and a file");
      return;
    }

    try {
      setErrorMessage("");

      // Sauvegarder les infos avant de fermer la modal
      const gameInfo = {
        name: selectedGame.name,
        id: selectedGame.id,
        version,
        isPublic,
        executableName: executableName || null,
      };
      const fileInfo = { ...zipFile };

      // Fermer la modal IMMÉDIATEMENT pour éviter le freeze
      handleClose();

      // Démarrer l'upload dans le contexte global
      startUpload(gameInfo.name);

      // Lancer le processus en arrière-plan (ne bloque pas l'UI)
      setTimeout(async () => {
        try {
          let fileToUpload = fileInfo;

          // Convertir le path en File object si nécessaire
          if (fileInfo.path && !fileInfo.size) {
            const fileData = await window.api.readArchiveFile(fileInfo.path);
            if (!fileData.success) throw new Error(fileData.error);

            const blob = new Blob([fileData.buffer], { type: 'application/octet-stream' });
            fileToUpload = new File([blob], fileInfo.name, { type: 'application/octet-stream' });
          }

          // Lancer l'upload
          await addGameToServer(
            fileToUpload,
            gameInfo.version,
            gameInfo.isPublic,
            gameInfo.id,
            updateUploadProgress,
            gameInfo.executableName
          );

          // Upload réussi
          completeUpload();

          // Rafraîchir la liste après un court délai
          setTimeout(() => {
            onSuccess?.();
          }, 500);
        } catch (uploadError) {
          console.error("[AddGameModal] Erreur upload:", uploadError);
          failUpload(uploadError.message || "Erreur lors de l'ajout du jeu");
        }
      }, 100);
    } catch (err) {
      console.error("[AddGameModal] Erreur préparation upload:", err);
      setErrorMessage(err.message || "Erreur lors de la préparation de l'upload");
      failUpload(err.message || "Erreur lors de la préparation de l'upload");
    }
  };

  const handleClose = () => {
    // Reset tous les états
    setSelectedGame(null);
    setZipFile(null);
    setVersion("1.0.0");
    setExecutableName("");
    setAvailableExecutables([]);
    setIsLoadingExecutables(false);
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all duration-200"
              >
                <FiX className="text-lg" />
              </button>

              {/* Form */}
              <div className="p-8">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <FiUpload className="text-3xl text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        Add a Game
                      </h2>
                      <p className="text-slate-400 text-sm">
                        Search and upload a new game
                      </p>
                    </div>
                  </div>

                  {/* Error Message */}
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <FiAlertTriangle className="text-red-400 text-lg flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-red-400 font-semibold text-sm mb-1">
                            Error
                          </p>
                          <p className="text-slate-300 text-sm break-words">
                            {errorMessage}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Search Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Search for IGDB Game
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <FiSearch className="text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setSelectedGame(null);
                        }}
                        placeholder="Search for a game by name..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder-slate-500"
                      />
                    </div>
                  </div>

                  {/* Suggestions List */}
                  {!selectedGame && (
                    <div className="mb-6 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-slate-800 rounded-xl pr-2">
                      {loading && (
                        <div className="flex items-center justify-center py-8">
                          <FiLoader className="text-3xl text-blue-400 animate-spin" />
                          <span className="ml-3 text-slate-400">Searching...</span>
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
                              className="group p-4 bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 rounded-xl cursor-pointer transition-all duration-200 hover:bg-slate-800"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                                    {game.name}
                                  </div>
                                  <div className="text-sm text-slate-400">
                                    {game.first_release_date
                                      ? new Date(game.first_release_date * 1000).getFullYear()
                                      : "Unknown Date"}
                                  </div>
                                </div>
                                <FiCheck className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
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
                          className="text-center py-8 text-slate-400"
                        >
                          <FiSearch className="text-4xl mx-auto mb-2 opacity-50" />
                          <p>No games found for "{query}"</p>
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
                      <div className="p-4 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <FiCheck className="text-green-400 text-xl" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Selected Game</p>
                            <p className="font-bold text-white text-lg">{selectedGame.name}</p>
                          </div>
                        </div>
                      </div>

                      {/* File Upload */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Game File
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={handleSelectArchive}
                            disabled={isLoadingExecutables}
                            className={`flex items-center justify-center gap-3 w-full p-4 rounded-xl border-2 border-dashed transition-all duration-300 group ${
                              zipFile
                                ? "bg-green-500/10 border-green-500/50"
                                : "bg-slate-800/50 border-slate-700 hover:border-blue-500"
                            } ${isLoadingExecutables ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                          >
                            {isLoadingExecutables ? (
                              <FiLoader className="text-xl text-blue-400 animate-spin" />
                            ) : (
                              <FiUpload className={`text-xl transition-colors ${
                                zipFile ? "text-green-400" : "text-slate-400 group-hover:text-blue-400"
                              }`} />
                            )}
                            <span className={`transition-colors ${
                              zipFile ? "text-white" : "text-slate-400 group-hover:text-white"
                            }`}>
                              {isLoadingExecutables
                                ? "Analyzing..."
                                : zipFile
                                  ? zipFile.name
                                  : "Choose a file (.zip, .7z, .rar, .tar, .gz)"}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Version Input */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                          <FiFileText />
                          Game Version
                        </label>
                        <input
                          type="text"
                          value={version}
                          onChange={(e) => setVersion(e.target.value)}
                          placeholder="1.0.0"
                          className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                        />
                      </div>

                      {/* Executable Selection */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                          <FiCpu />
                          Executable to launch (optional)
                        </label>


                        {/* Executables Found - Liste groupée */}
                        {!isLoadingExecutables && availableExecutables.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-green-400 flex items-center gap-1">
                                <FiCheck className="text-sm" />
                                {availableExecutables.length} executable(s) found
                              </p>
                              {executableName && (
                                <button
                                  type="button"
                                  onClick={() => setExecutableName("")}
                                  className="text-xs text-slate-400 hover:text-white transition-colors"
                                >
                                  Clear Selection
                                </button>
                              )}
                            </div>

                            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-slate-800 rounded-xl">
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
                                            ? 'bg-blue-500/20 border-2 border-blue-500'
                                            : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-white text-sm truncate">{exe.name}</div>
                                            <div className="text-xs text-slate-400 mt-1 break-all">{exe.path}</div>
                                          </div>
                                          {executableName === exe.path && (
                                            <FiCheck className="text-blue-400 flex-shrink-0 mt-1" />
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
                              className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder-slate-500"
                            />
                            <p className="text-xs text-amber-400 flex items-center gap-1">
                              <FiAlertTriangle className="text-sm" />
                              No executables found automatically
                            </p>
                          </div>
                        )}

                        {/* No File Selected Yet */}
                        {!zipFile && (
                          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-500 text-sm">
                            Select a file first to detect executables
                          </div>
                        )}

                        <p className="text-xs text-slate-400 mt-2">
                          If empty, the game will automatically detect the executable on launch
                        </p>
                      </div>

                      {/* Public/Private Toggle */}
                      <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-3">
                          {isPublic ? (
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                              <FiUnlock className="text-green-400 text-xl" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                              <FiLock className="text-yellow-400 text-xl" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">
                              {isPublic ? "Public Game" : "Private Game"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {isPublic
                                ? "Visible to all users"
                                : "Visible only to you"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsPublic(!isPublic)}
                          className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                            isPublic ? "bg-green-500" : "bg-slate-600"
                          }`}
                        >
                          <motion.div
                            className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg"
                            animate={{ x: isPublic ? 28 : 0 }}
                            transition={{ duration: 0.2 }}
                          />
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => {
                            setSelectedGame(null);
                            setZipFile(null);
                            setErrorMessage("");
                            setUploadState("idle");
                          }}
                          className="flex-1 px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-xl font-medium transition-all duration-200 border border-slate-700/50"
                        >
                          Back
                        </button>
                        <button
                          onClick={handleUpload}
                          disabled={!zipFile}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <FiUpload />
                          Upload
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
