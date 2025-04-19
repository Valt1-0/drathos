import { useState, useEffect } from "react";
import RecentGames from "../components/RecentGames";
import heroImage from "../assets/hero.png";

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-x-hidden scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-700">
      {/* Hero Section */}
      <div className="relative w-full h-[45vh] md:h-[50vh] lg:h-[55vh]">
        <img
          src={heroImage}
          alt="Hero Game"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

        <div className="absolute top-1/2 -translate-y-1/2 left-6 md:left-16 text-white z-10 max-w-xl">
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight drop-shadow-lg">
            Discover Your Next Adventure
          </h1>
          <p className="text-sm md:text-lg mt-2 md:mt-4 text-gray-200 drop-shadow">
            Browse a wide range of exciting games to dive into!
          </p>
          <button className="mt-5 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 hover:scale-105 transition-transform duration-300">
            Explore Now
          </button>
        </div>
      </div>

      <RecentGames />

      {/* Latest Releases */}
      <section className="my-20 px-6 bg-gray-800 py-12">
        <h2 className="text-4xl font-bold text-center text-white mb-8">
          Latest Releases
        </h2>
        <div className="flex space-x-8 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-700">
          <div className="flex-shrink-0 w-72 bg-gray-700 p-4 rounded-lg shadow-lg transform hover:scale-105 transition-all">
            <img
              src="https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co7497.png"
              alt="Cyberpunk 2077"
              className="w-full h-40 object-cover rounded-lg mb-4"
            />
            <h3 className="text-xl font-bold text-white mb-2">
              Cyberpunk 2077
            </h3>
            <p className="text-sm text-gray-300">
              Explore the dystopian Night City in this thrilling RPG.
            </p>
          </div>
          <div className="flex-shrink-0 w-72 bg-gray-700 p-4 rounded-lg shadow-lg transform hover:scale-105 transition-all">
            <img
              src="https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co2h9y.png"
              alt="The Witcher 3"
              className="w-full h-40 object-cover rounded-lg mb-4"
            />
            <h3 className="text-xl font-bold text-white mb-2">The Witcher 3</h3>
            <p className="text-sm text-gray-300">
              A monster-slaying adventure filled with epic quests and stories.
            </p>
          </div>
          <div className="flex-shrink-0 w-72 bg-gray-700 p-4 rounded-lg shadow-lg transform hover:scale-105 transition-all">
            <img
              src="https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co2s88.png"
              alt="DOOM Eternal"
              className="w-full h-40 object-cover rounded-lg mb-4"
            />
            <h3 className="text-xl font-bold text-white mb-2">DOOM Eternal</h3>
            <p className="text-sm text-gray-300">
              The ultimate fast-paced shooter for action enthusiasts.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
