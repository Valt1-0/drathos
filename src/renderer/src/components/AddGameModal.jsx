import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchGamesFromIGDB } from "../api/igdb";
import { addGameToServer } from "../api/serverGames";
import { useAuth } from "../contexts/authContext";
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
  FiCheckCircle,
} from "react-icons/fi";

const AddGameModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [version, setVersion] = useState("1.0.0");
  const [isPublic, setIsPublic] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState("idle"); // idle, uploading, success, error
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

  const handleUpload = async () => {
    if (!selectedGame || !zipFile) {
      setErrorMessage("Veuillez sélectionner un jeu et un fichier");
      setUploadState("error");
      return;
    }

    try {
      setUploadState("uploading");
      setErrorMessage("");

      await addGameToServer(
        zipFile,
        version,
        isPublic,
        selectedGame.id,
        setUploadProgress,
      );

      setUploadState("success");

      // Attendre 2 secondes avant de fermer et notifier le parent
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        handleClose();
      }, 2000);
    } catch (err) {
      console.error("Erreur d'upload :", err);
      setErrorMessage(err.message || "Erreur lors de l'ajout du jeu");
      setUploadState("error");
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (uploadState === "uploading") {
      return; // Ne pas fermer pendant l'upload
    }

    setUploadProgress(0);
    setSelectedGame(null);
    setZipFile(null);
    setVersion("1.0.0");
    setQuery("");
    setSuggestions([]);
    setUploadState("idle");
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
            onClick={uploadState !== "uploading" ? handleClose : undefined}
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
              {uploadState !== "uploading" && uploadState !== "success" && (
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all duration-200"
                >
                  <FiX className="text-lg" />
                </button>
              )}

              {/* Success State */}
              {uploadState === "success" && (
                <div className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="flex justify-center mb-6"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-green-500/20 flex items-center justify-center shadow-lg shadow-green-500/30">
                      <FiCheckCircle className="text-4xl text-green-400" />
                    </div>
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold text-white text-center mb-4"
                  >
                    Jeu ajouté avec succès !
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-slate-300 text-center"
                  >
                    "{selectedGame?.name}" a été ajouté au serveur
                  </motion.p>
                </div>
              )}

              {/* Upload State */}
              {uploadState === "uploading" && (
                <div className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="flex justify-center mb-6"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <FiLoader className="text-4xl text-blue-400" />
                      </motion.div>
                    </div>
                  </motion.div>

                  <h2 className="text-2xl font-bold text-white text-center mb-4">
                    Upload en cours...
                  </h2>

                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Progression</span>
                      <span className="text-blue-400 font-bold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm">
                    Veuillez patienter pendant l'upload du jeu...
                  </p>
                </div>
              )}

              {/* Form State */}
              {uploadState !== "uploading" && uploadState !== "success" && (
                <div className="p-8">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <FiUpload className="text-3xl text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        Ajouter un jeu
                      </h2>
                      <p className="text-slate-400 text-sm">
                        Recherchez et uploadez un nouveau jeu
                      </p>
                    </div>
                  </div>

                  {/* Error Message */}
                  {uploadState === "error" && errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <FiAlertTriangle className="text-red-400 text-lg flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-red-400 font-semibold text-sm mb-1">
                            Erreur
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
                      Rechercher un jeu IGDB
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
                        placeholder="Rechercher un jeu par nom..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder-slate-500"
                        disabled={uploadState === "uploading"}
                      />
                    </div>
                  </div>

                  {/* Suggestions List */}
                  {!selectedGame && (
                    <div className="mb-6 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-slate-800 rounded-xl pr-2">
                      {loading && (
                        <div className="flex items-center justify-center py-8">
                          <FiLoader className="text-3xl text-blue-400 animate-spin" />
                          <span className="ml-3 text-slate-400">Recherche en cours...</span>
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
                                      : "Date inconnue"}
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
                          <p>Aucun jeu trouvé pour "{query}"</p>
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
                            <p className="text-sm text-slate-400">Jeu sélectionné</p>
                            <p className="font-bold text-white text-lg">{selectedGame.name}</p>
                          </div>
                        </div>
                      </div>

                      {/* File Upload */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Fichier du jeu
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            accept=".zip,.7z,.rar,.tar,.gz"
                            onChange={(e) => setZipFile(e.target.files[0])}
                            className="hidden"
                            id="file-upload"
                          />
                          <label
                            htmlFor="file-upload"
                            className={`flex items-center justify-center gap-3 w-full p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 group ${
                              zipFile
                                ? "bg-green-500/10 border-green-500/50"
                                : "bg-slate-800/50 border-slate-700 hover:border-blue-500"
                            }`}
                          >
                            <FiUpload className={`text-xl transition-colors ${
                              zipFile ? "text-green-400" : "text-slate-400 group-hover:text-blue-400"
                            }`} />
                            <span className={`transition-colors ${
                              zipFile ? "text-white" : "text-slate-400 group-hover:text-white"
                            }`}>
                              {zipFile ? zipFile.name : "Choisir un fichier (.zip, .7z, .rar, .tar, .gz)"}
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Version Input */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                          <FiFileText />
                          Version du jeu
                        </label>
                        <input
                          type="text"
                          value={version}
                          onChange={(e) => setVersion(e.target.value)}
                          placeholder="1.0.0"
                          className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                        />
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
                              {isPublic ? "Jeu Public" : "Jeu Privé"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {isPublic
                                ? "Visible par tous les utilisateurs"
                                : "Visible uniquement par vous"}
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
                          Retour
                        </button>
                        <button
                          onClick={handleUpload}
                          disabled={!zipFile}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <FiUpload />
                          Uploader
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddGameModal;
