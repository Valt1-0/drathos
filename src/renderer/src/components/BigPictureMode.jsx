import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { gamepadService } from "../services/gamepadService";
import gameManager from "../services/gameManager";
import uninstallQueue from "../utils/uninstallQueue";
import { bpSounds } from "../services/bpSounds";
import { launchGame as launchGameAPI } from "../api/installedGames";
import {
  useDownloadQueue,
  useActiveDownloads,
  useDownloadActions,
} from "../contexts/downloadContext";
import { useConnection } from "../contexts/connectionContext";
import {
  SECTIONS, SORTS, OSK_SPACE, OSK_ERASE, OSK_DONE, OSK_ROWS,
  formatPlaytime, formatSize, displayRatingOf, hasUpdate,
} from "./bigPicture/shared";
import {
  useBigPictureUserData,
  useBigPictureLibrary,
  useBigPictureNowPlaying,
  useBigPicturePad,
  useBigPictureDetailInfo,
  useBigPictureScreenshots,
  useBigPictureDetailRows,
} from "./bigPicture/hooks";
import { BPBackdrop, BPHeader, BPFooter, BPGrid } from "./bigPicture/BPGridView";
import BPDetailView from "./bigPicture/BPDetailView";
import {
  BPNowPlayingOverlay,
  BPSearchOverlay,
  BPUninstallDialog,
  BPPathPromptDialog,
} from "./bigPicture/BPOverlays";

