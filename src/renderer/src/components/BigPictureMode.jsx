import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  FiPlay,
  FiDownload,
  FiClock,
  FiX,
  FiZap,
  FiPause,
  FiSquare,
  FiStar,
  FiTrash2,
  FiSearch,
  FiCalendar,
  FiUser,
  FiUsers,
  FiMonitor,
  FiHardDrive,
  FiTag,
  FiPackage,
  FiTerminal,
  FiBarChart2,
  FiRefreshCw,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";
import { gamepadService } from "../services/gamepadService";
import { gamesCache } from "../utils/gamesCache";
import gameManager from "../services/gameManager";
import uninstallQueue from "../utils/uninstallQueue";
import { bpSounds } from "../services/bpSounds";
import { launchGame as launchGameAPI } from "../api/installedGames";
import { getMergedStats, formatStats } from "../api/gameStats";
import { getGameScreenshots } from "../api/igdb";
import { getModsForGame, getInstalledMods, normalizeGameId } from "../api/mods";
import {
  useDownloadQueue,
  useActiveDownloads,
  useDownloadActions,
} from "../contexts/downloadContext";
import { useConnection } from "../contexts/connectionContext";
import GameCover from "./GameCover";

const CARD_WIDTH = 176; // cover cell incl. gap — drives the grid column math
const SECTIONS = ["installed", "library"];
const SORTS = ["name", "rating", "release"]; // library section only

// Button glyphs per controller family (standard mapping keeps the same
// indices — only labels and colors differ)
const PAD_GLYPHS = {
  xbox: {
    confirm: "A", back: "B", action: "X", secondary: "Y", bumpers: "LB · RB",
    confirmColor: "#3fbf5a", backColor: "#e5484d", actionColor: "#3b82f6", secondaryColor: "#e8b339",
  },
  playstation: {
    confirm: "✕", back: "◯", action: "▢", secondary: "△", bumpers: "L1 · R1",
    confirmColor: "#7c9cd9", backColor: "#ff6265", actionColor: "#e48fc0", secondaryColor: "#40c9a2",
  },
};

const STATUS_VALUES = [null, "backlog", "inProgress", "completed", "dropped"];
const STATUS_COLORS = {
  backlog: "var(--app-primary)",
  inProgress: "var(--app-warning)",
  completed: "var(--app-success)",
  dropped: "#f87171",
};

// On-screen keyboard layout; special keys are objects
const OSK_SPACE = { special: "space" };
const OSK_ERASE = { special: "erase" };
const OSK_DONE = { special: "done" };
const OSK_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
  ["K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"],
  ["U", "V", "W", "X", "Y", "Z", "-", "'", ":", "&"],
  [OSK_SPACE, OSK_ERASE, OSK_DONE],
];

