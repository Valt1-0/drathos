import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FiPlay, FiDownload, FiClock, FiX, FiZap } from "react-icons/fi";
import { gamepadService } from "../services/gamepadService";
import { gamesCache } from "../utils/gamesCache";
import gameManager from "../services/gameManager";
import { launchGame as launchGameAPI } from "../api/installedGames";
import { useDownloadQueue, useActiveDownloads } from "../contexts/downloadContext";
import GameCover from "./GameCover";

const CARD_WIDTH = 176; // cover cell incl. gap — drives the grid column math
const SECTIONS = ["installed", "library"];

const formatPlaytime = (stats) => {
  const total = stats?.totalPlayTime || 0;
  if (total < 60) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const BigPictureMode = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { enqueueGame } = useDownloadQueue();
  const activeDownloads = useActiveDownloads();
  const [installedCache, setInstalledCache] = useState({});
  const [serverGames, setServerGames] = useState([]);
  const [activeGames, setActiveGames] = useState(new Set());
  const [section, setSection] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [cols, setCols] = useState(6);
  const [now, setNow] = useState(new Date());
  // First-install prompt: pick the default folder or browse, pad-navigable
  const [pathPrompt, setPathPrompt] = useState(null); // { game } | null
  const [promptIndex, setPromptIndex] = useState(0);
  const [defaultDir, setDefaultDir] = useState("");
  const gridRef = useRef(null);
  const launchingRef = useRef(false);

  // Same data path as QuickLaunch: server cache first, installed cache offline
  useEffect(() => {
    if (!isOpen) return;
    setSection(0);
    setFocusIndex(0);
    launchingRef.current = false;
    setPathPrompt(null);
    window.store.get("installedGamesCache").then((c) => setInstalledCache(c || {}));
    gameManager.getActiveGames().then((games) => setActiveGames(new Set(games.map((g) => g.gameId))));
    setServerGames(gamesCache.get()?.games || []);
    window.api.app.getDefaultDownloadDir().then(setDefaultDir).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [isOpen]);

  const lists = useMemo(() => {
    let installed = serverGames.filter((g) => installedCache[g._id]);
    if (installed.length === 0 && Object.keys(installedCache).length > 0) {
      installed = Object.entries(installedCache).map(([id, data]) => ({
        _id: id,
        name: data.name,
        coverUrl: data.coverUrl,
      }));
    }
    installed.sort((a, b) => {
      const la = installedCache[a._id]?.stats?.lastPlayed || 0;
      const lb = installedCache[b._id]?.stats?.lastPlayed || 0;
      return lb - la || (a.name || "").localeCompare(b.name || "");
    });
    const library = [...serverGames].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return { installed, library };
  }, [serverGames, installedCache]);

  const games = lists[SECTIONS[section]];
  const focused = games[focusIndex] ?? null;
  const downloadByGame = useMemo(() => {
    const map = new Map();
    for (const dl of activeDownloads) map.set(dl.gameId, dl);
    return map;
  }, [activeDownloads]);

  // Column count from real width so index math matches the rendered grid
  useEffect(() => {
    if (!isOpen) return;
    const measure = () => {
      const width = gridRef.current?.clientWidth ?? window.innerWidth - 96;
      setCols(Math.max(2, Math.floor(width / CARD_WIDTH)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isOpen]);

  useEffect(() => {
    gridRef.current
      ?.querySelector(`[data-bp-index="${focusIndex}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusIndex, section]);

  const changeSection = useCallback((delta) => {
    setSection((s) => (s + delta + SECTIONS.length) % SECTIONS.length);
    setFocusIndex(0);
  }, []);

  const move = useCallback(
    (direction) => {
      setFocusIndex((i) => {
        const max = games.length - 1;
        if (max < 0) return 0;
        if (direction === "left") return Math.max(0, i - 1);
        if (direction === "right") return Math.min(max, i + 1);
        if (direction === "up") return i - cols >= 0 ? i - cols : i;
        if (direction === "down") return i + cols <= max ? i + cols : Math.min(max, i);
        return i;
      });
    },
    [games.length, cols]
  );

  const activate = useCallback(
    async (game) => {
      if (!game || launchingRef.current) return;

      if (activeGames.has(game._id)) {
        toast.info(t("bigPicture.alreadyRunning", { name: game.name }));
        return;
      }

      const cached = installedCache[game._id];
      if (cached?.path) {
        launchingRef.current = true;
        toast.success(t("bigPicture.launching", { name: game.name }));
        onClose();
        try {
          await launchGameAPI(game._id);
        } catch {
          /* offline — local launch still works */
        }
        await gameManager.launchGame(game._id, cached.path, cached.executable || null, game.name);
        launchingRef.current = false;
        return;
      }

      if (downloadByGame.has(game._id)) return; // already downloading
      const full = serverGames.find((g) => g._id === game._id);
      if (!full) return;

      // First install ever: ask where games go (default folder or browse),
      // like the Games page does
      const downloadPath = await window.store.get("downloadPath");
      if (!downloadPath) {
        setPromptIndex(0);
        setPathPrompt({ game: full });
        return;
      }

      enqueueGame(full);
      toast.success(t("bigPicture.installQueued", { name: game.name }));
    },
    [activeGames, installedCache, downloadByGame, serverGames, enqueueGame, onClose, t]
  );

  const resolvePathPrompt = useCallback(
    async (choice) => {
      const game = pathPrompt?.game;
      if (!game) return;

      const chosen =
        choice === "default"
          ? defaultDir
          : await window.api.selectAndCreateFolder("DrathosGames");
      if (!chosen) return; // browse cancelled — keep the prompt open

      await window.store.set("downloadPath", chosen);
      setPathPrompt(null);
      enqueueGame(game);
      toast.success(t("bigPicture.installQueued", { name: game.name }));
    },
    [pathPrompt, defaultDir, enqueueGame, t]
  );

  // Input — gamepad (exclusive claim) + keyboard parity. When the path prompt
  // is open it owns the input: left/right picks an option, A confirms, B cancels.
  useEffect(() => {
    if (!isOpen) return;
    gamepadService.claimExclusive("bigpicture");

    const promptOpen = pathPrompt !== null;
    const onNav = (direction) => {
      if (promptOpen) {
        if (direction === "left" || direction === "right") setPromptIndex((i) => 1 - i);
        return;
      }
      move(direction);
    };
    const onConfirm = () => {
      if (promptOpen) {
        resolvePathPrompt(promptIndex === 0 ? "default" : "browse");
        return;
      }
      activate(games[focusIndex]);
    };
    const onBack = () => {
      if (promptOpen) {
        setPathPrompt(null);
        return;
      }
      onClose();
    };

    const unsubs = [
      gamepadService.on("nav", ({ direction }) => onNav(direction)),
      gamepadService.on("confirm", onConfirm),
      gamepadService.on("back", onBack),
      gamepadService.on("menu", onBack),
      gamepadService.on("prevSection", () => !promptOpen && changeSection(-1)),
      gamepadService.on("nextSection", () => !promptOpen && changeSection(1)),
    ];

    const onKeyDown = (e) => {
      const keys = {
        ArrowUp: () => onNav("up"),
        ArrowDown: () => onNav("down"),
        ArrowLeft: () => onNav("left"),
        ArrowRight: () => onNav("right"),
        Enter: onConfirm,
        Escape: onBack,
        Tab: () => !promptOpen && changeSection(e.shiftKey ? -1 : 1),
      };
      const handler = keys[e.key];
      if (handler) {
        e.preventDefault();
        e.stopPropagation();
        handler();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      unsubs.forEach((u) => u());
      window.removeEventListener("keydown", onKeyDown, true);
      gamepadService.releaseExclusive("bigpicture");
    };
  }, [isOpen, games, focusIndex, move, activate, changeSection, onClose, pathPrompt, promptIndex, resolvePathPrompt]);

  if (!isOpen) return null;

  const focusedPlaytime = focused ? formatPlaytime(installedCache[focused._id]?.stats) : null;
  const focusedInstalled = focused ? !!installedCache[focused._id] : false;
  const focusedRunning = focused ? activeGames.has(focused._id) : false;
  const clock = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const hintAction = focusedRunning
    ? t("bigPicture.running")
    : focusedInstalled
      ? t("bigPicture.play")
      : t("bigPicture.install");

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="bigpicture"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex flex-col overflow-hidden select-none"
        style={{ background: "var(--app-background)" }}
      >
        {/* Ambient backdrop from the focused cover */}
        <AnimatePresence mode="wait">
          {focused?.coverUrl && (
            <motion.img
              key={focused._id}
              src={focused.coverUrl}
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.22 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 pointer-events-none"
            />
          )}
        </AnimatePresence>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent 0%, var(--app-background) 90%)" }}
        />

        {/* Header: brand · section tabs · clock */}
        <header className="relative z-10 flex items-center justify-between px-12 pt-8 pb-4">
          <span className="text-xl font-black tracking-[0.25em] uppercase" style={{ color: "var(--app-text)" }}>
            Drathos
          </span>
          <nav className="flex items-center gap-2" aria-label={t("bigPicture.sections")}>
            {SECTIONS.map((key, i) => (
              <button
                key={key}
                onClick={() => { setSection(i); setFocusIndex(0); }}
                className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                style={
                  i === section
                    ? { background: "var(--app-primary)", color: "#fff" }
                    : { color: "var(--app-textSecondary)" }
                }
              >
                {t(`bigPicture.${key}`)}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold tabular-nums" style={{ color: "var(--app-text)" }}>
              {clock}
            </span>
            <button
              onClick={onClose}
              aria-label={t("bigPicture.exit")}
              className="p-2 rounded-full transition-colors hover:bg-white/10"
              style={{ color: "var(--app-textSecondary)" }}
            >
              <FiX size={20} />
            </button>
          </div>
        </header>

        {/* Focused game banner */}
        <div className="relative z-10 px-12 h-16">
          {focused && (
            <div className="flex items-baseline gap-4">
              <h1 className="text-3xl font-bold truncate max-w-[60vw]" style={{ color: "var(--app-text)" }}>
                {focused.name}
              </h1>
              {focusedRunning && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
                  <FiZap size={14} /> {t("bigPicture.running")}
                </span>
              )}
              {focusedPlaytime && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--app-textSecondary)" }}>
                  <FiClock size={13} /> {focusedPlaytime}
                </span>
              )}
              {focused.genres?.[0] && (
                <span className="text-sm" style={{ color: "var(--app-textSecondary)" }}>
                  {typeof focused.genres[0] === "string" ? focused.genres[0] : focused.genres[0].name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Cover grid */}
        <div ref={gridRef} className="relative z-10 flex-1 overflow-y-auto px-12 pb-6 pt-2">
          {games.length === 0 ? (
            <p className="pt-20 text-center text-lg" style={{ color: "var(--app-textSecondary)" }}>
              {t(section === 0 ? "bigPicture.emptyInstalled" : "bigPicture.emptyLibrary")}
            </p>
          ) : (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {games.map((game, i) => {
                const isFocused = i === focusIndex;
                const dl = downloadByGame.get(game._id);
                const installed = !!installedCache[game._id];
                return (
                  <button
                    key={game._id}
                    data-bp-index={i}
                    onMouseEnter={() => setFocusIndex(i)}
                    onClick={() => (isFocused ? activate(game) : setFocusIndex(i))}
                    className="relative rounded-xl overflow-hidden text-left transition-transform duration-150 outline-none"
                    style={{
                      aspectRatio: "3 / 4",
                      transform: isFocused ? "scale(1.06)" : "scale(1)",
                      boxShadow: isFocused
                        ? "0 0 0 3px var(--app-primary), 0 12px 32px rgba(0,0,0,0.5)"
                        : "0 4px 12px rgba(0,0,0,0.3)",
                      zIndex: isFocused ? 1 : 0,
                    }}
                  >
                    <GameCover src={game.coverUrl} alt={game.name} className="w-full h-full object-cover" size="cover_big" />
                    {/* State badges */}
                    {activeGames.has(game._id) && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-success text-white">
                        <FiZap size={10} /> {t("bigPicture.running")}
                      </span>
                    )}
                    {dl && (
                      <span className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-[11px] font-semibold text-white bg-black/70 tabular-nums">
                        {t("bigPicture.installing")} {Math.round(dl.progress || 0)}%
                      </span>
                    )}
                    {!installed && !dl && section === 1 && (
                      <span className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white">
                        <FiDownload size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* First-install path prompt */}
        <AnimatePresence>
          {pathPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ scale: 0.95, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 12 }}
                className="w-full max-w-2xl mx-8 rounded-2xl p-8"
                style={{ background: "var(--app-backgroundSecondary)", border: "1px solid var(--app-border)" }}
              >
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--app-text)" }}>
                  {t("bigPicture.pathPromptTitle")}
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--app-textSecondary)" }}>
                  {t("bigPicture.pathPromptDesc", { name: pathPrompt.game.name })}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "default", title: t("bigPicture.useDefault"), sub: defaultDir },
                    { key: "browse", title: t("bigPicture.browseFolder"), sub: t("bigPicture.browseFolderDesc") },
                  ].map((opt, i) => (
                    <button
                      key={opt.key}
                      onMouseEnter={() => setPromptIndex(i)}
                      onClick={() => resolvePathPrompt(opt.key)}
                      className="rounded-xl p-5 text-left transition-all outline-none"
                      style={{
                        background: promptIndex === i ? "var(--app-primary)" : "rgba(255,255,255,0.04)",
                        color: promptIndex === i ? "#fff" : "var(--app-text)",
                        boxShadow: promptIndex === i ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
                        border: "1px solid var(--app-border)",
                      }}
                    >
                      <span className="block text-base font-bold mb-1">{opt.title}</span>
                      <span
                        className="block text-xs break-all"
                        style={{ opacity: promptIndex === i ? 0.85 : 0.6 }}
                      >
                        {opt.sub}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-8 mt-6 text-xs" style={{ color: "var(--app-textSecondary)" }}>
                  <Hint glyph="A" color="#3fbf5a">{t("quickLaunch.confirm")}</Hint>
                  <Hint glyph="B" color="#e5484d">{t("common.cancel")}</Hint>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Button hint bar */}
        <footer
          className="relative z-10 flex items-center justify-center gap-8 px-12 py-4 text-sm"
          style={{ borderTop: "1px solid var(--app-border)", color: "var(--app-textSecondary)", background: "var(--app-backgroundSecondary)" }}
        >
          <Hint glyph="A" color="#3fbf5a">{focused ? hintAction : t("bigPicture.play")}</Hint>
          <Hint glyph="B" color="#e5484d">{t("bigPicture.exit")}</Hint>
          <Hint glyph="LB · RB" wide>{t("bigPicture.switchSection")}</Hint>
          <Hint glyph="✚">{t("bigPicture.navigate")}</Hint>
          {focused && focusedInstalled && (
            <span className="flex items-center gap-1.5">
              <FiPlay size={13} style={{ color: "var(--app-primary)" }} />
            </span>
          )}
        </footer>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

const Hint = ({ glyph, color, wide, children }) => (
  <span className="flex items-center gap-2">
    <span
      className={`flex items-center justify-center ${wide ? "px-2 rounded-lg" : "w-6 rounded-full"} h-6 text-[11px] font-bold`}
      style={{
        background: color ? `${color}26` : "rgba(255,255,255,0.08)",
        color: color || "var(--app-text)",
        border: `1px solid ${color || "var(--app-border)"}`,
      }}
    >
      {glyph}
    </span>
    {children}
  </span>
);

export default BigPictureMode;
