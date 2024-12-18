import { FiDownload } from "react-icons/fi";

const Cards = ({ title, storyline, imageSrc }) => {
  const handleInstall = () => {
    console.log("Installing game...");
  };

  return (
    <div className="relative w-40 h-56 bg-slate-800 rounded-md group shadow-xl transform transition-all duration-300 hover:scale-105">
      <img
        src={
          imageSrc ||
          "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1wyy.png"
        }
        alt={title}
        className="w-full h-full object-cover rounded-md opacity-90 transition-opacity duration-300 group-hover:opacity-50"
      />

      <div className="absolute bottom-4 left-0 w-full px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <h4 className="text-white text-sm font-semibold mb-2">
          {title || "The Witcher 3"}
        </h4>

        <p className="text-white text-xs line-clamp-3">
          {storyline ||
            "The Witcher 3: Wild Hunt is a story-driven open-world RPG set in a visually stunning fantasy universe full of meaningful choices and impactful consequences."}
        </p>

        <button
          className="flex justify-center items-center gap-2 w-20 h-6 bg-[#3eccc3] rounded text-xs text-white hover:bg-[#2baea5] transition-colors"
          onClick={handleInstall}
        >
          <FiDownload className="inline-block" />
          Installer
        </button>
      </div>
    </div>
  );
};

export default Cards;
