import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FiDownload, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useActiveDownloads, useDownloadQueue } from "../contexts/downloadContext";
import GameCover from "./GameCover";

const STAGE_I18N_KEYS = {
  preparing: "downloads.stagePreparing",
  downloading: "downloads.stageDownloading",
  extracting: "downloads.stageExtracting",
  finalizing: "downloads.stageFinalizing",
  paused: "downloads.stagePaused",
};

const DownloadTray = () => {
  const { t } = useTranslation();
  const activeDownloads = useActiveDownloads();
  const { queue } = useDownloadQueue();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (activeDownloads.length === 0 && queue.length === 0) return null;

  const visible = activeDownloads.slice(0, 3);
  const extra = activeDownloads.length - 3;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border overflow-hidden"
        style={{
          background: "var(--app-backgroundSecondary)",
          borderColor: "var(--app-border)",
          boxShadow: "var(--app-shadow-primary)",
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: "var(--app-surface)" }}
          onClick={() => navigate("/download")}
        >
          <div className="flex items-center gap-2">
            <FiDownload className="text-primary text-sm" />
            <span className="text-xs font-semibold" style={{ color: "var(--app-text)" }}>
              {activeDownloads.length > 0
                ? t("downloads.trayTitle", { count: activeDownloads.length })
                : t("downloads.queue")}
            </span>
            {queue.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-white">
                +{queue.length}
              </span>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            className="p-1 rounded transition-colors hover:bg-primary/10"
          >
            {collapsed
              ? <FiChevronUp className="text-sm" style={{ color: "var(--app-textSecondary)" }} />
              : <FiChevronDown className="text-sm" style={{ color: "var(--app-textSecondary)" }} />
            }
          </button>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ overflow: "hidden" }}
            >
              <div>
                {visible.map((dl, i) => (
                  <div
                    key={dl.id}
                    className="flex items-center gap-2.5 px-3 py-2"
                    style={{
                      borderTop: i > 0 ? "1px solid var(--app-border)" : undefined,
                    }}
                  >
                    <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0">
                      <GameCover
                        src={dl.image}
                        alt={dl.name}
                        className="w-full h-full object-cover"
                        size="thumb"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--app-text)" }}>
                        {dl.name}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--app-textSecondary)" }}>
                        {STAGE_I18N_KEYS[dl.stage] ? t(STAGE_I18N_KEYS[dl.stage]) : dl.stage}
                      </p>
                      <div
                        className="mt-1 h-1 rounded-full overflow-hidden"
                        style={{ background: "var(--app-surface)" }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: "var(--app-primary)" }}
                          animate={{ width: `${dl.progress || 0}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] font-bold" style={{ color: "var(--app-primary)" }}>
                        {Math.round(dl.progress || 0)}%
                      </span>
                      {dl.speed > 0 && (
                        <p className="text-[9px]" style={{ color: "var(--app-textSecondary)" }}>
                          {dl.speed.toFixed(1)} MB/s
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {extra > 0 && (
                  <div
                    className="px-3 py-1.5 text-center text-[10px]"
                    style={{ color: "var(--app-textSecondary)", borderTop: "1px solid var(--app-border)" }}
                  >
                    {t("downloads.trayMore", { count: extra })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default DownloadTray;
