import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/themeContext";
import {
  FiBarChart2,
  FiClock,
  FiTarget,
  FiTrendingUp,
  FiPlay,
  FiActivity,
  FiChevronDown,
} from "react-icons/fi";

const MAX_TOTAL_SECONDS = 100 * 3600;  // 100 h
const MAX_AVG_SECONDS   = 3 * 3600;   // 3 h
const MAX_SESSIONS      = 50;

const GameStatistics = ({ stats, isPlaying }) => {
  const { t } = useTranslation();
  const { getTextClass } = useTheme();
  const [isOpen, setIsOpen] = useState(true);

  const totalPct    = Math.min(((stats?.totalPlayTimeSeconds || 0) / MAX_TOTAL_SECONDS) * 100, 100);
  const sessionsPct = Math.min(((stats?.totalSessions || 0) / MAX_SESSIONS) * 100, 100);
  const avgPct      = Math.min(((stats?.averageSessionSeconds || 0) / MAX_AVG_SECONDS) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl bg-surface border border-border overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2.5 p-4 hover:bg-primary/10 transition-colors duration-200"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary/20">
            <FiBarChart2 className="text-base text-secondary" />
          </div>
          <h2 className={`text-lg font-bold ${getTextClass("primary")}`}>
            {t("games.gameStatistics")}
          </h2>
        </div>
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface">
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <FiChevronDown className={`text-base ${getTextClass("secondary")}`} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: "hidden" }}
          >
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, delay: 0.06 }}
            >
              <div className="px-4 pb-4 pt-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="group relative overflow-hidden rounded-xl p-4 border transition-all duration-300 hover:scale-105 bg-surface border-border hover:shadow-primary">
                    <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${getTextClass("secondary")}`}>{t("games.totalTime")}</span>
                        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-primary/20">
                          <FiClock className="text-sm text-primary" />
                        </div>
                      </div>
                      <div className={`text-xl font-bold mb-1.5 ${getTextClass("primary")}`}>{stats.totalPlayTime || "0h 0m"}</div>
                      <div className="h-1 rounded-full overflow-hidden bg-surface/50">
                        <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${totalPct}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-xl p-4 border transition-all duration-300 hover:scale-105 bg-surface border-border hover:shadow-secondary">
                    <div className="absolute inset-0 bg-linear-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${getTextClass("secondary")}`}>{t("games.sessions")}</span>
                        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-secondary/20">
                          <FiTarget className="text-sm text-secondary" />
                        </div>
                      </div>
                      <div className={`text-xl font-bold mb-1.5 ${getTextClass("primary")}`}>{stats.totalSessions || 0}</div>
                      <div className="h-1 rounded-full overflow-hidden bg-surface/50">
                        <div className="h-full rounded-full bg-gradient-secondary" style={{ width: `${sessionsPct}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-xl p-4 border transition-all duration-300 hover:scale-105 bg-surface border-border hover:shadow-accent">
                    <div className="absolute inset-0 bg-linear-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${getTextClass("secondary")}`}>{t("games.averageTime")}</span>
                        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-accent/20">
                          <FiTrendingUp className="text-sm text-accent" />
                        </div>
                      </div>
                      <div className={`text-xl font-bold mb-1.5 ${getTextClass("primary")}`}>{stats.averageSessionTime || "0h 0m"}</div>
                      <div className="h-1 rounded-full overflow-hidden bg-surface/50">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${avgPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary border border-border">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-warning/20 shrink-0">
                      <FiPlay className="text-base text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-medium mb-0.5 ${getTextClass("secondary")}`}>{t("games.firstLaunch")}</p>
                      <p className={`text-xs font-bold truncate ${getTextClass("primary")}`}>{stats.firstLaunchedFormatted || t("games.never")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary border border-border">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent/20 shrink-0">
                      <FiActivity className="text-base text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-medium mb-0.5 ${getTextClass("secondary")}`}>{t("games.lastSession")}</p>
                      <p className={`text-xs font-bold truncate ${getTextClass("primary")}`}>{stats.lastPlayedFormatted || t("games.never")}</p>
                    </div>
                  </div>
                </div>

                {isPlaying && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden rounded-lg p-3 bg-linear-to-r from-success/20 to-success/10 border border-success/30"
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-success/10 to-transparent animate-pulse" />
                    <div className="relative flex items-center justify-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-success/20 flex items-center justify-center">
                        <span className="text-lg">🎮</span>
                      </div>
                      <span className={`font-bold text-sm ${getTextClass("primary")}`}>{t("games.gameInProgress")}</span>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-success animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1 h-1 rounded-full bg-success animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1 h-1 rounded-full bg-success animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GameStatistics;
