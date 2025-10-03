import { FiDownload } from "react-icons/fi";
import Badge from "./Badge"; // Adjust path if needed

const Cards = ({
  name,
  summary,
  storyline,
  imageSrc,
  badgeType,
  onInstall,
}) => {
  return (
    <div className="relative w-44 sm:w-52 h-64 sm:h-72 rounded-2xl overflow-hidden bg-gray-800 group shadow-lg transition-all duration-300 hover:scale-[1.04] hover:shadow-2xl">
      {/* Game Cover */}
      <img
        src={
          imageSrc ||
          "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1wyy.png"
        }
        alt={name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />

      {/* Badge */}
      {badgeType && (
        <div className="absolute top-2 left-2 z-10">
          <Badge type={badgeType} />
        </div>
      )}

      {/* Overlay Gradient + Info */}
      <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
        <h4 className="text-white text-sm sm:text-base font-semibold truncate">
          {name || "The Witcher 3"}
        </h4>
        <p className="text-white text-xs sm:text-sm mt-1 line-clamp-2">
          {storyline || summary || ""}
        </p>

        <button
          onClick={onInstall}
          className="mt-3 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <FiDownload className="text-sm" />
          Install
        </button>
      </div>
    </div>
  );
};

export default Cards;