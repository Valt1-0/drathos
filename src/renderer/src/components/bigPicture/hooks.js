import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { FiPlay, FiDownload, FiPause, FiSquare, FiTrash2, FiRefreshCw, FiX } from "react-icons/fi";
import { gamepadService } from "../../services/gamepadService";
import { bpSounds } from "../../services/bpSounds";
import gameManager from "../../services/gameManager";
import { gamesCache } from "../../utils/gamesCache";
import { getMergedStats, formatStats } from "../../api/gameStats";
import { getGameScreenshots } from "../../api/igdb";
import { getModsForGame, getInstalledMods, filterInstalledModsForGame } from "../../api/mods";
import { CARD_WIDTH, SECTIONS, SORTS, PAD_GLYPHS, STATUS_VALUES, STATUS_COLORS } from "./shared";

export function useBigPictureUserData(isOpen) {
  const [installedCache, setInstalledCache] = useState({});
  const [serverGames, setServerGames] = useState([]);
  const [gameStatuses, setGameStatuses] = useState({});
  const [launchOpts, setLaunchOpts] = useState({});
  const [displays, setDisplays] = useState([]);
  const [defaultDir, setDefaultDir] = useState("");
  const [soundsOn, setSoundsOn] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    window.store.get("installedGamesCache").then((c) => setInstalledCache(c || {}));
    window.store.get("gameStatuses").then((s) => setGameStatuses(s || {}));
    window.store.get("gameLaunchOptions").then((o) => setLaunchOpts(o || {}));
    window.api.app
      .getDisplays()
      .then((d) => setDisplays(d || []))
      .catch(() => {});
    // Same data path as QuickLaunch: server cache first, installed cache offline
    setServerGames(gamesCache.get()?.games || []);
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

  useEffect(() => {
    if (!isOpen) return;
    // Dispatched by downloadContext.jsx when an install finishes
    const refresh = () =>
      window.store.get("installedGamesCache").then((c) => setInstalledCache(c || {}));
    window.addEventListener("games:installed", refresh);
    return () => window.removeEventListener("games:installed", refresh);
  }, [isOpen]);

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

  const toggleSounds = useCallback(() => {
    setSoundsOn((prev) => {
      const next = !prev;
      bpSounds.setEnabled(next);
      window.store.set("bpSoundsEnabled", next);
      return next;
    });
  }, []);

  return {
    installedCache, setInstalledCache,
    serverGames,
    gameStatuses, setGameStatus,
    launchOpts, setGameDisplay,
    displays,
    defaultDir,
    soundsOn, toggleSounds,
  };
}

export function useBigPictureLibrary({ isOpen, view, installedCache, serverGames, activeDownloads }) {
  const [section, setSection] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [cols, setCols] = useState(6);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState(0);
  const gridRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setSection(0);
    setFocusIndex(0);
    setQuery("");
    setSortMode(0);
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

  useEffect(() => {
    setFocusIndex(0);
  }, [query, sortMode]);

  useEffect(() => {
    setFocusIndex((i) => Math.min(i, Math.max(0, games.length - 1)));
  }, [games.length]);

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
        if (direction === "down") {
          if (i + cols <= max) return i + cols;
          // Falling off a partial last row lands on the last card, not nowhere
          const lastRowStart = max - (max % cols);
          return i < lastRowStart ? max : i;
        }
        return i;
      });
    },
    [games.length, cols]
  );

  return {
    section, setSection,
    focusIndex, setFocusIndex,
    cols,
    query, setQuery,
    sortMode, setSortMode,
    gridRef,
    games, focused,
    downloadByGame,
    changeSection, move,
  };
}

