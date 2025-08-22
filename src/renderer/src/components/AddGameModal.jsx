import { useState, useEffect } from "react";
import { searchGamesFromIGDB } from "../api/igdb";
import { addGameToServer } from "../api/serverGames";

const AddGameModal = ({ isOpen, onClose }) => {
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
        setUploadProgress, // met à jour la barre de progression
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-900 text-white p-6 rounded-xl w-full max-w-lg relative shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold mb-4">Ajouter un jeu</h2>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedGame(null);
          }}
          placeholder="Tape le nom du jeu..."
          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        />

        {!selectedGame && (
          <div className="mt-4 max-h-60 overflow-y-auto">
            {loading && (
              <div className="text-sm text-gray-400">Chargement...</div>
            )}

            {!loading && suggestions.length > 0 && (
              <ul className="space-y-2">
                {suggestions.map((game) => (
                  <li
                    key={game.id}
                    className="p-2 border border-gray-700 rounded hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleSelect(game.id)}
                  >
                    <div className="font-medium">{game.name}</div>
                    <div className="text-sm text-gray-400">
                      {game.first_release_date
                        ? new Date(game.first_release_date * 1000).getFullYear()
                        : "Date inconnue"}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!loading && query.length >= 2 && suggestions.length === 0 && (
              <div className="text-sm text-gray-400">Aucun jeu trouvé.</div>
            )}
          </div>
        )}

        {selectedGame && (
          <div className="mt-4 space-y-3">
            <div>
              <strong>Jeu sélectionné :</strong> {selectedGame.name}
            </div>
            <input
              type="file"
              accept=".zip,.7z,.rar,.tar,.gz"
              onChange={(e) => setZipFile(e.target.files[0])}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Version (ex: 1.0.0)"
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={() => setIsPublic(!isPublic)}
              />
              <span>Jeu public</span>
            </label>

            {uploadProgress > 0 && (
              <div className="w-full bg-gray-700 h-2 rounded">
                <div
                  className="bg-green-500 h-full rounded"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            <button
              onClick={handleUpload}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
            >
              Uploader le jeu
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddGameModal;