const formatPlaytime = (stats) => {
  const total = stats?.totalPlayTime || 0;
  if (total < 60) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const genreName = (g) => (typeof g === "string" ? g : g?.name || "");
const platformName = (p) => (typeof p === "string" ? p : p?.name || "");

const formatSize = (sizeMB) =>
  sizeMB > 0 ? (sizeMB >= 1024 ? `${(sizeMB / 1024).toFixed(2)} GB` : `${sizeMB} MB`) : null;

const displayRatingOf = (game) => {
  const raw =
    game?.rating > 0 ? game.rating : game?.aggregatedRating > 0 ? game.aggregatedRating : 0;
  return raw > 0 ? (raw > 10 ? raw / 10 : raw).toFixed(1) : null;
};

const BigPictureMode = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { enqueueGame } = useDownloadQueue();
  const activeDownloads = useActiveDownloads();
  const { removeDownload } = useDownloadActions();
  const { isOnline } = useConnection();
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
  // Detail view (A on a game): interactive rows navigated with the pad
  const [view, setView] = useState("grid"); // "grid" | "detail"
  const [detailPos, setDetailPos] = useState({ row: 0, col: 0 });
  const [detailStats, setDetailStats] = useState(null);
  const [modsInfo, setModsInfo] = useState(null);
  // Per-user data surfaced in the detail view
  const [gameStatuses, setGameStatuses] = useState({});
  const [launchOpts, setLaunchOpts] = useState({});
  const [displays, setDisplays] = useState([]);
  // Uninstall confirmation (inside detail view)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIndex, setConfirmIndex] = useState(0); // 0 = cancel, 1 = confirm
  const [uninstalling, setUninstalling] = useState(false);
  // Search overlay with on-screen keyboard
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [osk, setOsk] = useState({ row: 1, col: 0 });
  const [sortMode, setSortMode] = useState(0);
  // IGDB screenshots for the detail backdrop (rotating)
  const [shots, setShots] = useState([]);
  const [shotIndex, setShotIndex] = useState(0);
  // "Now playing" overlay shown when BP opens while a game is running
  const [nowPlaying, setNowPlaying] = useState(null); // { gameId, name, startTime } | null
  const [nowPlayingIndex, setNowPlayingIndex] = useState(0); // 0 = resume, 1 = stop
  const [soundsOn, setSoundsOn] = useState(true);
  const [padType, setPadType] = useState(gamepadService.getPadType());
  const gridRef = useRef(null);
  const launchingRef = useRef(false);
  const statsCacheRef = useRef(new Map());
  const modsCacheRef = useRef(new Map());

  // Same data path as QuickLaunch: server cache first, installed cache offline
  useEffect(() => {
    if (!isOpen) return;
    setSection(0);
    setFocusIndex(0);
    launchingRef.current = false;
    setPathPrompt(null);
    setView("grid");
    setConfirmOpen(false);
    setSearchOpen(false);
    setQuery("");
    setSortMode(0);
    statsCacheRef.current.clear();
    modsCacheRef.current.clear();
    window.store.get("installedGamesCache").then((c) => setInstalledCache(c || {}));
    window.store.get("gameStatuses").then((s) => setGameStatuses(s || {}));
    window.store.get("gameLaunchOptions").then((o) => setLaunchOpts(o || {}));
    window.api.app
      .getDisplays()
      .then((d) => setDisplays(d || []))
      .catch(() => {});
    const cachedGames = gamesCache.get()?.games || [];
    setServerGames(cachedGames);
    gameManager.getActiveGames().then(async (running) => {
      setActiveGames(new Set(running.map((g) => g.gameId)));
      // A game is running while BP opens → offer Resume / Stop up front
      if (running.length > 0) {
        const g = running[0];
        const cache = (await window.store.get("installedGamesCache")) || {};
        const name =
          cache[g.gameId]?.name ||
          cachedGames.find((x) => x._id === g.gameId)?.name ||
          g.executableName ||
          "";
        setNowPlayingIndex(0);
        setNowPlaying({
          gameId: g.gameId,
          name,
          startTime: g.startTime,
          coverUrl: cache[g.gameId]?.coverUrl,
        });
      } else {
        setNowPlaying(null);
      }
    });
    window.store.get("bpSoundsEnabled").then((v) => {
      const on = v !== false;
      setSoundsOn(on);
      bpSounds.setEnabled(on);
    });
    window.api.app
      .getDefaultDownloadDir()
      .then(setDefaultDir)
      .catch(() => {});
  }, [isOpen]);

  // Live session clock while the "now playing" overlay is visible
  useEffect(() => {
    if (!nowPlaying) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [nowPlaying]);

  // Xbox vs PlayStation glyphs follow whichever pad is connected
  useEffect(() => {
    if (!isOpen) return;
    setPadType(gamepadService.getPadType());
    const unsubs = [
      gamepadService.on("connected", ({ type }) => type && setPadType(type)),
      gamepadService.on("typechange", ({ type }) => setPadType(type)),
    ];
    return () => unsubs.forEach((u) => u());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [isOpen]);

  // A finished install fires games:installed (downloadContext) — reload the
  // cache so the game moves from Library to Installed without reopening BP
  useEffect(() => {
    if (!isOpen) return;
    const refresh = () =>
      window.store.get("installedGamesCache").then((c) => setInstalledCache(c || {}));
    window.addEventListener("games:installed", refresh);
    return () => window.removeEventListener("games:installed", refresh);
  }, [isOpen]);

  const lists = useMemo(() => {
    let installed = serverGames.filter((g) => installedCache[g._id]);
    if (installed.length === 0 && Object.keys(installedCache).length > 0) {
      installed = Object.entries(installedCache).map(([id, data]) => ({
        _id: id,
        name: data.name,
        coverUrl: data.coverUrl,
        sizeMB: data.sizeMB,
        version: data.version,
        genres: data.genres,
        summary: data.summary,
        storyline: data.storyline,
        releaseDate: data.releaseDate,
        developer: data.developer,
        publisher: data.publisher,
        platforms: data.platforms,
        multiplayer: data.multiplayer,
      }));
    }
    installed.sort((a, b) => {
      const la = installedCache[a._id]?.stats?.lastPlayed || 0;
      const lb = installedCache[b._id]?.stats?.lastPlayed || 0;
      return lb - la || (a.name || "").localeCompare(b.name || "");
    });
    // Library only lists what is not installed yet — installed games live
    // in the Installed section
    let library = serverGames.filter((g) => !installedCache[g._id]);
    const sortKey = SORTS[sortMode];
    if (sortKey === "rating") {
      library.sort(
        (a, b) => (b.rating || b.aggregatedRating || 0) - (a.rating || a.aggregatedRating || 0)
      );
    } else if (sortKey === "release") {
      library.sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0));
    } else {
      library.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    if (query) {
      const q = query.toLowerCase();
      const match = (g) => (g.name || "").toLowerCase().includes(q);
      installed = installed.filter(match);
      library = library.filter(match);
    }
    return { installed, library };
  }, [serverGames, installedCache, query, sortMode]);

  const games = lists[SECTIONS[section]];
  const focused = games[focusIndex] ?? null;
  const downloadByGame = useMemo(() => {
    const map = new Map();
    for (const dl of activeDownloads) map.set(dl.gameId, dl);
    return map;
  }, [activeDownloads]);
  const focusedDl = focused ? downloadByGame.get(focused._id) : null;
  const focusedInstalled = focused ? !!installedCache[focused._id] : false;
  const focusedRunning = focused ? activeGames.has(focused._id) : false;
  const updateAvailable =
    focusedInstalled &&
    focused?.version &&
    installedCache[focused._id]?.version &&
    String(installedCache[focused._id].version) !== String(focused.version);

  useEffect(() => {
    setFocusIndex(0);
  }, [query, sortMode]);

  // Lists can shrink while BP is open (install moves a game out of Library)
  useEffect(() => {
    setFocusIndex((i) => Math.min(i, Math.max(0, games.length - 1)));
  }, [games.length]);

  // Contextual actions — mirrors what the Games page offers
  const detailActions = useMemo(() => {
    if (!focused) return [];
    const acts = [];
    if (focusedRunning)
      acts.push({ key: "stop", label: t("bigPicture.stopGame"), icon: FiSquare, danger: true });
    else if (focusedInstalled)
      acts.push({ key: "play", label: t("bigPicture.play"), icon: FiPlay, primary: true });
    if (updateAvailable && !focusedDl && !focusedRunning) {
      acts.push({
        key: "update",
        label: t("bigPicture.update"),
        icon: FiRefreshCw,
        primary: !focusedInstalled,
      });
    }
    if (focusedDl) {
      if (focusedDl.stage === "paused")
        acts.push({
          key: "resume",
          label: t("bigPicture.resumeDownload"),
          icon: FiPlay,
          primary: true,
        });
      else if (focusedDl.stage === "downloading")
        acts.push({ key: "pause", label: t("bigPicture.pauseDownload"), icon: FiPause });
      acts.push({ key: "cancel", label: t("bigPicture.cancelDownload"), icon: FiX, danger: true });
    } else if (!focusedInstalled && !focusedRunning) {
      acts.push({
        key: "install",
        label: t("bigPicture.install"),
        icon: FiDownload,
        primary: true,
      });
    }
    if (focusedInstalled && !focusedRunning && !focusedDl) {
      acts.push({ key: "uninstall", label: t("games.uninstall"), icon: FiTrash2, danger: true });
    }
    return acts;
  }, [focused, focusedDl, focusedRunning, focusedInstalled, updateAvailable, t]);

  const statusItems = useMemo(
    () =>
      STATUS_VALUES.map((value) => ({
        value,
        label: value
          ? t(`games.userStatus${value.charAt(0).toUpperCase()}${value.slice(1)}`)
          : t("games.userStatusNone"),
        color: value ? STATUS_COLORS[value] : null,
      })),
    [t]
  );

  const displayItems = useMemo(() => {
    if (displays.length < 2) return [];
    return [
      { value: 0, label: t("games.launchDisplayAuto") },
      ...displays.map((d) => ({
        value: d.index,
        label: `${t("games.launchDisplayN", { n: d.index, res: `${d.width}×${d.height}` })}${d.primary ? " ★" : ""}`,
      })),
    ];
  }, [displays, t]);

  // Pad-navigable rows of the detail view (order matters for up/down)
  const detailRows = useMemo(() => {
    const rows = [];
    if (detailActions.length > 0) rows.push({ type: "actions", items: detailActions });
    if (focused)
      rows.push({ type: "status", label: t("games.userStatusLabel"), items: statusItems });
    if (focusedInstalled && displayItems.length > 0)
      rows.push({ type: "display", label: t("games.launchDisplay"), items: displayItems });
    return rows;
  }, [detailActions, statusItems, displayItems, focused, focusedInstalled, t]);

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
  }, [isOpen, view]);

  useEffect(() => {
    if (view !== "grid") return;
    gridRef.current
      ?.querySelector(`[data-bp-index="${focusIndex}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusIndex, section, view]);

  // Fetch merged stats + mods count when a detail page opens (cached per game)
  useEffect(() => {
    if (view !== "detail" || !focused) return;
    const id = focused._id;

    if (statsCacheRef.current.has(id)) {
      setDetailStats(statsCacheRef.current.get(id));
    } else if (installedCache[id]) {
      setDetailStats(null);
      getMergedStats(id)
        .then((s) => {
          const f = formatStats(s);
          statsCacheRef.current.set(id, f);
          setDetailStats(f);
        })
        .catch(() => setDetailStats(null));
    } else {
      setDetailStats(null);
    }

    if (modsCacheRef.current.has(id)) {
      setModsInfo(modsCacheRef.current.get(id));
    } else if (isOnline) {
      setModsInfo(null);
      Promise.all([getModsForGame(id, { limit: 1 }), getInstalledMods({ limit: 100 })])
        .then(([available, installed]) => {
          const normalized = normalizeGameId(id);
          const installedCount = (installed.installedMods || []).filter(
            (m) => normalizeGameId(m.gameId) === normalized
          ).length;
          const info = { available: available.totalMods || 0, installed: installedCount };
          modsCacheRef.current.set(id, info);
          setModsInfo(info);
        })
        .catch(() => setModsInfo(null));
    } else {
      setModsInfo(null);
    }
  }, [view, focused, installedCache, isOnline]);

  // Screenshots for the focused game's detail page (IGDB via the backend)
  useEffect(() => {
    setShots([]);
    setShotIndex(0);
    if (view !== "detail" || !focused?.igdbId || !isOnline) return;
    let cancelled = false;
    getGameScreenshots(focused.igdbId).then((urls) => {
      if (!cancelled && urls.length > 0) setShots(urls);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, focused?._id, isOnline]);

  useEffect(() => {
    if (view !== "detail" || shots.length < 2) return;
    const id = setInterval(() => setShotIndex((i) => (i + 1) % shots.length), 7000);
    return () => clearInterval(id);
  }, [view, shots.length]);

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
        choice === "default" ? defaultDir : await window.api.selectAndCreateFolder("DrathosGames");
      if (!chosen) return; // browse cancelled — keep the prompt open

      await window.store.set("downloadPath", chosen);
      setPathPrompt(null);
      enqueueGame(game);
      toast.success(t("bigPicture.installQueued", { name: game.name }));
    },
    [pathPrompt, defaultDir, enqueueGame, t]
  );

  const setGameStatus = useCallback((gameId, value) => {
    setGameStatuses((prev) => {
      const next = { ...prev };
      if (value === null) delete next[gameId];
      else next[gameId] = value;
      window.store.set("gameStatuses", next);
      return next;
    });
  }, []);

  const setGameDisplay = useCallback(async (gameId, index) => {
    const opts = (await window.store.get("gameLaunchOptions")) || {};
    const entry = { ...(opts[gameId] || {}) };
    if (index) entry.display = index;
    else delete entry.display;
    if (Object.keys(entry).length > 0) opts[gameId] = entry;
    else delete opts[gameId];
    await window.store.set("gameLaunchOptions", opts);
    setLaunchOpts(opts);
  }, []);

  const doUninstall = useCallback(async () => {
    const game = focused;
    const cached = game ? installedCache[game._id] : null;
    if (!game || !cached?.path || uninstalling) return;
    setConfirmOpen(false);
    setUninstalling(true);
    try {
      if (!isOnline) {
        // Offline: queue it, like the Games page — runs when the server is back
        await uninstallQueue.enqueue(game._id, game.name, cached.path);
        toast.info(t("games.offlineUninstallMessage", { gameName: game.name }));
      } else {
        const result = await gameManager.uninstallGame(game._id, cached.path, game.name);
        if (result?.success) {
          toast.success(t("games.uninstallSuccessDesc", { name: game.name }));
        } else {
          toast.error(t("errors.uninstallFailed"), { description: game.name });
        }
      }
    } catch {
      toast.error(t("errors.uninstallFailed"), { description: game.name });
    } finally {
      setUninstalling(false);
      setView("grid");
      window.store.get("installedGamesCache").then((c) => setInstalledCache(c || {}));
    }
  }, [focused, installedCache, isOnline, uninstalling, t]);

  const stopNowPlaying = useCallback(async () => {
    const np = nowPlaying;
    if (!np) return;
    setNowPlaying(null);
    const res = await gameManager.stopGame(np.gameId);
    if (res?.success) {
      setActiveGames((prev) => {
        const next = new Set(prev);
        next.delete(np.gameId);
        return next;
      });
      toast.success(t("bigPicture.stopped", { name: np.name }));
    } else {
      toast.error(t("games.stopFailedDesc", { name: np.name }));
    }
  }, [nowPlaying, t]);

  const toggleSounds = useCallback(() => {
    setSoundsOn((prev) => {
      const next = !prev;
      bpSounds.setEnabled(next);
      window.store.set("bpSoundsEnabled", next);
      return next;
    });
  }, []);

  const runAction = useCallback(
    async (key) => {
      const game = focused;
      if (!game) return;
      switch (key) {
        case "play":
        case "install":
          setView("grid");
          activate(game);
          break;
        case "update": {
          const full = serverGames.find((g) => g._id === game._id);
          if (!full) return;
          enqueueGame(full);
          toast.success(t("bigPicture.installQueued", { name: game.name }));
          break;
        }
        case "stop": {
          const res = await gameManager.stopGame(game._id);
          if (res?.success) {
            setActiveGames((prev) => {
              const next = new Set(prev);
              next.delete(game._id);
              return next;
            });
            toast.success(t("bigPicture.stopped", { name: game.name }));
          } else {
            toast.error(t("games.stopFailedDesc", { name: game.name }));
          }
          break;
        }
        case "pause":
          window.api.pauseDownload(game._id).catch(() => {});
          break;
        case "resume":
          window.api.resumeDownload(game._id).catch(() => {});
          break;
        case "cancel": {
          const dl = downloadByGame.get(game._id);
          try {
            await window.api.cancelDownload(game._id);
            if (dl) removeDownload(dl.id);
            toast.info(t("downloads.cancelled", { name: game.name }));
          } catch {
            /* main process logs the failure */
          }
          break;
        }
        case "uninstall":
          setConfirmIndex(0);
          setConfirmOpen(true);
          break;
      }
    },
    [focused, activate, serverGames, enqueueGame, downloadByGame, removeDownload, t]
  );

  const openDetail = useCallback((index) => {
    setFocusIndex(index);
    setDetailPos({ row: 0, col: 0 });
    setView("detail");
  }, []);

  const oskPress = useCallback((key) => {
    if (key === OSK_SPACE) setQuery((q) => (q.length && !q.endsWith(" ") ? q + " " : q));
    else if (key === OSK_ERASE) setQuery((q) => q.slice(0, -1));
    else if (key === OSK_DONE) setSearchOpen(false);
    else setQuery((q) => (q + key).slice(0, 40));
  }, []);

  // Entering a row lands on its current value (status/display) instead of col 0
  const smartCol = useCallback(
    (row) => {
      if (!focused) return 0;
      if (row.type === "status") {
        const cur = gameStatuses[focused._id] ?? null;
        return Math.max(
          0,
          row.items.findIndex((it) => it.value === cur)
        );
      }
      if (row.type === "display") {
        const cur = launchOpts[focused._id]?.display || 0;
        return Math.max(
          0,
          row.items.findIndex((it) => it.value === cur)
        );
      }
      return 0;
    },
    [focused, gameStatuses, launchOpts]
  );

  const runDetailItem = useCallback(
    (row, item) => {
      if (!focused) return;
      if (row.type === "actions") runAction(item.key);
      else if (row.type === "status") setGameStatus(focused._id, item.value);
      else if (row.type === "display") setGameDisplay(focused._id, item.value);
    },
    [focused, runAction, setGameStatus, setGameDisplay]
  );

  // Input — gamepad (exclusive claim) + keyboard parity.
  // Priority: path prompt > uninstall confirm > search > detail > grid.
  useEffect(() => {
    if (!isOpen) return;
    gamepadService.claimExclusive("bigpicture");

    const promptOpen = pathPrompt !== null;
    const onNav = (direction) => {
      bpSounds.tick();
      if (nowPlaying) {
        if (direction === "left" || direction === "right") setNowPlayingIndex((i) => 1 - i);
        return;
      }
      if (promptOpen) {
        if (direction === "left" || direction === "right") setPromptIndex((i) => 1 - i);
        return;
      }
      if (confirmOpen) {
        if (direction === "left" || direction === "right") setConfirmIndex((i) => 1 - i);
        return;
      }
      if (searchOpen) {
        setOsk(({ row, col }) => {
          let r = row;
          let c = col;
          if (direction === "up") r = Math.max(0, row - 1);
          if (direction === "down") r = Math.min(OSK_ROWS.length - 1, row + 1);
          if (direction === "left") c = Math.max(0, col - 1);
          if (direction === "right") c = col + 1;
          c = Math.min(c, OSK_ROWS[r].length - 1);
          return { row: r, col: c };
        });
        return;
      }
      if (view === "detail") {
        setDetailPos(({ row, col }) => {
          if (detailRows.length === 0) return { row: 0, col: 0 };
          if (direction === "left") return { row, col: Math.max(0, col - 1) };
          if (direction === "right")
            return { row, col: Math.min((detailRows[row]?.items.length || 1) - 1, col + 1) };
          if (direction === "up") {
            const r = Math.max(0, row - 1);
            return r === row ? { row, col } : { row: r, col: smartCol(detailRows[r]) };
          }
          if (direction === "down") {
            const r = Math.min(detailRows.length - 1, row + 1);
            return r === row ? { row, col } : { row: r, col: smartCol(detailRows[r]) };
          }
          return { row, col };
        });
        return;
      }
      move(direction);
    };
    const onConfirm = () => {
      bpSounds.confirm();
      if (nowPlaying) {
        if (nowPlayingIndex === 1) stopNowPlaying();
        else {
          setNowPlaying(null);
          onClose(); // resume: get back to the game
        }
        return;
      }
      if (promptOpen) {
        resolvePathPrompt(promptIndex === 0 ? "default" : "browse");
        return;
      }
      if (confirmOpen) {
        if (confirmIndex === 1) doUninstall();
        else setConfirmOpen(false);
        return;
      }
      if (searchOpen) {
        oskPress(OSK_ROWS[osk.row][osk.col]);
        return;
      }
      if (view === "detail") {
        const row = detailRows[Math.min(detailPos.row, detailRows.length - 1)];
        const item = row?.items[Math.min(detailPos.col, (row?.items.length || 1) - 1)];
        if (row && item) runDetailItem(row, item);
        return;
      }
      if (games[focusIndex]) openDetail(focusIndex);
    };
    const onBack = () => {
      bpSounds.back();
      if (nowPlaying) {
        setNowPlaying(null); // dismiss, stay in Big Picture
        return;
      }
      if (promptOpen) {
        setPathPrompt(null);
        return;
      }
      if (confirmOpen) {
        setConfirmOpen(false);
        return;
      }
      if (searchOpen) {
        setSearchOpen(false);
        return;
      }
      if (view === "detail") {
        setView("grid");
        return;
      }
      if (query) {
        setQuery("");
        return;
      }
      onClose();
    };
    // X: quick play/install from the grid, erase in search
    const onAction = () => {
      if (nowPlaying || promptOpen || confirmOpen) return;
      bpSounds.confirm();
      if (searchOpen) {
        oskPress(OSK_ERASE);
        return;
      }
      if (view === "grid") activate(games[focusIndex]);
    };
    // Y: open search from the grid, space in search
    const onSecondary = () => {
      if (nowPlaying || promptOpen || confirmOpen || view === "detail") return;
      bpSounds.confirm();
      if (searchOpen) {
        oskPress(OSK_SPACE);
        return;
      }
      setOsk({ row: 1, col: 0 });
      setSearchOpen(true);
    };
    const onSelect = () => {
      if (nowPlaying || promptOpen || confirmOpen || searchOpen || view !== "grid") return;
      if (SECTIONS[section] === "library") {
        bpSounds.section();
        setSortMode((m) => (m + 1) % SORTS.length);
      }
    };

    const unsubs = [
      gamepadService.on("nav", ({ direction }) => onNav(direction)),
      gamepadService.on("confirm", onConfirm),
      gamepadService.on("back", onBack),
      gamepadService.on("action", onAction),
      gamepadService.on("secondary", onSecondary),
      gamepadService.on("select", onSelect),
      gamepadService.on("menu", onBack),
      gamepadService.on("prevSection", () => {
        if (nowPlaying || promptOpen || confirmOpen || searchOpen || view !== "grid") return;
        bpSounds.section();
        changeSection(-1);
      }),
      gamepadService.on("nextSection", () => {
        if (nowPlaying || promptOpen || confirmOpen || searchOpen || view !== "grid") return;
        bpSounds.section();
        changeSection(1);
      }),
    ];

    const onKeyDown = (e) => {
      // Physical keyboard can type directly while the search overlay is open
      if (searchOpen && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.length === 1 && /[\w\d\s\-':&.]/i.test(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          setQuery((q) => (q + e.key).slice(0, 40));
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          e.stopPropagation();
          setQuery((q) => q.slice(0, -1));
          return;
        }
      }
      const keys = {
        ArrowUp: () => onNav("up"),
        ArrowDown: () => onNav("down"),
        ArrowLeft: () => onNav("left"),
        ArrowRight: () => onNav("right"),
        Enter: onConfirm,
        Escape: onBack,
        x: onAction,
        X: onAction,
        f: onSecondary,
        F: onSecondary,
        s: onSelect,
        S: onSelect,
        Tab: () =>
          !nowPlaying &&
          !promptOpen &&
          !confirmOpen &&
          !searchOpen &&
          view === "grid" &&
          changeSection(e.shiftKey ? -1 : 1),
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
  }, [
    isOpen,
    games,
    focusIndex,
    move,
    activate,
    changeSection,
    onClose,
    pathPrompt,
    promptIndex,
    resolvePathPrompt,
    view,
    detailPos,
    detailRows,
    smartCol,
    runDetailItem,
    openDetail,
    confirmOpen,
    confirmIndex,
    doUninstall,
    searchOpen,
    osk,
    oskPress,
    query,
    section,
    nowPlaying,
    nowPlayingIndex,
    stopNowPlaying,
  ]);

  if (!isOpen) return null;

  const G = PAD_GLYPHS[padType] || PAD_GLYPHS.xbox;

  const focusedStats = focused ? installedCache[focused._id]?.stats : null;
  const focusedPlaytime = formatPlaytime(focusedStats);
  const focusedRating = focused ? displayRatingOf(focused) : null;
  const focusedSize = focused ? formatSize(focused.sizeMB) : null;
  const focusedYear = focused?.releaseDate ? new Date(focused.releaseDate).getFullYear() : null;
  const clock = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dlCount = activeDownloads.length;
  const dlAvg =
    dlCount > 0
      ? Math.round(activeDownloads.reduce((s, d) => s + (d.progress || 0), 0) / dlCount)
      : 0;
  const sortLabels = {
    name: t("games.sortNameAsc"),
    rating: t("games.sortRating"),
    release: t("games.sortReleaseDate"),
  };
  const currentStatus = focused ? (gameStatuses[focused._id] ?? null) : null;

  const mp = focused?.multiplayer;
  const multiplayerText =
    mp && (mp.enabled || mp === true)
      ? [
          mp.type === "online"
            ? t("bigPicture.mpOnline")
            : mp.type === "local"
              ? t("bigPicture.mpLocal")
              : mp.type === "both"
                ? t("bigPicture.mpBoth")
                : null,
          Array.isArray(mp.modes) && mp.modes.length > 0
            ? mp.modes.map((m) => (m === "co-op" ? "Co-op" : m === "pvp" ? "PvP" : m)).join(", ")
            : null,
          mp.maxPlayers ? `1–${mp.maxPlayers}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "✓"
      : null;

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
        className="fixed inset-0 z-9999 flex flex-col overflow-hidden select-none"
        style={{ background: "var(--app-background)" }}
      >
        <AnimatePresence mode="wait">
          {view === "detail" && shots.length > 0 ? (
            // Sharp screenshot backdrop, rotating every few seconds
            <motion.img
              key={`shot-${shotIndex}`}
              src={shots[shotIndex]}
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          ) : focused?.coverUrl ? (
            <motion.img
              key={focused._id}
              src={focused.coverUrl}
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: view === "detail" ? 0.3 : 0.22 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 pointer-events-none"
            />
          ) : null}
        </AnimatePresence>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, var(--app-background) 90%)",
          }}
        />

        <header className="relative z-10 flex items-center justify-between px-12 pt-8 pb-4">
          <span
            className="text-xl font-black tracking-[0.25em] uppercase"
            style={{ color: "var(--app-text)" }}
          >
            Drathos
          </span>
          <nav className="flex items-center gap-2" aria-label={t("bigPicture.sections")}>
            {SECTIONS.map((key, i) => (
              <button
                key={key}
                onClick={() => {
                  setView("grid");
                  setSection(i);
                  setFocusIndex(0);
                }}
                className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                style={
                  i === section && view === "grid"
                    ? { background: "var(--app-primary)", color: "#fff" }
                    : { color: "var(--app-textSecondary)" }
                }
              >
                {t(`bigPicture.${key}`)}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            {dlCount > 0 && (
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tabular-nums"
                style={{ background: "var(--app-primary)", color: "#fff" }}
              >
                <FiDownload size={12} /> {dlCount} · {dlAvg}%
              </span>
            )}
            {query && (
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "var(--app-text)",
                  border: "1px solid var(--app-border)",
                }}
              >
                <FiSearch size={12} /> {query}
              </span>
            )}
            <span
              className="text-lg font-semibold tabular-nums"
              style={{ color: "var(--app-text)" }}
            >
              {clock}
            </span>
            <button
              onClick={toggleSounds}
              aria-label={t("bigPicture.sounds")}
              title={t("bigPicture.sounds")}
              className="p-2 rounded-full transition-colors hover:bg-white/10"
              style={{ color: "var(--app-textSecondary)" }}
            >
              {soundsOn ? <FiVolume2 size={18} /> : <FiVolumeX size={18} />}
            </button>
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

        {view === "grid" && (
          <>
            <div className="relative z-10 px-12 h-16">
              <div className="flex items-baseline justify-between">
                {focused ? (
                  <div className="flex items-baseline gap-4 min-w-0">
                    <h1
                      className="text-3xl font-bold truncate max-w-[55vw]"
                      style={{ color: "var(--app-text)" }}
                    >
                      {focused.name}
                    </h1>
                    {focusedRunning && (
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-success shrink-0">
                        <FiZap size={14} /> {t("bigPicture.running")}
                      </span>
                    )}
                    {updateAvailable && (
                      <span
                        className="flex items-center gap-1.5 text-sm font-semibold shrink-0"
                        style={{ color: "var(--app-warning)" }}
                      >
                        <FiRefreshCw size={13} /> {t("bigPicture.updateAvailable")}
                      </span>
                    )}
                    {focusedPlaytime && (
                      <span
                        className="flex items-center gap-1.5 text-sm shrink-0"
                        style={{ color: "var(--app-textSecondary)" }}
                      >
                        <FiClock size={13} /> {focusedPlaytime}
                      </span>
                    )}
                    {focused.genres?.[0] && (
                      <span
                        className="text-sm shrink-0"
                        style={{ color: "var(--app-textSecondary)" }}
                      >
                        {genreName(focused.genres[0])}
                      </span>
                    )}
                    {focusedRating && (
                      <span
                        className="flex items-center gap-1 text-sm shrink-0"
                        style={{ color: "var(--app-textSecondary)" }}
                      >
                        <FiStar size={13} style={{ color: "var(--app-warning)" }} /> {focusedRating}
                      </span>
                    )}
                    {focusedSize && (
                      <span
                        className="text-sm shrink-0"
                        style={{ color: "var(--app-textSecondary)" }}
                      >
                        {focusedSize}
                      </span>
                    )}
                    {focusedDl && (
                      <span
                        className="text-sm font-semibold tabular-nums shrink-0"
                        style={{ color: "var(--app-primary)" }}
                      >
                        {focusedDl.stage === "paused"
                          ? t("bigPicture.paused")
                          : `${t("bigPicture.installing")} ${Math.round(focusedDl.progress || 0)}%`}
                      </span>
                    )}
                  </div>
                ) : (
                  <span />
                )}
                {SECTIONS[section] === "library" && games.length > 1 && (
                  <button
                    onClick={() => setSortMode((m) => (m + 1) % SORTS.length)}
                    className="text-sm shrink-0 px-3 py-1 rounded-full transition-colors hover:bg-white/10"
                    style={{ color: "var(--app-textSecondary)" }}
                  >
                    ↕ {sortLabels[SORTS[sortMode]]}
                  </button>
                )}
              </div>
            </div>

            <div ref={gridRef} className="relative z-10 flex-1 overflow-y-auto px-12 pb-6 pt-2">
              {games.length === 0 ? (
                <p
                  className="pt-20 text-center text-lg"
                  style={{ color: "var(--app-textSecondary)" }}
                >
                  {query
                    ? t("bigPicture.noResults", { query })
                    : t(
                        section === 0
                          ? "bigPicture.emptyInstalled"
                          : serverGames.length > 0
                            ? "bigPicture.allInstalled"
                            : "bigPicture.emptyLibrary"
                      )}
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
                    const gameStatus = gameStatuses[game._id];
                    return (
                      <button
                        key={game._id}
                        data-bp-index={i}
                        onMouseEnter={() => setFocusIndex(i)}
                        onClick={() => (isFocused ? openDetail(i) : setFocusIndex(i))}
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
                        <GameCover
                          src={game.coverUrl}
                          alt={game.name}
                          className="w-full h-full object-cover"
                          size="cover_big"
                        />
                        {activeGames.has(game._id) && (
                          <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-success text-white">
                            <FiZap size={10} /> {t("bigPicture.running")}
                          </span>
                        )}
                        {!activeGames.has(game._id) && gameStatus && (
                          <span
                            className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full"
                            style={{
                              background: STATUS_COLORS[gameStatus],
                              boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
                            }}
                          />
                        )}
                        {dl && (
                          <span className="absolute inset-x-0 bottom-0 text-[11px] font-semibold text-white bg-black/70 tabular-nums">
                            <span className="block px-2 py-1.5">
                              {dl.stage === "paused"
                                ? t("bigPicture.paused")
                                : `${t("bigPicture.installing")} ${Math.round(dl.progress || 0)}%`}
                            </span>
                            <span className="block h-1 bg-white/20">
                              <span
                                className="block h-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, dl.progress || 0)}%`,
                                  background:
                                    dl.stage === "paused"
                                      ? "var(--app-warning)"
                                      : "var(--app-primary)",
                                }}
                              />
                            </span>
                          </span>
                        )}
                        {!installed && !dl && section === 1 && (
                          <span className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white">
                            <FiDownload size={12} />
                          </span>
                        )}
                        {installed &&
                          game.version &&
                          installedCache[game._id]?.version &&
                          String(installedCache[game._id].version) !== String(game.version) && (
                            <span
                              className="absolute top-2 right-2 p-1.5 rounded-full text-black"
                              style={{ background: "var(--app-warning)" }}
                            >
                              <FiRefreshCw size={12} />
                            </span>
                          )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {view === "detail" && focused && (
          <div className="relative z-10 flex-1 overflow-y-auto px-12 pb-6 pt-2">
            <div className="flex gap-10 max-w-6xl mx-auto">
              <div className="shrink-0 w-64">
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ aspectRatio: "3 / 4", boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}
                >
                  <GameCover
                    src={focused.coverUrl}
                    alt={focused.name}
                    className="w-full h-full object-cover"
                    size="cover_big"
                  />
                </div>

                {focusedInstalled && (
                  <div className="mt-4 flex flex-col gap-2">
                    <StatRow
                      icon={FiClock}
                      label={t("games.playtime")}
                      value={detailStats?.totalPlayTime || focusedPlaytime || "—"}
                    />
                    <StatRow
                      icon={FiBarChart2}
                      label={t("games.sessions")}
                      value={detailStats ? String(detailStats.totalSessions ?? 0) : "—"}
                    />
                    {detailStats?.averageSessionSeconds > 0 && (
                      <StatRow
                        icon={FiClock}
                        label={t("bigPicture.avgSession")}
                        value={detailStats.averageSessionTime}
                      />
                    )}
                    <StatRow
                      icon={FiCalendar}
                      label={t("bigPicture.lastPlayed")}
                      value={detailStats?.lastPlayedFormatted || t("games.never")}
                    />
                    {detailStats?.firstLaunchedFormatted &&
                      detailStats.firstLaunchedFormatted !== t("games.never") && (
                        <StatRow
                          icon={FiCalendar}
                          label={t("bigPicture.firstLaunched")}
                          value={detailStats.firstLaunchedFormatted}
                        />
                      )}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-4 flex-wrap">
                  <h1 className="text-4xl font-bold" style={{ color: "var(--app-text)" }}>
                    {focused.name}
                  </h1>
                  {focusedRunning && (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
                      <FiZap size={14} /> {t("bigPicture.running")}
                    </span>
                  )}
                  {updateAvailable && (
                    <span
                      className="flex items-center gap-1.5 text-sm font-semibold"
                      style={{ color: "var(--app-warning)" }}
                    >
                      <FiRefreshCw size={13} /> {t("bigPicture.updateAvailable")}
                    </span>
                  )}
                </div>

                <div
                  className="flex items-center gap-3 mt-3 flex-wrap text-sm"
                  style={{ color: "var(--app-textSecondary)" }}
                >
                  {focusedYear && <span>{focusedYear}</span>}
                  {focusedRating && (
                    <span className="flex items-center gap-1">
                      <FiStar size={13} style={{ color: "var(--app-warning)" }} /> {focusedRating}
                    </span>
                  )}
                  {focusedSize && <span>{focusedSize}</span>}
                  {focused.version && (
                    <span>
                      v{String(focused.version).replace(/^v/i, "")}
                      {updateAvailable && installedCache[focused._id]?.version && (
                        <span style={{ color: "var(--app-warning)" }}>
                          {" "}
                          (
                          {t("bigPicture.installedVersion", {
                            version: installedCache[focused._id].version,
                          })}
                          )
                        </span>
                      )}
                    </span>
                  )}
                  {focused.genres?.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <FiTag size={12} />
                      {focused.genres.slice(0, 3).map(genreName).filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {focusedDl && (
                    <span
                      className="font-semibold tabular-nums"
                      style={{ color: "var(--app-primary)" }}
                    >
                      {focusedDl.stage === "paused"
                        ? t("bigPicture.paused")
                        : `${t("bigPicture.installing")} ${Math.round(focusedDl.progress || 0)}%`}
                    </span>
                  )}
                </div>

                {/* Pad-navigable rows: actions, user status, target display */}
                <div className="flex flex-col gap-4 mt-6">
                  {detailRows.map((row, rowIdx) => (
                    <div key={row.type}>
                      {row.label && (
                        <p
                          className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                          style={{ color: "var(--app-textSecondary)" }}
                        >
                          {row.label}
                        </p>
                      )}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {row.items.map((item, colIdx) => {
                          const isFocusedItem =
                            detailPos.row === rowIdx && detailPos.col === colIdx;
                          const isActions = row.type === "actions";
                          const isCurrent =
                            (row.type === "status" && item.value === currentStatus) ||
                            (row.type === "display" &&
                              item.value === (launchOpts[focused._id]?.display || 0));
                          return (
                            <button
                              key={row.type + colIdx}
                              onMouseEnter={() => setDetailPos({ row: rowIdx, col: colIdx })}
                              onClick={() => runDetailItem(row, item)}
                              disabled={uninstalling}
                              className={`flex items-center gap-2 rounded-xl font-bold transition-all outline-none ${
                                isActions ? "px-6 py-3.5 text-base" : "px-4 py-2 text-sm"
                              }`}
                              style={{
                                background: isFocusedItem
                                  ? item.danger
                                    ? "var(--app-error)"
                                    : "var(--app-primary)"
                                  : isCurrent
                                    ? "rgba(255,255,255,0.12)"
                                    : "rgba(255,255,255,0.05)",
                                color: isFocusedItem
                                  ? "#fff"
                                  : isCurrent && item.color
                                    ? item.color
                                    : "var(--app-text)",
                                border: `1px solid ${isCurrent && !isFocusedItem ? item.color || "var(--app-primary)" : "var(--app-border)"}`,
                                boxShadow: isFocusedItem ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
                                transform: isFocusedItem ? "scale(1.04)" : "scale(1)",
                                opacity: uninstalling ? 0.6 : 1,
                              }}
                            >
                              {item.icon && <item.icon size={isActions ? 17 : 13} />}
                              {!item.icon && item.color && (
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ background: item.color }}
                                />
                              )}
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {focused.summary && (
                  <p
                    className="text-sm mt-6 leading-relaxed overflow-hidden max-w-3xl"
                    style={{
                      color: "var(--app-textSecondary)",
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {focused.summary}
                  </p>
                )}

                {focused.storyline && focused.storyline !== focused.summary && (
                  <div className="mt-4 max-w-3xl">
                    <p
                      className="text-xs font-semibold uppercase tracking-wider mb-1"
                      style={{ color: "var(--app-textSecondary)" }}
                    >
                      {t("bigPicture.story")}
                    </p>
                    <p
                      className="text-sm leading-relaxed overflow-hidden"
                      style={{
                        color: "var(--app-textSecondary)",
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {focused.storyline}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-10 gap-y-3 mt-6 max-w-3xl pb-4">
                  {focused.developer && (
                    <DetailRow
                      icon={FiUser}
                      label={t("games.developer")}
                      value={focused.developer}
                    />
                  )}
                  {focused.publisher && (
                    <DetailRow
                      icon={FiUsers}
                      label={t("games.publisher")}
                      value={focused.publisher}
                    />
                  )}
                  {focused.releaseDate && (
                    <DetailRow
                      icon={FiCalendar}
                      label={t("games.releaseDate")}
                      value={new Date(focused.releaseDate).toLocaleDateString(i18n.language)}
                    />
                  )}
                  {focused.platforms?.length > 0 && (
                    <DetailRow
                      icon={FiMonitor}
                      label={t("games.platforms")}
                      value={focused.platforms
                        .slice(0, 3)
                        .map(platformName)
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  )}
                  {multiplayerText && (
                    <DetailRow
                      icon={FiUsers}
                      label={t("games.multiplayer")}
                      value={multiplayerText}
                    />
                  )}
                  {modsInfo && (modsInfo.available > 0 || modsInfo.installed > 0) && (
                    <DetailRow
                      icon={FiPackage}
                      label="Mods"
                      value={t("bigPicture.modsInfo", {
                        available: modsInfo.available,
                        installed: modsInfo.installed,
                      })}
                    />
                  )}
                  {focusedInstalled && installedCache[focused._id]?.path && (
                    <DetailRow
                      icon={FiHardDrive}
                      label={t("games.installedSize")}
                      value={formatSize(installedCache[focused._id]?.sizeMB) || focusedSize || "—"}
                    />
                  )}
                  {launchOpts[focused._id]?.args && (
                    <DetailRow
                      icon={FiTerminal}
                      label={t("games.launchArgs")}
                      value={launchOpts[focused._id].args}
                      mono
                    />
                  )}
                </div>

                {shots.length > 0 && (
                  <div className="flex items-center gap-3 mt-2 pb-6">
                    {shots.slice(0, 4).map((url, i) => (
                      <button
                        key={url}
                        onClick={() => setShotIndex(i)}
                        className="rounded-lg overflow-hidden transition-all outline-none shrink-0"
                        style={{
                          width: 148,
                          aspectRatio: "16 / 9",
                          boxShadow:
                            shotIndex === i
                              ? "0 0 0 2px var(--app-primary)"
                              : "0 2px 8px rgba(0,0,0,0.4)",
                          opacity: shotIndex === i ? 1 : 0.65,
                        }}
                      >
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {nowPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ scale: 0.95, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 12 }}
                className="w-full max-w-xl mx-8 rounded-2xl p-8 flex gap-6"
                style={{
                  background: "var(--app-backgroundSecondary)",
                  border: "1px solid var(--app-border)",
                }}
              >
                {nowPlaying.coverUrl && (
                  <div
                    className="shrink-0 w-28 rounded-xl overflow-hidden"
                    style={{ aspectRatio: "3 / 4" }}
                  >
                    <GameCover
                      src={nowPlaying.coverUrl}
                      alt={nowPlaying.name}
                      className="w-full h-full object-cover"
                      size="cover_big"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-success mb-1">
                    <FiZap size={14} /> {t("bigPicture.nowPlaying")}
                  </p>
                  <h2
                    className="text-2xl font-bold truncate mb-1"
                    style={{ color: "var(--app-text)" }}
                  >
                    {nowPlaying.name}
                  </h2>
                  <p
                    className="flex items-center gap-1.5 text-sm tabular-nums mb-5"
                    style={{ color: "var(--app-textSecondary)" }}
                  >
                    <FiClock size={13} />
                    {(() => {
                      const s = Math.max(
                        0,
                        Math.floor((now.getTime() - nowPlaying.startTime) / 1000)
                      );
                      const h = Math.floor(s / 3600);
                      const m = Math.floor((s % 3600) / 60);
                      return h > 0 ? `${h}h ${m}m` : `${m}m ${String(s % 60).padStart(2, "0")}s`;
                    })()}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: t("bigPicture.resume"), danger: false },
                      { label: t("bigPicture.stopGame"), danger: true },
                    ].map((opt, i) => (
                      <button
                        key={i}
                        onMouseEnter={() => setNowPlayingIndex(i)}
                        onClick={() =>
                          i === 1 ? stopNowPlaying() : (setNowPlaying(null), onClose())
                        }
                        className="rounded-xl px-4 py-3 text-sm font-bold transition-all outline-none"
                        style={{
                          background:
                            nowPlayingIndex === i
                              ? opt.danger
                                ? "var(--app-error)"
                                : "var(--app-primary)"
                              : "rgba(255,255,255,0.04)",
                          color: nowPlayingIndex === i ? "#fff" : "var(--app-text)",
                          border: "1px solid var(--app-border)",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div
                    className="flex items-center justify-center gap-6 mt-4 text-xs"
                    style={{ color: "var(--app-textSecondary)" }}
                  >
                    <Hint glyph={G.confirm} color={G.confirmColor}>
                      {t("common.confirm")}
                    </Hint>
                    <Hint glyph={G.back} color={G.backColor}>
                      {t("common.cancel")}
                    </Hint>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
              onClick={() => setSearchOpen(false)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ scale: 0.96, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 12 }}
                className="w-full max-w-2xl mx-8 rounded-2xl p-8"
                style={{
                  background: "var(--app-backgroundSecondary)",
                  border: "1px solid var(--app-border)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="flex items-center gap-3 px-5 py-4 rounded-xl mb-6 text-xl font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--app-border)",
                    color: "var(--app-text)",
                  }}
                >
                  <FiSearch size={20} style={{ color: "var(--app-primary)" }} />
                  <span className="flex-1 min-h-[1.5rem] tabular-nums">
                    {query}
                    <span className="animate-pulse" style={{ color: "var(--app-primary)" }}>
                      |
                    </span>
                  </span>
                  {games.length > 0 && query && (
                    <span
                      className="text-sm font-normal"
                      style={{ color: "var(--app-textSecondary)" }}
                    >
                      {games.length}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {OSK_ROWS.map((row, r) => (
                    <div key={r} className="flex justify-center gap-2">
                      {row.map((key, c) => {
                        const isFocusedKey = osk.row === r && osk.col === c;
                        const label =
                          key === OSK_SPACE
                            ? t("bigPicture.space")
                            : key === OSK_ERASE
                              ? t("bigPicture.erase")
                              : key === OSK_DONE
                                ? t("bigPicture.done")
                                : key;
                        const wide = typeof key === "object";
                        return (
                          <button
                            key={c}
                            onMouseEnter={() => setOsk({ row: r, col: c })}
                            onClick={() => oskPress(key)}
                            className={`${wide ? "px-8" : "w-12"} h-12 rounded-lg text-base font-bold transition-all outline-none`}
                            style={{
                              background: isFocusedKey
                                ? key === OSK_DONE
                                  ? "var(--app-success)"
                                  : "var(--app-primary)"
                                : "rgba(255,255,255,0.06)",
                              color: isFocusedKey ? "#fff" : "var(--app-text)",
                              border: "1px solid var(--app-border)",
                              transform: isFocusedKey ? "scale(1.08)" : "scale(1)",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div
                  className="flex items-center justify-center gap-6 mt-6 text-xs"
                  style={{ color: "var(--app-textSecondary)" }}
                >
                  <Hint glyph={G.confirm} color={G.confirmColor}>
                    {t("common.confirm")}
                  </Hint>
                  <Hint glyph={G.action} color={G.actionColor}>
                    {t("bigPicture.erase")}
                  </Hint>
                  <Hint glyph={G.secondary} color={G.secondaryColor}>
                    {t("bigPicture.space")}
                  </Hint>
                  <Hint glyph={G.back} color={G.backColor}>
                    {t("bigPicture.done")}
                  </Hint>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmOpen && focused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
            >
              <motion.div
                role="alertdialog"
                aria-modal="true"
                initial={{ scale: 0.95, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 12 }}
                className="w-full max-w-lg mx-8 rounded-2xl p-8"
                style={{
                  background: "var(--app-backgroundSecondary)",
                  border: "1px solid var(--app-border)",
                }}
              >
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--app-text)" }}>
                  {t("bigPicture.uninstallConfirmTitle", { name: focused.name })}
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--app-textSecondary)" }}>
                  {t("bigPicture.uninstallConfirmDesc")}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[t("common.cancel"), t("games.uninstall")].map((label, i) => (
                    <button
                      key={i}
                      onMouseEnter={() => setConfirmIndex(i)}
                      onClick={() => (i === 1 ? doUninstall() : setConfirmOpen(false))}
                      className="rounded-xl px-5 py-3.5 text-base font-bold transition-all outline-none"
                      style={{
                        background:
                          confirmIndex === i
                            ? i === 1
                              ? "var(--app-error)"
                              : "var(--app-primary)"
                            : "rgba(255,255,255,0.04)",
                        color: confirmIndex === i ? "#fff" : "var(--app-text)",
                        border: "1px solid var(--app-border)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                style={{
                  background: "var(--app-backgroundSecondary)",
                  border: "1px solid var(--app-border)",
                }}
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
                    {
                      key: "browse",
                      title: t("bigPicture.browseFolder"),
                      sub: t("bigPicture.browseFolderDesc"),
                    },
                  ].map((opt, i) => (
                    <button
                      key={opt.key}
                      onMouseEnter={() => setPromptIndex(i)}
                      onClick={() => resolvePathPrompt(opt.key)}
                      className="rounded-xl p-5 text-left transition-all outline-none"
                      style={{
                        background:
                          promptIndex === i ? "var(--app-primary)" : "rgba(255,255,255,0.04)",
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

                <div
                  className="flex items-center justify-center gap-8 mt-6 text-xs"
                  style={{ color: "var(--app-textSecondary)" }}
                >
                  <Hint glyph={G.confirm} color={G.confirmColor}>
                    {t("common.confirm")}
                  </Hint>
                  <Hint glyph={G.back} color={G.backColor}>
                    {t("common.cancel")}
                  </Hint>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer
          className="relative z-10 flex items-center justify-center gap-7 px-12 py-4 text-sm"
          style={{
            borderTop: "1px solid var(--app-border)",
            color: "var(--app-textSecondary)",
            background: "var(--app-backgroundSecondary)",
          }}
        >
          {view === "detail" ? (
            <>
              <Hint glyph={G.confirm} color={G.confirmColor}>
                {t("common.confirm")}
              </Hint>
              <Hint glyph={G.back} color={G.backColor}>
                {t("bigPicture.backToGrid")}
              </Hint>
              <Hint glyph="✚">{t("bigPicture.navigate")}</Hint>
            </>
          ) : (
            <>
              <Hint glyph={G.confirm} color={G.confirmColor}>
                {t("bigPicture.details")}
              </Hint>
              <Hint glyph={G.action} color={G.actionColor}>
                {focused ? hintAction : t("bigPicture.play")}
              </Hint>
              <Hint glyph={G.secondary} color={G.secondaryColor}>
                {t("common.search")}
              </Hint>
              <Hint glyph={G.back} color={G.backColor}>
                {query ? t("common.clearSearch") : t("bigPicture.exit")}
              </Hint>
              <Hint glyph={G.bumpers} wide>
                {t("bigPicture.switchSection")}
              </Hint>
              {SECTIONS[section] === "library" && (
                <Hint glyph="⧉" wide>
                  {t("bigPicture.sort")}
                </Hint>
              )}
            </>
          )}
        </footer>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

const StatRow = ({ icon: Icon, label, value }) => (
  <div
    className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--app-border)" }}
  >
    <span className="flex items-center gap-2" style={{ color: "var(--app-textSecondary)" }}>
      <Icon size={13} /> {label}
    </span>
    <span className="font-bold" style={{ color: "var(--app-text)" }}>
      {value}
    </span>
  </div>
);

const DetailRow = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-center gap-3 text-sm min-w-0">
    <Icon size={14} className="shrink-0" style={{ color: "var(--app-primary)" }} />
    <span className="shrink-0" style={{ color: "var(--app-textSecondary)" }}>
      {label}
    </span>
    <span
      className={`font-semibold truncate ${mono ? "font-mono text-xs" : ""}`}
      style={{ color: "var(--app-text)" }}
    >
      {value}
    </span>
  </div>
);

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
