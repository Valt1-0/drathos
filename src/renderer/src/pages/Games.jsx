import { useState, useEffect, use } from "react";
import { getAllServerGames } from "../api/serverGames";
import { getInstalledGames } from "../api/installedGames";
import { useDownload } from "../contexts/downloadContext";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";

const Games = () => {
  const [games, setGames] = useState([]);
  const [installedGames, setInstalledGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { addDownload, updateDownloadProgress, removeDownload } = useDownload();

  

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const token = await window.store.get("userToken"); // ⬅️ attend la Promise

        if (!token || typeof token !== "string") {
          throw new Error("Token utilisateur invalide.");
        }

        const decoded = jwtDecode(token);
        const userId = decoded.user.id;

        const allGames = await getAllServerGames();
        const installed = await getInstalledGames(userId);

        setGames(allGames || []);
        setInstalledGames(installed || []);

        console.log("Jeux récupérés :", allGames);
        console.log("Jeux installés récupérés :", installed);
        

      } catch (err) {
        console.error("Erreur lors du chargement des jeux :", err);
        setError("Erreur lors du chargement des jeux.");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const isInstalled = (gameId) =>
    installedGames.some((g) => g.serverGameId === gameId);

  const filteredGames = games.filter((game) => {
    const matchSearch = game.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchGenre =
      selectedGenre === "All" ||
      (game.genres && game.genres.some((g) => g.name === selectedGenre));
    return matchSearch && matchGenre;
  });

  const handleInstall = async (game) => {
    const downloadId = `${game._id}-${Date.now()}`;
    addDownload({
      id: downloadId,
      name: game.name,
      image: game.coverUrl,
      progress: 0,
      speed: 0,
      sizeDownloaded: 0,
      totalSize: game.sizeMB,
      stage: "Downloading",
    });

    window.api.onDownloadProgress((data) => {
      if (data.id === game._id) {
        updateDownloadProgress(downloadId, {
          stage: data.stage,
          progress: data.progress,
        });
        if (data.stage === "Completed" || data.stage === "Failed") {
          setTimeout(() => removeDownload(downloadId), 3000);
        }
      }
    });

    const response = await window.api.installGame(game);
    alert(
      response.success ? "Installation terminée !" : "Échec de l'installation."
    );
  };

  const allGenres = [
    "All",
    ...new Set(
      games.flatMap((g) => g.genres?.map((genre) => genre.name)).filter(Boolean)
    ),
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4 border-r border-gray-700 flex flex-col">
        <input
          type="text"
          placeholder="🔍 Rechercher"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 mb-3 bg-gray-700 text-sm rounded placeholder-gray-400"
        />
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="w-full mb-3 p-2 bg-gray-700 text-sm rounded"
        >
          {allGenres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>

        <ul className="overflow-y-auto flex-1 text-sm space-y-1">
          {filteredGames.map((game) => {
            const installed = isInstalled(game._id);
            return (
              <li
                key={game._id}
                onClick={() => setSelectedGame(game)}
                className={`p-2 rounded cursor-pointer ${
                  selectedGame?._id === game._id
                    ? "bg-gray-700"
                    : "hover:bg-gray-700"
                } ${installed ? "text-white" : "text-gray-500"}`}
              >
                {game.name}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Détails du jeu sélectionné */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedGame ? (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex gap-6">
              <img
                src={`https:${selectedGame.coverUrl}`}
                alt={selectedGame.name}
                className="w-80 h-48 object-cover rounded shadow-lg"
              />

              <div className="flex-1">
                <h2 className="text-3xl font-bold text-blue-500">
                  {selectedGame.name}
                </h2>

                <div className="text-sm mt-2 space-y-1 text-gray-300">
                  <p>
                    <strong>Genres:</strong>{" "}
                    {selectedGame.genres?.map((g) => g.name).join(", ")}
                  </p>
                  <p>
                    <strong>Plateformes:</strong>{" "}
                    {selectedGame.platforms?.join(", ")}
                  </p>
                  <p>
                    <strong>Version:</strong> {selectedGame.version}
                  </p>
                  <p>
                    <strong>Taille:</strong> {selectedGame.sizeMB} MB
                  </p>
                  <p>
                    <strong>Date de sortie:</strong>{" "}
                    {dayjs(selectedGame.releaseDate).format("DD/MM/YYYY")}
                  </p>
                  <p>
                    <strong>Note IGDB:</strong>{" "}
                    {selectedGame.aggregatedRating || "?"}/100
                  </p>
                </div>

                {!isInstalled(selectedGame._id) && (
                  <button
                    onClick={() => handleInstall(selectedGame)}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                  >
                    Installer
                  </button>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded p-4">
              <h3 className="text-lg font-semibold mb-2">Résumé</h3>
              <p className="text-gray-300 text-sm">
                {selectedGame.summary || "Aucun résumé."}
              </p>
            </div>

            {selectedGame.storyline && (
              <div className="bg-gray-800 rounded p-4">
                <h3 className="text-lg font-semibold mb-2">Histoire</h3>
                <p className="text-gray-400 text-sm italic">
                  {selectedGame.storyline}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-32 text-lg">
            Sélectionnez un jeu à gauche pour voir les détails.
          </div>
        )}
      </div>
    </div>
  );
};

export default Games;