export function useBigPictureNowPlaying(isOpen) {
  const { t } = useTranslation();
  const [activeGames, setActiveGames] = useState(new Set());
  const [nowPlaying, setNowPlaying] = useState(null);
  const [nowPlayingIndex, setNowPlayingIndex] = useState(0);
  const [sessionNow, setSessionNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    gameManager.getActiveGames().then(async (running) => {
      if (cancelled) return;
      setActiveGames(new Set(running.map((g) => g.gameId)));
      if (running.length > 0) {
        const g = running[0];
        const cache = (await window.store.get("installedGamesCache")) || {};
        const cachedGames = gamesCache.get()?.games || [];
        if (cancelled) return;
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
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!nowPlaying) return;
    const id = setInterval(() => setSessionNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [nowPlaying]);

  const stopNowPlaying = useCallback(async () => {
    const np = nowPlaying;
    if (!np) return;
    setNowPlaying(null);
    const res = await gameManager.stopGame(np.gameId).catch(() => null);
    if (res?.success) {
      setActiveGames((prev) => {
        const next = new Set(prev);
        next.delete(np.gameId);
        return next;
      });
      toast.success(t("bigPicture.stopped", { name: np.name }));
    } else {
      setNowPlaying(np);
      toast.error(t("games.stopFailedDesc", { name: np.name }));
    }
  }, [nowPlaying, t]);

  return {
    activeGames, setActiveGames,
    nowPlaying, setNowPlaying,
    nowPlayingIndex, setNowPlayingIndex,
    sessionNow,
    stopNowPlaying,
  };
}

export function useBigPicturePad(isOpen) {
  const [padType, setPadType] = useState(gamepadService.getPadType());

  useEffect(() => {
    if (!isOpen) return;
    setPadType(gamepadService.getPadType());
    const unsubs = [
      gamepadService.on("connected", ({ type }) => type && setPadType(type)),
      gamepadService.on("typechange", ({ type }) => setPadType(type)),
    ];
    return () => unsubs.forEach((u) => u());
  }, [isOpen]);

  return PAD_GLYPHS[padType] || PAD_GLYPHS.xbox;
}

export function useBigPictureDetailInfo(isOpen, view, focused, installedCache, isOnline) {
  const [detailStats, setDetailStats] = useState(null);
  const [modsInfo, setModsInfo] = useState(null);
  const statsCacheRef = useRef(new Map());
  const modsCacheRef = useRef(new Map());

  useEffect(() => {
    if (!isOpen) return;
    statsCacheRef.current.clear();
    modsCacheRef.current.clear();
  }, [isOpen]);

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
          const installedCount = filterInstalledModsForGame(installed.installedMods || [], id).length;
          const info = { available: available.totalMods || 0, installed: installedCount };
          modsCacheRef.current.set(id, info);
          setModsInfo(info);
        })
        .catch(() => setModsInfo(null));
    } else {
      setModsInfo(null);
    }
  }, [view, focused, installedCache, isOnline]);

  return { detailStats, modsInfo };
}

export function useBigPictureScreenshots(view, focusedId, igdbId, isOnline) {
  const [shots, setShots] = useState([]);
  const [shotIndex, setShotIndex] = useState(0);

  useEffect(() => {
    setShots([]);
    setShotIndex(0);
    if (view !== "detail" || !igdbId || !isOnline) return;
    let cancelled = false;
    getGameScreenshots(igdbId).then((urls) => {
      if (!cancelled && urls.length > 0) setShots(urls);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, focusedId, isOnline]);

  useEffect(() => {
    if (view !== "detail" || shots.length < 2) return;
    const id = setInterval(() => setShotIndex((i) => (i + 1) % shots.length), 7000);
    return () => clearInterval(id);
  }, [view, shots.length]);

  return { shots, shotIndex, setShotIndex };
}

export function useBigPictureDetailRows({
  t,
  focused,
  focusedDl,
  focusedRunning,
  focusedInstalled,
  updateAvailable,
  displays,
}) {
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

  const detailRows = useMemo(() => {
    const rows = [];
    if (detailActions.length > 0) rows.push({ type: "actions", items: detailActions });
    if (focused)
      rows.push({ type: "status", label: t("games.userStatusLabel"), items: statusItems });
    if (focusedInstalled && displayItems.length > 0)
      rows.push({ type: "display", label: t("games.launchDisplay"), items: displayItems });
    return rows;
  }, [detailActions, statusItems, displayItems, focused, focusedInstalled, t]);

  return { detailRows };
}
