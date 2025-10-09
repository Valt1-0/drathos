import Cards from "./Cards";
import { useState, useEffect } from "react";
import AddGameModal from "./AddGameModal";
import { getAllServerGames } from "../api/serverGames";
import { getInstalledGames } from "../api/installedGames";

const RecentGames = () => {
  const [showModal, setShowModal] = useState(false);
  const [gameList, setGameList] = useState([]);

  useEffect(() => {
    const loadGames = async () => {
      try {
        const allGames = await getAllServerGames();
        const installed = await getInstalledGames();

        let finalGames = allGames || [];
        if ((!finalGames || finalGames.length === 0) && installed && installed.length > 0) {
          finalGames = installed
            .filter(g => g.serverGameId)
            .map(g => g.serverGameId);
        }

        setGameList(finalGames || []);
      } catch (error) {
        console.error("Error loading games:", error);
      }
    };

    loadGames();
  }, []);

  const handleAddGame = (newGame) => {
    setGameList((prev) => [...prev, newGame]);
  };

  return (
    <section className=" my-20 px-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-bold text-white">Recently Added Games</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow"
        >
          + Add Game
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-6">
        {gameList.map((game) => (
          <Cards
            key={game._id}
            name={game.name}
            summary={game.summary}
            storyline={game.storyline}
            imageSrc={game.coverUrl}
            badgeType={game.badgeType}
          />
        ))}
      </div>

      <AddGameModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleAddGame}
      />
    </section>
  );
};

export default RecentGames;