const BigPictureMode = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { enqueueGame } = useDownloadQueue();
  const activeDownloads = useActiveDownloads();
  const { removeDownload } = useDownloadActions();
  const { isOnline } = useConnection();

  const [now, setNow] = useState(new Date());
  const [pathPrompt, setPathPrompt] = useState(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [view, setView] = useState("grid");
  const [detailPos, setDetailPos] = useState({ row: 0, col: 0 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIndex, setConfirmIndex] = useState(0);
  const [uninstalling, setUninstalling] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [osk, setOsk] = useState({ row: 1, col: 0 });
  const launchingRef = useRef(false);

  const {
    installedCache, setInstalledCache,
    serverGames,
    gameStatuses, setGameStatus,
    launchOpts, setGameDisplay,
    displays,
    defaultDir,
    soundsOn, toggleSounds,
  } = useBigPictureUserData(isOpen);

  const {
    section, setSection,
    focusIndex, setFocusIndex,
    cols,
    query, setQuery,
    sortMode, setSortMode,
    gridRef,
    games, focused,
    downloadByGame,
    changeSection, move,
  } = useBigPictureLibrary({ isOpen, view, installedCache, serverGames, activeDownloads });

  const {
    activeGames, setActiveGames,
    nowPlaying, setNowPlaying,
    nowPlayingIndex, setNowPlayingIndex,
    sessionNow,
    stopNowPlaying,
  } = useBigPictureNowPlaying(isOpen);

  const G = useBigPicturePad(isOpen);

  const focusedEntry = focused ? installedCache[focused._id] : null;
  const meta = useMemo(() => {
    if (!focused) return {};
    return {
      installed: !!focusedEntry,
      running: activeGames.has(focused._id),
      download: downloadByGame.get(focused._id) || null,
      updateAvailable: !!focusedEntry && hasUpdate(focused, focusedEntry),
      playtime: formatPlaytime(focusedEntry?.stats),
      rating: displayRatingOf(focused),
      size: formatSize(focused.sizeMB),
      year: focused.releaseDate ? new Date(focused.releaseDate).getFullYear() : null,
    };
  }, [focused, focusedEntry, activeGames, downloadByGame]);

  const { detailStats, modsInfo } = useBigPictureDetailInfo(isOpen, view, focused, installedCache, isOnline);
  const { shots, shotIndex, setShotIndex } = useBigPictureScreenshots(view, focused?._id, focused?.igdbId, isOnline);
  const { detailRows } = useBigPictureDetailRows({
    t,
    focused,
    focusedDl: meta.download,
    focusedRunning: meta.running,
    focusedInstalled: meta.installed,
    updateAvailable: meta.updateAvailable,
    displays,
  });

  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    launchingRef.current = false;
    setPathPrompt(null);
    setView("grid");
    setConfirmOpen(false);
    setSearchOpen(false);
    bpSounds.enter();
    return () => bpSounds.exit();
  }, [isOpen]);

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
          await launchGameAPI(game._id).catch(() => {}); // offline — local launch still works
          await gameManager.launchGame(game._id, cached.path, cached.executable || null, game.name);
        } finally {
          launchingRef.current = false;
        }
        return;
      }

      if (downloadByGame.has(game._id)) return;
      const full = serverGames.find((g) => g._id === game._id);
      if (!full) return;

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

  const doUninstall = useCallback(async () => {
    const game = focused;
    const cached = game ? installedCache[game._id] : null;
    if (!game || !cached?.path || uninstalling) return;
    setConfirmOpen(false);
    setUninstalling(true);
    try {
      if (!isOnline) {
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
  }, [focused, installedCache, isOnline, uninstalling, t, setInstalledCache]);

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
    [focused, activate, serverGames, enqueueGame, downloadByGame, removeDownload, t, setActiveGames]
  );

  const openDetail = useCallback(
    (index) => {
      setFocusIndex(index);
      setDetailPos({ row: 0, col: 0 });
      setView("detail");
    },
    [setFocusIndex]
  );

  const oskPress = useCallback(
    (key) => {
      if (key === OSK_SPACE) setQuery((q) => (q.length && !q.endsWith(" ") ? q + " " : q));
      else if (key === OSK_ERASE) setQuery((q) => q.slice(0, -1));
      else if (key === OSK_DONE) setSearchOpen(false);
      else setQuery((q) => (q + key).slice(0, 40));
    },
    [setQuery]
  );

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

  const sortLabels = useMemo(
    () => ({
      name: t("games.sortNameAsc"),
      rating: t("games.sortRating"),
      release: t("games.sortReleaseDate"),
    }),
    [t]
  );

  const promptOpen = pathPrompt !== null;
  // Single source of truth for input priority — replaces the same
  // nowPlaying > prompt > confirm > search > detail cascade that used to be
  // repeated across onNav/onConfirm/onBack
  const activeMode = nowPlaying
    ? "nowPlaying"
    : promptOpen
      ? "pathPrompt"
      : confirmOpen
        ? "uninstallConfirm"
        : searchOpen
          ? "search"
          : view === "detail"
            ? "detail"
            : "grid";
  const gridBlocked = activeMode !== "grid";

  const handlers = {
    gridBlocked,
    searchOpen,
    changeSection,
    setQuery,
    onNav: (direction) => {
      bpSounds.tick();
      switch (activeMode) {
        case "nowPlaying":
          if (direction === "left" || direction === "right") setNowPlayingIndex((i) => 1 - i);
          return;
        case "pathPrompt":
          if (direction === "left" || direction === "right") setPromptIndex((i) => 1 - i);
          return;
        case "uninstallConfirm":
          if (direction === "left" || direction === "right") setConfirmIndex((i) => 1 - i);
          return;
        case "search":
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
        case "detail":
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
        default:
          move(direction);
      }
    },
    onConfirm: () => {
      bpSounds.confirm();
      switch (activeMode) {
        case "nowPlaying":
          if (nowPlayingIndex === 1) stopNowPlaying();
          else {
            setNowPlaying(null);
            onClose(); // resume: get back to the game
          }
          return;
        case "pathPrompt":
          resolvePathPrompt(promptIndex === 0 ? "default" : "browse");
          return;
        case "uninstallConfirm":
          if (confirmIndex === 1) doUninstall();
          else setConfirmOpen(false);
          return;
        case "search":
          oskPress(OSK_ROWS[osk.row][osk.col]);
          return;
        case "detail": {
          const row = detailRows[Math.min(detailPos.row, detailRows.length - 1)];
          const item = row?.items[Math.min(detailPos.col, (row?.items.length || 1) - 1)];
          if (row && item) runDetailItem(row, item);
          return;
        }
        default:
          if (games[focusIndex]) openDetail(focusIndex);
      }
    },
    onBack: () => {
      bpSounds.back();
      switch (activeMode) {
        case "nowPlaying":
          setNowPlaying(null); // dismiss, stay in Big Picture
          return;
        case "pathPrompt":
          setPathPrompt(null);
          return;
        case "uninstallConfirm":
          setConfirmOpen(false);
          return;
        case "search":
          setSearchOpen(false);
          return;
        case "detail":
          setView("grid");
          return;
        default:
          if (query) {
            setQuery("");
            return;
          }
          onClose();
      }
    },
    // X: quick play/install from the grid, erase in search
    onAction: () => {
      if (activeMode === "nowPlaying" || activeMode === "pathPrompt" || activeMode === "uninstallConfirm")
        return;
      bpSounds.confirm();
      if (activeMode === "search") {
        oskPress(OSK_ERASE);
        return;
      }
      if (activeMode === "grid") activate(games[focusIndex]);
    },
    // Y: open search from the grid, space in search
    onSecondary: () => {
      if (activeMode !== "search" && activeMode !== "grid") return;
      bpSounds.confirm();
      if (activeMode === "search") {
        oskPress(OSK_SPACE);
        return;
      }
      setOsk({ row: 1, col: 0 });
      setSearchOpen(true);
    },
    onSelect: () => {
      if (gridBlocked) return;
      if (SECTIONS[section] === "library") {
        bpSounds.section();
        setSortMode((m) => (m + 1) % SORTS.length);
      }
    },
    onSection: (delta) => {
      if (gridBlocked) return;
      bpSounds.section();
      changeSection(delta);
    },
  };

  // Kept in a ref so the listeners below bind once per open instead of
  // re-subscribing on every focus/nav change
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!isOpen) return;
    gamepadService.claimExclusive("bigpicture");
    const h = () => handlersRef.current;

    const unsubs = [
      gamepadService.on("nav", ({ direction }) => h().onNav(direction)),
      gamepadService.on("confirm", () => h().onConfirm()),
      gamepadService.on("back", () => h().onBack()),
      gamepadService.on("action", () => h().onAction()),
      gamepadService.on("secondary", () => h().onSecondary()),
      gamepadService.on("select", () => h().onSelect()),
      gamepadService.on("menu", () => h().onBack()),
      gamepadService.on("prevSection", () => h().onSection(-1)),
      gamepadService.on("nextSection", () => h().onSection(1)),
    ];

    const onKeyDown = (e) => {
      const cur = h();
      // Physical keyboard types directly instead of going through the shortcut map below
      if (cur.searchOpen && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.length === 1 && /[\w\d\s\-':&.]/i.test(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          cur.setQuery((q) => (q + e.key).slice(0, 40));
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          e.stopPropagation();
          cur.setQuery((q) => q.slice(0, -1));
          return;
        }
      }
      const keys = {
        ArrowUp: () => cur.onNav("up"),
        ArrowDown: () => cur.onNav("down"),
        ArrowLeft: () => cur.onNav("left"),
        ArrowRight: () => cur.onNav("right"),
        Enter: cur.onConfirm,
        Escape: cur.onBack,
        x: cur.onAction,
        X: cur.onAction,
        f: cur.onSecondary,
        F: cur.onSecondary,
        s: cur.onSelect,
        S: cur.onSelect,
        Tab: () => cur.onSection(e.shiftKey ? -1 : 1),
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
  }, [isOpen]);

  const isDetail = view === "detail";
  const dlCount = activeDownloads.length;
  const dlAvg =
    dlCount > 0
      ? Math.round(activeDownloads.reduce((s, d) => s + (d.progress || 0), 0) / dlCount)
      : 0;
  const hintAction = meta.running
    ? t("bigPicture.running")
    : meta.installed
      ? t("bigPicture.play")
      : t("bigPicture.install");

  // AnimatePresence has to outlive isOpen for the exit transition to run at all,
  // so the guard sits on the child instead of being an early return
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="bigpicture"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-9999 flex flex-col overflow-hidden select-none"
          style={{ background: "var(--app-background)" }}
        >
          <BPBackdrop
            isDetail={isDetail}
            shots={shots}
            shotIndex={shotIndex}
            coverUrl={focused?.coverUrl}
            coverKey={focused?._id}
          />

          <BPHeader
            section={section}
            isGrid={!isDetail}
            onSelectSection={(i) => {
              setView("grid");
              setSection(i);
              setFocusIndex(0);
            }}
            downloadCount={dlCount}
            downloadAvg={dlAvg}
            query={query}
            clock={now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            soundsOn={soundsOn}
            onToggleSounds={toggleSounds}
            onClose={onClose}
          />

          {!isDetail && (
            <BPGrid
              games={games}
              focused={focused}
              focusedMeta={meta}
              focusIndex={focusIndex}
              setFocusIndex={setFocusIndex}
              openDetail={openDetail}
              gridRef={gridRef}
              cols={cols}
              section={section}
              query={query}
              hasServerGames={serverGames.length > 0}
              installedCache={installedCache}
              gameStatuses={gameStatuses}
              activeGames={activeGames}
              downloadByGame={downloadByGame}
              sortMode={sortMode}
              onCycleSort={() => setSortMode((m) => (m + 1) % SORTS.length)}
              sortLabels={sortLabels}
            />
          )}

          {isDetail && focused && (
            <BPDetailView
              game={focused}
              meta={meta}
              installedEntry={focusedEntry}
              stats={detailStats}
              modsInfo={modsInfo}
              detailRows={detailRows}
              detailPos={detailPos}
              setDetailPos={setDetailPos}
              runDetailItem={runDetailItem}
              currentStatus={gameStatuses[focused._id] ?? null}
              currentDisplay={launchOpts[focused._id]?.display || 0}
              launchArgs={launchOpts[focused._id]?.args}
              uninstalling={uninstalling}
              shots={shots}
              shotIndex={shotIndex}
              setShotIndex={setShotIndex}
              language={i18n.language}
            />
          )}

          <AnimatePresence>
            {nowPlaying && (
              <BPNowPlayingOverlay
                nowPlaying={nowPlaying}
                sessionNow={sessionNow}
                selectedIndex={nowPlayingIndex}
                onSelect={setNowPlayingIndex}
                onResume={() => {
                  setNowPlaying(null);
                  onClose();
                }}
                onStop={stopNowPlaying}
                glyphs={G}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {searchOpen && (
              <BPSearchOverlay
                query={query}
                resultCount={games.length}
                osk={osk}
                onOskFocus={(row, col) => setOsk({ row, col })}
                onOskPress={oskPress}
                onClose={() => setSearchOpen(false)}
                glyphs={G}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {confirmOpen && focused && (
              <BPUninstallDialog
                gameName={focused.name}
                selectedIndex={confirmIndex}
                onSelect={setConfirmIndex}
                onCancel={() => setConfirmOpen(false)}
                onConfirm={doUninstall}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {pathPrompt && (
              <BPPathPromptDialog
                gameName={pathPrompt.game.name}
                defaultDir={defaultDir}
                selectedIndex={promptIndex}
                onSelect={setPromptIndex}
                onResolve={resolvePathPrompt}
                glyphs={G}
              />
            )}
          </AnimatePresence>

          <BPFooter
            glyphs={G}
            isDetail={isDetail}
            hasFocus={!!focused}
            hintAction={hintAction}
            query={query}
            section={section}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default BigPictureMode;
