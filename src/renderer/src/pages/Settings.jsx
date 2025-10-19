import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FiSettings,
  FiUser,
  FiDownload,
  FiMoon,
  FiSun,
  FiFolder,
  FiCheck,
} from "react-icons/fi";
import { useAuth } from "../contexts/authContext";

const SettingsPage = () => {
  const [theme, setTheme] = useState("dark");
  const [downloadPath, setDownloadPath] = useState("");
  const { user } = useAuth();

  // Change le thème (clair/sombre)
  const handleThemeChange = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const selectDownloadPath = async () => {
    try {
      const newPath = await window.api.selectAndCreateFolder("DrathosGames");
      if (newPath) {
        setDownloadPath(newPath);
        window.store.set("downloadPath", newPath);
      }
    } catch (error) {
      console.error("Error selecting/creating folder:", error);
      toast.error("Erreur", {
        description: "Impossible de sélectionner le dossier",
      });
    }
  };

  // Sauvegarder les paramètres
  const handleSaveSettings = () => {
    try {
      toast.success("Paramètres sauvegardés", {
        description: "Vos modifications ont été enregistrées avec succès",
      });
    } catch (error) {
      toast.error("Erreur de sauvegarde", {
        description: "Impossible de sauvegarder les paramètres",
      });
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const storedPath = await window.store.get("downloadPath");
      const storedUsername = await window.store.get("username");

      if (storedPath) setDownloadPath(storedPath);
      if (storedUsername) setUsername(storedUsername);
    };

    fetchSettings();
  }, []);

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-800">
      <div className="px-6 md:px-16 py-6 pb-12 max-w-7xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <FiSettings className="text-white text-xl" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                Paramètres
              </h1>
            </div>
            <p className="text-gray-400 text-sm ml-13">
              Configurez votre expérience Drathos
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Section Compte */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-lg">
                    <FiUser className="text-blue-400 text-xl" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Compte</h3>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-gray-400 mb-2 block">
                      Nom d'utilisateur
                    </span>
                    <input
                      type="text"
                      value={user.username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full p-3 rounded-lg bg-gray-700/50 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      placeholder="Votre nom d'utilisateur"
                    />
                  </label>
                </div>
              </div>
            </motion.div>

            {/* Section Apparence */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-500/20 rounded-lg">
                    {theme === "dark" ? (
                      <FiMoon className="text-purple-400 text-xl" />
                    ) : (
                      <FiSun className="text-purple-400 text-xl" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white">Apparence</h3>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-gray-400 mb-2 block">
                      Thème de l'application
                    </span>
                    <button
                      onClick={handleThemeChange}
                      className="w-full p-3 rounded-lg bg-gray-700/50 border border-gray-600 hover:border-purple-500 hover:bg-gray-700 transition-all flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        {theme === "dark" ? (
                          <>
                            <FiMoon className="text-purple-400" />
                            <span>Mode sombre</span>
                          </>
                        ) : (
                          <>
                            <FiSun className="text-yellow-400" />
                            <span>Mode clair</span>
                          </>
                        )}
                      </span>
                      <span className="text-sm text-gray-400">
                        Cliquer pour changer
                      </span>
                    </button>
                  </label>
                </div>
              </div>
            </motion.div>

            {/* Section Téléchargement - Full width */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="lg:col-span-2 group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700/50 hover:border-green-500/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-lg">
                    <FiDownload className="text-green-400 text-xl" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Téléchargements
                  </h3>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-gray-400 mb-2 block">
                      Chemin d'installation des jeux
                    </span>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <FiFolder className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={downloadPath || "Aucun chemin sélectionné"}
                          readOnly
                          className="w-full pl-10 pr-3 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-300 cursor-not-allowed"
                        />
                      </div>
                      <button
                        onClick={selectDownloadPath}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-green-500/50 flex items-center gap-2"
                      >
                        <FiFolder />
                        Parcourir
                      </button>
                    </div>
                    {downloadPath && (
                      <p className="text-xs text-gray-500 mt-2">
                        Les jeux seront installés dans ce dossier
                      </p>
                    )}
                  </label>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bouton de sauvegarde */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-6 flex justify-end"
          >
            <button
              onClick={handleSaveSettings}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-500/50 flex items-center gap-2"
            >
              <FiCheck />
              Sauvegarder les paramètres
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
