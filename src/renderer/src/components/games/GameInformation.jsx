import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/themeContext";
import {
  FiUsers,
  FiAward,
  FiCalendar,
  FiHardDrive,
  FiTag,
  FiMonitor,
  FiInfo,
} from "react-icons/fi";

const colorClasses = {
  primary: "bg-primary/20 text-primary",
  secondary: "bg-secondary/20 text-secondary",
  accent: "bg-accent/20 text-accent",
  warning: "bg-warning/20 text-warning",
};

const InfoCard = ({ icon: Icon, label, value, color = "primary", getTextClass }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="group rounded-lg p-3 border transition-all duration-300 bg-surface border-border hover:border-primary/30"
    >
      <div className="flex items-start gap-2.5">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${colorClasses[color]}`}>
          <Icon className="text-base" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-medium mb-0.5 leading-snug ${getTextClass("secondary")}`}>{label}{t("common.colon")}</p>
          <p className={`text-sm font-semibold truncate leading-snug ${getTextClass("primary")}`}>{value}</p>
        </div>
      </div>
    </motion.div>
  );
};

const GameInformation = ({
  game,
  gameSize,
  isInstalled,
  getGenresArray,
  getPlatformsArray,
}) => {
  const { t } = useTranslation();
  const { getTextClass } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl border bg-surface border-border overflow-hidden"
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-linear-to-br from-primary/20 to-secondary/20">
            <FiInfo className="text-base text-primary" />
          </div>
          <h3 className={`text-base font-bold ${getTextClass("primary")}`}>{t("games.information")}</h3>
        </div>
      </div>

      <div className="p-4 space-y-2.5 border-b border-border">
        {game.developer && (
          <InfoCard icon={FiUsers} label={t("games.developer")} value={game.developer} color="primary" getTextClass={getTextClass} />
        )}
        {game.publisher && (
          <InfoCard icon={FiAward} label={t("games.publisher")} value={game.publisher} color="secondary" getTextClass={getTextClass} />
        )}
        {game.releaseDate && (
          <InfoCard icon={FiCalendar} label={t("games.releaseDate")} value={dayjs(game.releaseDate).format("DD/MM/YYYY")} color="accent" getTextClass={getTextClass} />
        )}
        {isInstalled && gameSize && gameSize.sizeMB > 0 && (
          <InfoCard
            icon={FiHardDrive}
            label={t("games.installedSize")}
            value={gameSize.sizeGB >= 1 ? `${gameSize.sizeGB.toFixed(2)} GB` : `${gameSize.sizeMB} MB`}
            color="warning"
            getTextClass={getTextClass}
          />
        )}
        {!isInstalled && game.sizeMB > 0 && (
          <InfoCard
            icon={FiHardDrive}
            label={t("games.downloadSize")}
            value={game.sizeMB >= 1024 ? `${(game.sizeMB / 1024).toFixed(2)} GB` : `${game.sizeMB} MB`}
            color="warning"
            getTextClass={getTextClass}
          />
        )}
      </div>

      {getGenresArray(game).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 border-b border-border"
        >
          <div className="flex items-center gap-1.5 mb-2.5">
            <FiTag className="text-primary text-xs" />
            <h4 className={`text-xs font-semibold ${getTextClass("primary")}`}>{t("games.genres")}</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {getGenresArray(game).map((genre, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="px-2 py-0.5 text-[10px] font-medium rounded-md cursor-default transition-all bg-primary/10 text-primary hover:bg-primary/20"
              >
                {genre}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {getPlatformsArray(game).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-4"
        >
          <div className="flex items-center gap-1.5 mb-2.5">
            <FiMonitor className="text-secondary text-xs" />
            <h4 className={`text-xs font-semibold ${getTextClass("primary")}`}>{t("games.platforms")}</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {getPlatformsArray(game).map((platform, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="px-2 py-0.5 text-[10px] font-medium rounded-md cursor-default transition-all bg-secondary/10 text-secondary hover:bg-secondary/20"
              >
                {platform}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GameInformation;
