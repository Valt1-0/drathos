import { motion } from "framer-motion";
import {
  FiClock,
  FiDownload,
  FiSquare,
  FiZap,
  FiPlay,
  FiFolder,
  FiTrash2,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/themeContext";

export const ActionCard = ({ onClick, icon: Icon, label, color = "primary", primary = false }) => {
  const { icon, btn, iconHover } = {
    primary: { icon: "bg-primary/20 text-primary", iconHover: "group-hover:bg-primary/35", btn: "bg-primary/10 border-primary/25 hover:border-primary/50 hover:bg-primary/15" },
    success: { icon: "bg-success/20 text-success", iconHover: "group-hover:bg-success/35", btn: "bg-success/10 border-success/25 hover:border-success/50 hover:bg-success/15" },
    warning: { icon: "bg-warning/20 text-warning", iconHover: "group-hover:bg-warning/35", btn: "bg-warning/10 border-warning/25 hover:border-warning/50 hover:bg-warning/15" },
    error:   { icon: "bg-error/20 text-error",     iconHover: "group-hover:bg-error/35",   btn: "bg-error/10 border-error/25 hover:border-error/50 hover:bg-error/15" },
  }[color];

  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`group flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-150 ${primary ? btn : "bg-surface border-border hover:border-border/60 hover:bg-background-secondary"}`}
    >
      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors duration-150 ${icon} ${iconHover}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className={`font-semibold text-xs transition-colors duration-150 ${primary ? "text-text" : "text-text-secondary group-hover:text-text"}`}>
        {label}
      </span>
    </motion.button>
  );
};

export const ActionButtons = ({
  game,
  isInstalled,
  isPlaying,
  isUninstalling,
  isPending,
  isQueued,
  activeDownload,
  user,
  onLaunch,
  onStop,
  onForceStop,
  onInstall,
  onUninstall,
  onOpenFolder,
  onDeleteFromServer,
}) => {
  const { t } = useTranslation();
  const { getTextClass } = useTheme();

  if (isPending && !isUninstalling) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-warning/8 border-warning/25"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-warning/20 shrink-0">
          <svg className="w-3.5 h-3.5 text-warning animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <div>
          <p className={`text-xs font-semibold ${getTextClass("primary")}`}>{t("games.syncPending")}</p>
          <p className={`text-[11px] ${getTextClass("secondary")}`}>{t("games.cannotLaunchSync")}</p>
        </div>
      </motion.div>
    );
  }

  if (isUninstalling) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-warning/8 border-warning/25"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-warning/20 shrink-0">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-warning border-t-transparent animate-spin" />
        </div>
        <div>
          <p className={`text-xs font-semibold ${getTextClass("primary")}`}>{t("games.uninstalling")}</p>
          <p className={`text-[11px] ${getTextClass("secondary")}`}>{t("games.removingFiles")}</p>
        </div>
      </motion.div>
    );
  }

  if (activeDownload) {
    const stageLabels = {
      preparing: t("downloads.stagePreparing"),
      downloading: t("downloads.stageDownloading"),
      extracting: t("downloads.stageExtracting"),
      finalizing: t("downloads.stageFinalizing"),
      paused: t("downloads.stagePaused"),
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 px-3 py-2.5 rounded-xl border bg-primary/8 border-primary/25"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/20 shrink-0">
            {activeDownload.stage === "paused"
              ? <FiDownload className="w-3.5 h-3.5 text-warning" />
              : <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${getTextClass("primary")}`}>
              {stageLabels[activeDownload.stage] || t("downloads.stageDownloading")}
            </p>
            <p className={`text-[11px] ${getTextClass("secondary")}`}>
              {activeDownload.stage === "downloading" && activeDownload.speed
                ? `${activeDownload.speed.toFixed(1)} MB/s`
                : t("games.redirecting")}
            </p>
          </div>
          <span className={`text-xs font-medium shrink-0 ${getTextClass("secondary")}`}>
            {Math.round(activeDownload.progress || 0)}%
          </span>
        </div>
        <div className="w-full h-1 rounded-full overflow-hidden bg-surface">
          <motion.div
            className="h-full rounded-full bg-gradient-primary"
            initial={{ width: 0 }}
            animate={{ width: `${activeDownload.progress || 0}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
        {activeDownload.sizeDownloaded != null && activeDownload.totalSize != null && (
          <p className={`text-[11px] text-right ${getTextClass("secondary")}`}>
            {activeDownload.sizeDownloaded >= 1024 ? `${(activeDownload.sizeDownloaded / 1024).toFixed(1)} GB` : `${Math.round(activeDownload.sizeDownloaded)} MB`}
            {" / "}
            {activeDownload.totalSize >= 1024 ? `${(activeDownload.totalSize / 1024).toFixed(1)} GB` : `${Math.round(activeDownload.totalSize)} MB`}
          </p>
        )}
      </motion.div>
    );
  }

  if (!isInstalled) {
    return (
      <div className="flex flex-wrap gap-2">
        <ActionCard onClick={() => onInstall(game)} icon={isQueued ? FiClock : FiDownload} label={isQueued ? t("games.inQueue") : t("games.installGame")} color="primary" primary />
        {user?.role === "admin" && (
          <ActionCard onClick={() => onDeleteFromServer(game)} icon={FiTrash2} label={t("games.deleteFromServerBtn")} color="error" />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isPlaying ? (
        <>
          <ActionCard onClick={() => onStop(game)} icon={FiSquare} label={t("games.stop")} color="warning" primary />
          <ActionCard onClick={() => onForceStop(game)} icon={FiZap} label={t("games.forceStop")} color="error" />
          <ActionCard onClick={() => onOpenFolder(game)} icon={FiFolder} label={t("games.folder")} color="primary" />
        </>
      ) : (
        <>
          <ActionCard onClick={() => onLaunch(game)} icon={FiPlay} label={t("games.playNow")} color="success" primary />
          <ActionCard onClick={() => onOpenFolder(game)} icon={FiFolder} label={t("games.folder")} color="primary" />
          <ActionCard onClick={() => onUninstall(game)} icon={FiTrash2} label={t("games.uninstall")} color="error" />
        </>
      )}
    </div>
  );
};
