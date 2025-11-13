// drathos/src/renderer/src/components/ExecutableConfig.jsx

import { useState, useEffect } from "react";

const ExecutableConfig = ({ gameId, onSave, onClose, installedPath }) => {
  const [files, setFiles] = useState([]);
  const [suggestedExecutables, setSuggestedExecutables] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [launchArgs, setLaunchArgs] = useState("");
  const [workingDir, setWorkingDir] = useState("");
  const [requiresAdmin, setRequiresAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGameFiles();
  }, [gameId]);

  const loadGameFiles = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/files`, {
        headers: {
          Authorization: `Bearer ${await window.store.get("userToken")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.allFiles);
        setSuggestedExecutables(data.suggestedExecutables);

        // Auto-sélectionner le premier executable suggéré
        if (data.suggestedExecutables.length > 0) {
          setSelectedFile(data.suggestedExecutables[0].relativePath);
        }
      }
    } catch (error) {
      console.error("Error loading game files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) {
      alert("Veuillez sélectionner un fichier executable");
      return;
    }

    const config = {
      fileName: path.basename(selectedFile),
      relativePath: selectedFile,
      arguments: launchArgs,
      workingDirectory: workingDir,
      requiresAdmin: requiresAdmin,
    };

    try {
      const response = await fetch(`/api/games/${gameId}/executable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await window.store.get("userToken")}`,
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        onSave(config);
        onClose();
      } else {
        alert("Error saving");
      }
    } catch (error) {
      console.error("Error saving executable config:", error);
      alert("Error saving");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-white">Analyse des fichiers du jeu...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Configurer l'executable</h2>

        {/* Executables suggérés */}
        {suggestedExecutables.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-green-400">
              🎯 Executables détectés automatiquement
            </h3>
            <div className="space-y-2">
              {suggestedExecutables.map((file, index) => (
                <label
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
                >
                  <input
                    type="radio"
                    name="executable"
                    value={file.relativePath}
                    checked={selectedFile === file.relativePath}
                    onChange={(e) => setSelectedFile(e.target.value)}
                    className="text-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{file.name}</div>
                    <div className="text-xs text-gray-400">
                      {file.relativePath}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Tous les fichiers */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">📁 Tous les fichiers</h3>
          <div className="max-h-60 overflow-y-auto bg-gray-900 rounded p-2">
            {files.map((file, index) => (
              <label
                key={index}
                className="flex items-center gap-2 p-1 hover:bg-gray-700 rounded cursor-pointer text-sm"
              >
                <input
                  type="radio"
                  name="executable"
                  value={file.relativePath}
                  checked={selectedFile === file.relativePath}
                  onChange={(e) => setSelectedFile(e.target.value)}
                />
                <span
                  className={
                    file.isExecutable ? "text-green-400" : "text-gray-300"
                  }
                >
                  {file.relativePath}
                </span>
                {file.isExecutable && (
                  <span className="text-xs text-green-400">EXE</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Configuration avancée */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              Arguments de lancement (optionnel)
            </label>
            <input
              type="text"
              value={launchArgs}
              onChange={(e) => setLaunchArgs(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-white"
              placeholder="ex: --fullscreen --resolution 1920x1080"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Répertoire de travail (optionnel)
            </label>
            <input
              type="text"
              value={workingDir}
              onChange={(e) => setWorkingDir(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-white"
              placeholder="ex: bin/ (laissez vide pour auto-détection)"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={requiresAdmin}
              onChange={(e) => setRequiresAdmin(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Nécessite les droits administrateur</span>
          </label>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedFile}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutableConfig;
