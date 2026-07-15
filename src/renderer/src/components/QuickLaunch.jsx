import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiSearch, FiPlay, FiDownload, FiZap, FiClock } from "react-icons/fi";
import { gamesCache } from "../utils/gamesCache";
import gameManager from "../services/gameManager";
import { launchGame as launchGameAPI } from "../api/installedGames";
import GameCover from "./GameCover";

const MAX_RESULTS = 8;

const QuickLaunch = ({ isOpen, onClose, navigate }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [installedCache, setInstalledCache] = useState({});
  const [activeGames, setActiveGames] = useState(new Set());
  const launchingRef = useRef(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setSelectedIndex(0);
    launchingRef.current = false;

    window.store.get("installedGamesCache").then(cache => setInstalledCache(cache || {}));
    gameManager.getActiveGames().then(games => setActiveGames(new Set(games.map(g => g.gameId))));
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [isOpen]);

  // Filter games — fall back to installedGamesCache when gamesCache is empty (offline)
  useEffect(() => {
    let games = gamesCache.get()?.games || [];

    if (games.length === 0 && Object.keys(installedCache).length > 0) {
      games = Object.entries(installedCache).map(([id, data]) => ({
        _id: id,
        name: data.name,
        coverUrl: data.coverUrl,
      }));
    }

    const q = query.trim().toLowerCase();

    let filtered;
    if (!q) {
      const installed = games.filter(g => installedCache[g._id]);
      const rest = games.filter(g => !installedCache[g._id]);
      filtered = [...installed, ...rest].slice(0, MAX_RESULTS);
    } else {
      filtered = games
        .filter(g => g.name?.toLowerCase().includes(q))
        .slice(0, MAX_RESULTS);
    }

    setResults(filtered);
    setSelectedIndex(0);
  }, [query, installedCache]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = useCallback(async (game) => {
    if (!game || launchingRef.current) return;

    const cached = installedCache[game._id];
    if (cached) {
      launchingRef.current = true;
      onClose();
      try { await launchGameAPI(game._id); } catch (_) { /* offline */ }
      await gameManager.launchGame(game._id, cached.path, cached.executable || null, game.name);
      launchingRef.current = false;
    } else {
      navigate("/games", { state: { selectGameId: game._id } });
      onClose();
    }
  }, [installedCache, navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const getGameAction = (game) => {
    const installed = !!installedCache[game._id];
    const playing = activeGames.has(game._id);
    if (playing)   return { label: t("games.playing"),   icon: <FiZap className="w-3 h-3" />,      color: "text-success"  };
    if (installed) return { label: t("games.launch"),    icon: <FiPlay className="w-3 h-3" />,     color: "text-primary"  };
    return         { label: t("games.install"),          icon: <FiDownload className="w-3 h-3" />, color: "text-text-secondary" };
  };

  const getPlaytime = (gameId) => {
    const stats = installedCache[gameId]?.stats;
    if (!stats?.totalPlayTime || stats.totalPlayTime === 0) return null;
    const h = Math.floor(stats.totalPlayTime / 3600);
    const m = Math.floor((stats.totalPlayTime % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return null;
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="ql-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]"
        style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="ql-panel"
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "var(--app-backgroundSecondary)", border: "1px solid var(--app-border)" }}
        >
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--app-border)" }}>
            <FiSearch className="w-4 h-4 text-text-secondary shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("quickLaunch.placeholder")}
              className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-text-secondary"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-text-secondary hover:text-text transition-colors" aria-label={t("common.clearSearch")}>
                <span className="text-xs px-1.5 py-0.5 rounded bg-surface" aria-hidden="true">✕</span>
              </button>
            )}
          </div>

          <div
            ref={listRef}
            className="overflow-y-auto py-1.5 scrollbar-thin scrollbar-thumb-surface scrollbar-track-background"
            style={{ maxHeight: "360px" }}
          >
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-secondary text-sm">
                {t("quickLaunch.noResults")}
              </div>
            ) : (
              results.map((game, i) => {
                const action = getGameAction(game);
                const playtime = getPlaytime(game._id);
                const isSelected = i === selectedIndex;
                const installed = !!installedCache[game._id];

                return (
                  <button
                    key={game._id}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={() => handleSelect(game)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      isSelected ? "bg-primary/10" : "hover:bg-surface/50"
                    }`}
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface">
                      <GameCover
                        src={game.coverUrl}
                        alt={game.name}
                        className="w-full h-full object-cover"
                        size="thumb"
                      />
                      {installed && (
                        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-success" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? "text-text" : "text-text"}`}>
                        {game.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {playtime && (
                          <span className="flex items-center gap-1 text-[11px] text-text-secondary">
                            <FiClock className="w-2.5 h-2.5" />
                            {playtime}
                          </span>
                        )}
                        {game.genres?.[0] && (
                          <span className="text-[11px] text-text-secondary truncate">
                            {typeof game.genres[0] === "string" ? game.genres[0] : game.genres[0].name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center gap-1 text-xs font-medium shrink-0 ${action.color} ${isSelected ? "opacity-100" : "opacity-0"}`}>
                      {action.icon}
                      <span>{action.label}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div
            className="flex items-center justify-between px-4 py-2 text-[11px] text-text-secondary"
            style={{ borderTop: "1px solid var(--app-border)" }}
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-surface text-[10px] font-mono">↑↓</kbd>
                {t("quickLaunch.navigate")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-surface text-[10px] font-mono">↵</kbd>
                {t("quickLaunch.confirm")}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface text-[10px] font-mono">Esc</kbd>
              {t("quickLaunch.close")}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default QuickLaunch;
