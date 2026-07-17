import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiImage, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { useTheme } from "../../contexts/themeContext";
import { getGameScreenshots } from "../../api/igdb";

const GameScreenshots = ({ igdbId, compact = false }) => {
  const { t } = useTranslation();
  const { getTextClass } = useTheme();
  const [shots, setShots] = useState([]);
  const [lightbox, setLightbox] = useState(null); // index | null

  useEffect(() => {
    setShots([]);
    setLightbox(null);
    if (!igdbId) return;
    let cancelled = false;
    getGameScreenshots(igdbId).then((urls) => {
      if (!cancelled) setShots(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [igdbId]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") setLightbox((i) => (i + shots.length - 1) % shots.length);
      if (e.key === "ArrowRight") setLightbox((i) => (i + 1) % shots.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox, shots.length]);

  if (shots.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl p-4 bg-surface border border-border"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20">
          <FiImage className="text-base text-primary" />
        </div>
        <h2 className={`text-lg font-bold ${getTextClass("primary")}`}>
          {t("games.screenshots")}
        </h2>
        <span className={`text-xs ${getTextClass("secondary")}`}>{shots.length}</span>
      </div>

      <div className={`grid gap-2.5 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {shots.map((url, i) => (
          <button
            key={url}
            onClick={() => setLightbox(i)}
            className="group relative rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-all aspect-video"
          >
            <img
              src={url}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {createPortal(
        <AnimatePresence>
          {lightbox !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
              onClick={() => setLightbox(null)}
            >
              <motion.img
                key={lightbox}
                src={shots[lightbox]}
                alt=""
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-[90vw] max-h-[85vh] rounded-xl shadow-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />

              {shots.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightbox((i) => (i + shots.length - 1) % shots.length);
                    }}
                    aria-label={t("common.previous")}
                    className="absolute left-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                  >
                    <FiChevronLeft size={22} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightbox((i) => (i + 1) % shots.length);
                    }}
                    aria-label={t("common.next")}
                    className="absolute right-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
                  >
                    <FiChevronRight size={22} />
                  </button>
                </>
              )}

              <button
                onClick={() => setLightbox(null)}
                aria-label={t("common.close")}
                className="absolute top-4 right-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
              >
                <FiX size={20} />
              </button>

              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-semibold tabular-nums">
                {lightbox + 1} / {shots.length}
              </span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </motion.div>
  );
};

export default GameScreenshots;
