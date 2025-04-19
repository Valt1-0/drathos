import Cards from "./Cards";
import games from "../../../data/games.json"; // Ajuste le chemin si nécessaire

import { useState } from "react";
import AddGameModal from "./AddGameModal";

const RecentGames = () => {
  const [showModal, setShowModal] = useState(false);
  const [gameList, setGameList] = useState(games);

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
          <Cards key={game.id} {...game} />
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
