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
} from "react-icons/fi";

const AddGameModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [version, setVersion] = useState("1.0.0");
  const [isPublic, setIsPublic] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

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
      alert("Veuillez sélectionner un jeu et un fichier .zip");
      return;
    }

    try {
      await addGameToServer(
        zipFile,
        version,
        isPublic,
        selectedGame.id,
        setUploadProgress,
      );

      alert("Jeu ajouté avec succès !");
      onClose();
      setUploadProgress(0);
      setSelectedGame(null);
      setZipFile(null);
      setVersion("1.0.0");
    } catch (err) {
      console.error("Erreur d'upload :", err);
      alert("Erreur lors de l'ajout du jeu : " + err.message);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  // Security check: Only admins can add games
  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-6 md:p-8 rounded-2xl w-full max-w-lg relative shadow-2xl border border-gray-700 my-auto"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600 transition-all duration-300 group"
            >
              <FiX className="text-xl text-gray-400 group-hover:text-white" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <FiUpload className="text-2xl text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                  Ajouter un jeu
                </h2>
                <p className="text-sm text-gray-400">Recherchez et uploadez un nouveau jeu</p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedGame(null);
                }}
                placeholder="Rechercher un jeu par nom..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder-gray-400"
              />
            </div>

            {/* Suggestions List */}
            {!selectedGame && (
              <div className="mb-6 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-800 rounded-lg pr-2">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <FiLoader className="text-3xl text-blue-400 animate-spin" />
                    <span className="ml-3 text-gray-400">Recherche en cours...</span>
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
                        className="group p-4 bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600 hover:border-blue-500/50 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-700/70"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                              {game.name}
                            </div>
                            <div className="text-sm text-gray-400">
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
                    className="text-center py-8 text-gray-400"
                  >
                    <FiSearch className="text-4xl mx-auto mb-2 opacity-50" />
                    <p>Aucun jeu trouvé pour "{query}"</p>
                  </motion.div>
                )}
              </div>
            )}

            {/* Selected Game Details */}
            {selectedGame && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Selected Game Card */}
                <div className="p-4 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FiCheck className="text-green-400 text-xl" />
                    <div>
                      <p className="text-sm text-gray-400">Jeu sélectionné</p>
                      <p className="font-bold text-white text-lg">{selectedGame.name}</p>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Fichier du jeu (.zip, .7z, .rar, .tar, .gz)
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
                      className="flex items-center justify-center gap-2 w-full p-4 rounded-lg bg-gray-700/50 border-2 border-dashed border-gray-600 hover:border-blue-500 cursor-pointer transition-all duration-300 group"
                    >
                      <FiUpload className="text-xl text-gray-400 group-hover:text-blue-400 transition-colors" />
                      <span className="text-gray-400 group-hover:text-white transition-colors">
                        {zipFile ? zipFile.name : "Choisir un fichier"}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Version Input */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <FiFileText />
                    Version du jeu
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full p-3 rounded-lg bg-gray-700/50 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                  />
                </div>

                {/* Public/Private Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                  <div className="flex items-center gap-3">
                    {isPublic ? (
                      <FiUnlock className="text-green-400 text-xl" />
                    ) : (
                      <FiLock className="text-yellow-400 text-xl" />
                    )}
                    <div>
                      <p className="font-medium text-white">
                        {isPublic ? "Jeu Public" : "Jeu Privé"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {isPublic
                          ? "Visible par tous les utilisateurs"
                          : "Visible uniquement par vous"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPublic(!isPublic)}
                    className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                      isPublic ? "bg-green-500" : "bg-gray-600"
                    }`}
                  >
                    <motion.div
                      className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg"
                      animate={{ x: isPublic ? 28 : 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  </button>
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Upload en cours...</span>
                      <span className="text-blue-400 font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={() => setSelectedGame(null)}
                    className="w-full sm:flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-300"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!zipFile || uploadProgress > 0}
                    className="w-full sm:flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-2"
                  >
                    <FiUpload />
                    <span className="truncate">{uploadProgress > 0 ? "Upload..." : "Uploader"}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddGameModal;
