import React, { useState, useEffect } from "react";

const SettingsPage = () => {
  const [theme, setTheme] = useState("light");
  const [downloadPath, setDownloadPath] = useState("");
  const [username, setUsername] = useState("JohnDoe");

  // Change le thème (clair/sombre)
  const handleThemeChange = () => {
    setTheme(theme === "light" ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "light");
  };

  const selectDownloadPath = async () => {
    try {
      const newPath = await window.api.selectAndCreateFolder("DrathosGames");
      if (newPath) {
        setDownloadPath(newPath);
        window.store.set("downloadPath", newPath);
        alert("Download path updated!");
      }
    } catch (error) {
      console.error("Error selecting/creating folder:", error);
    }
  };

  // Sauvegarder les paramètres
  const handleSaveSettings = () => {
    alert("Paramètres sauvegardés !");
  };

  useEffect(() => {
    const fetchDownloadPath = async () => {
      const storedPath = await window.store.get("downloadPath");
      if (storedPath) {
        setDownloadPath(storedPath);
      }
    };

    fetchDownloadPath();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-8">
      <h2 className="text-3xl font-semibold mb-6">Paramètres</h2>

      {/* Section Compte */}
      <div className="space-y-6">
        <div className="border-b border-gray-700 pb-4">
          <h3 className="text-xl font-semibold mb-4">Compte</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Nom d'utilisateur</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-2/3 p-2 rounded bg-gray-800 border border-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Section Préférences de téléchargement */}
        <div className="border-b border-gray-700 pb-4">
          <h3 className="text-xl font-semibold mb-4">
            Préférences de téléchargement
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Chemin d'installation</span>
              <div className="flex items-center w-2/3">
                <input
                  type="text"
                  value={downloadPath}
                  readOnly
                  className="p-2 rounded bg-gray-800 border border-gray-700 w-full"
                />
                <button
                  onClick={selectDownloadPath}
                  className="ml-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                >
                  Sélectionner le dossier
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section Apparence */}
        <div className="border-b border-gray-700 pb-4">
          <h3 className="text-xl font-semibold mb-4">Apparence</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <button
                onClick={handleThemeChange}
                className="px-4 py-2 rounded bg-gray-800 border border-gray-700 hover:bg-gray-700"
              >
                Passer en mode {theme === "light" ? "sombre" : "clair"}
              </button>
            </div>
          </div>
        </div>

        {/* Sauvegarder les paramètres */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveSettings}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg"
          >
            Sauvegarder les paramètres
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
