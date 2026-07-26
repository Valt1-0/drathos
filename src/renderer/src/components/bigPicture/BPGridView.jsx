import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  FiDownload, FiSearch, FiX, FiVolume2, FiVolumeX, FiClock, FiZap, FiStar, FiRefreshCw,
} from "react-icons/fi";
import GameCover from "../GameCover";
import { SECTIONS, SORTS, STATUS_COLORS, genreName, hasUpdate, Hint } from "./shared";

export const BPBackdrop = ({ isDetail, shots, shotIndex, coverUrl, coverKey }) => (
  <>
    <AnimatePresence mode="wait">
      {isDetail && shots.length > 0 ? (
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
      ) : coverUrl ? (
        <motion.img
          key={coverKey}
          src={coverUrl}
          alt=""
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: isDetail ? 0.3 : 0.22 }}
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
  </>
);

export const BPHeader = ({
  section, isGrid, onSelectSection, downloadCount, downloadAvg,
  query, clock, soundsOn, onToggleSounds, onClose,
}) => {
  const { t } = useTranslation();

  return (
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
            onClick={() => onSelectSection(i)}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={
              i === section && isGrid
                ? { background: "var(--app-primary)", color: "#fff" }
                : { color: "var(--app-textSecondary)" }
            }
          >
            {t(`bigPicture.${key}`)}
          </button>
        ))}
      </nav>
      <div className="flex items-center gap-4">
        {downloadCount > 0 && (
          <span
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tabular-nums"
            style={{ background: "var(--app-primary)", color: "#fff" }}
          >
            <FiDownload size={12} /> {downloadCount} · {downloadAvg}%
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
        <span className="text-lg font-semibold tabular-nums" style={{ color: "var(--app-text)" }}>
          {clock}
        </span>
        <button
          onClick={onToggleSounds}
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
  );
};

export const BPFooter = ({ glyphs: G, isDetail, hasFocus, hintAction, query, section }) => {
  const { t } = useTranslation();

  return (
    <footer
      className="relative z-10 flex items-center justify-center gap-7 px-12 py-4 text-sm"
      style={{
        borderTop: "1px solid var(--app-border)",
        color: "var(--app-textSecondary)",
        background: "var(--app-backgroundSecondary)",
      }}
    >
      {isDetail ? (
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
            {hasFocus ? hintAction : t("bigPicture.play")}
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
  );
};

// Props are per-card primitives rather than the shared state maps: during a
// download activeDownloads ticks 4x/s, and a map-shaped prop would re-render
// every card in the section on each tick
const GameCard = memo(({
  game, index, isFocused, isLibrarySection,
  dl, installed, running, status, updatable, onFocus, onOpen,
}) => {
  const { t } = useTranslation();

  return (
    <button
      data-bp-index={index}
      onMouseEnter={() => onFocus(index)}
      onClick={() => onOpen(index, isFocused)}
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
      {running && (
        <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-success text-white">
          <FiZap size={10} /> {t("bigPicture.running")}
        </span>
      )}
      {!running && status && (
        <span
          className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full"
          style={{
            background: STATUS_COLORS[status],
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
                background: dl.stage === "paused" ? "var(--app-warning)" : "var(--app-primary)",
              }}
            />
          </span>
        </span>
      )}
      {!installed && !dl && isLibrarySection && (
        <span className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white">
          <FiDownload size={12} />
        </span>
      )}
      {updatable && (
        <span
          className="absolute top-2 right-2 p-1.5 rounded-full text-black"
          style={{ background: "var(--app-warning)" }}
        >
          <FiRefreshCw size={12} />
        </span>
      )}
    </button>
  );
});
GameCard.displayName = "GameCard";

const FocusedInfoBar = ({ focused, meta }) => {
  const { t } = useTranslation();
  if (!focused) return <span />;

  return (
    <div className="flex items-baseline gap-4 min-w-0">
      <h1 className="text-3xl font-bold truncate max-w-[55vw]" style={{ color: "var(--app-text)" }}>
        {focused.name}
      </h1>
      {meta.running && (
        <span className="flex items-center gap-1.5 text-sm font-semibold text-success shrink-0">
          <FiZap size={14} /> {t("bigPicture.running")}
        </span>
      )}
      {meta.updateAvailable && (
        <span
          className="flex items-center gap-1.5 text-sm font-semibold shrink-0"
          style={{ color: "var(--app-warning)" }}
        >
          <FiRefreshCw size={13} /> {t("bigPicture.updateAvailable")}
        </span>
      )}
      {meta.playtime && (
        <span
          className="flex items-center gap-1.5 text-sm shrink-0"
          style={{ color: "var(--app-textSecondary)" }}
        >
          <FiClock size={13} /> {meta.playtime}
        </span>
      )}
      {focused.genres?.[0] && (
        <span className="text-sm shrink-0" style={{ color: "var(--app-textSecondary)" }}>
          {genreName(focused.genres[0])}
        </span>
      )}
      {meta.rating && (
        <span
          className="flex items-center gap-1 text-sm shrink-0"
          style={{ color: "var(--app-textSecondary)" }}
        >
          <FiStar size={13} style={{ color: "var(--app-warning)" }} /> {meta.rating}
        </span>
      )}
      {meta.size && (
        <span className="text-sm shrink-0" style={{ color: "var(--app-textSecondary)" }}>
          {meta.size}
        </span>
      )}
      {meta.download && (
        <span
          className="text-sm font-semibold tabular-nums shrink-0"
          style={{ color: "var(--app-primary)" }}
        >
          {meta.download.stage === "paused"
            ? t("bigPicture.paused")
            : `${t("bigPicture.installing")} ${Math.round(meta.download.progress || 0)}%`}
        </span>
      )}
    </div>
  );
};

export const BPGrid = ({
  games, focused, focusedMeta, focusIndex, setFocusIndex, openDetail,
  gridRef, cols, section, query, hasServerGames,
  installedCache, gameStatuses, activeGames, downloadByGame,
  sortMode, onCycleSort, sortLabels,
}) => {
  const { t } = useTranslation();
  const isLibrary = SECTIONS[section] === "library";

  // Stable across focus moves: the card passes its own index back, so these
  // don't need to close over focusIndex (which would defeat GameCard's memo)
  const handleOpen = useCallback(
    (i, wasFocused) => (wasFocused ? openDetail(i) : setFocusIndex(i)),
    [openDetail, setFocusIndex]
  );

  const emptyKey = query
    ? null
    : section === 0
      ? "bigPicture.emptyInstalled"
      : hasServerGames
        ? "bigPicture.allInstalled"
        : "bigPicture.emptyLibrary";

  return (
    <>
      <div className="relative z-10 px-12 h-16">
        <div className="flex items-baseline justify-between">
          <FocusedInfoBar focused={focused} meta={focusedMeta} />
          {isLibrary && games.length > 1 && (
            <button
              onClick={onCycleSort}
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
          <p className="pt-20 text-center text-lg" style={{ color: "var(--app-textSecondary)" }}>
            {query ? t("bigPicture.noResults", { query }) : t(emptyKey)}
          </p>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {games.map((game, i) => {
              const installedEntry = installedCache[game._id];
              return (
                <GameCard
                  key={game._id}
                  game={game}
                  index={i}
                  isFocused={i === focusIndex}
                  isLibrarySection={isLibrary}
                  dl={downloadByGame.get(game._id)}
                  installed={!!installedEntry}
                  running={activeGames.has(game._id)}
                  status={gameStatuses[game._id]}
                  updatable={!!installedEntry && hasUpdate(game, installedEntry)}
                  onFocus={setFocusIndex}
                  onOpen={handleOpen}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
