import React from "react";
import Cards from "../components/Cards";
import games from "../../../data/games.json";

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-100 px-10">
      <header className="bg-blue-600 text-white py-4">
        <h1 className="text-3xl font-bold text-center">
          Welcome to the Games Library
        </h1>
      </header>
      <main className="p-6">
        <p className="text-lg text-gray-700 text-center">
          Explore our collection of games and find your next adventure!
        </p>
      </main>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-4">
        {games.map((game) => (
          <Cards
            key={game.id}
            title={game.title}
            imageSrc={game.imageSrc}
            storyline={game.storyline}
          />
        ))}
      </div>
    </div>
  );
};

export default Home;
