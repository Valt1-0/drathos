import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/themeContext";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  FiStar,
  FiCalendar,
  FiUsers,
  FiPackage,
  FiExternalLink,
  FiInfo,
  FiMonitor,
} from "react-icons/fi";
import GameCover from "../GameCover";
import ModManager from "../mods/ModManager";
import GameStatusSelector from "./GameStatusSelector";
import VersionSelector from "./VersionSelector";
import LaunchOptions from "./LaunchOptions";
import { ActionButtons } from "./GameActionButtons";
import GameStatistics from "./GameStatistics";
import GameInformation from "./GameInformation";

const CollapsibleMods = ({ gameId }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl bg-surface border border-border overflow-hidden"
    >
      <ModManager
        gameId={gameId}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      />
    </motion.div>
  );
};

const GameDetails = ({
  game,
  allGames = [],
  onSelectVersion,
  gameStats,
  gameSize,
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
  onCreateShortcut,
  onDeleteFromServer,
  getGenresArray,
  getPlatformsArray,
  gameStatus,
  onSetStatus,
}) => {
  const { t } = useTranslation();
  const { isLight, getTextClass } = useTheme();
  const [descExpanded, setDescExpanded] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [game?._id]);

  const gameVersions = useMemo(() => {
    if (!game?.igdbId) return [];
    return allGames
      .filter((g) => g.igdbId === game.igdbId)
      .sort((a, b) =>
        (b.version || "").localeCompare(a.version || "", undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [game?.igdbId, allGames]);

  const hasMultipleVersions = gameVersions.length > 1;

  const ratingEl =
    game?.rating > 0
      ? (() => {
          const normalizedRating =
            game.rating > 10 ? game.rating / 10 : game.rating;
          const displayRating = normalizedRating.toFixed(1);
          return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-sm border bg-linear-to-r from-warning/20 to-warning/10 border-warning/30">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, index) => {
                  const fillPercentage = Math.min(
                    Math.max(normalizedRating / 2 - index, 0),
                    1,
                  );
                  return (
                    <div key={index} className="relative w-3 h-3">
                      <FiStar className="absolute inset-0 w-3 h-3 text-warning/30" />
                      {fillPercentage > 0 && (
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{ width: `${fillPercentage * 100}%` }}
                        >
                          <FiStar className="w-3 h-3 text-warning fill-warning" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <span className="text-warning font-bold text-xs">{displayRating}</span>
              <span className={`text-[10px] font-medium ${getTextClass("secondary")}`}>/ 10</span>
            </div>
          );
        })()
      : null;

  if (!game) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--app-primary) 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
            opacity: 0.18,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, var(--app-background) 100%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="relative flex flex-col items-center text-center gap-5"
        >
          <div className="relative flex items-center justify-center">
            <div
              className="absolute w-24 h-24 rounded-full blur-2xl opacity-15"
              style={{ background: "var(--app-primary)" }}
            />
            <div
              className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "var(--app-backgroundSecondary)",
                border: "1px solid var(--app-border)",
                boxShadow:
                  "0 0 0 6px color-mix(in srgb, var(--app-primary) 8%, transparent)",
              }}
            >
              <FiMonitor
                className="text-2xl"
                style={{ color: "var(--app-primary)" }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-base font-semibold text-text">
              {t("games.selectGame")}
            </h2>
            <p className="text-sm text-text-secondary max-w-52 leading-relaxed">
              {t("games.selectGameDesc")}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="relative h-60 overflow-hidden border-b border-border">
        {game.coverUrl ? (
          <>
            <div className="absolute inset-0">
              <GameCover
                src={game.coverUrl}
                alt={game.name}
                className="w-full h-full object-cover"
                size="cover_big"
                blur={true}
              />
              <div className="absolute inset-0 bg-linear-to-b from-background/40 via-background/70 to-background" />
              <div className="absolute inset-0 bg-linear-to-r from-background/60 via-transparent to-background/60" />
              <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-background/80" />
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary to-transparent"
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-background to-secondary/10" />
        )}

        <div className="relative h-full flex items-end">
          <div className="w-full px-6 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-end justify-between gap-6"
            >
              <div className="flex items-end gap-4 flex-1 min-w-0">
              {game.coverUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="hidden sm:block relative shrink-0"
                >
                  <div className="absolute -inset-1.5 bg-linear-to-br from-primary/30 via-secondary/20 to-accent/30 rounded-xl blur-lg opacity-75" />
                  <div className="relative w-20 h-28 rounded-lg overflow-hidden shadow-2xl border-2 border-border/50 backdrop-blur-sm">
                    <GameCover
                      src={game.coverUrl}
                      alt={game.name}
                      className="w-full h-full object-cover"
                      size="cover_small"
                    />
                  </div>
                </motion.div>
              )}

              <div className="min-w-0 space-y-2.5">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`text-3xl sm:text-4xl font-black truncate ${getTextClass("primary")} drop-shadow-lg`}
                  title={game.name}
                  style={{
                    textShadow: isLight
                      ? "0 2px 10px rgba(0,0,0,0.1)"
                      : "0 2px 20px rgba(0,0,0,0.5), 0 0 40px rgba(59, 130, 246, 0.3)",
                  }}
                >
                  {game.name}
                </motion.h1>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-wrap items-center gap-2"
                >
                  {getGenresArray(game).length > 0 && (
                    <span className="px-2.5 py-1 rounded-md bg-primary/20 backdrop-blur-sm text-primary font-semibold text-xs border border-primary/30 shadow-lg">
                      {getGenresArray(game)[0]}
                    </span>
                  )}

                  {game.releaseDate && (
                    <span
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md backdrop-blur-sm border text-xs font-medium bg-surface/80 border-border/50 ${getTextClass("secondary")}`}
                    >
                      <FiCalendar className="w-3.5 h-3.5" />
                      {dayjs(game.releaseDate).format("YYYY")}
                    </span>
                  )}

                  {game.multiplayer?.enabled && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-md backdrop-blur-sm border text-xs font-medium bg-secondary/20 border-secondary/30 text-secondary">
                      <FiUsers className="w-3.5 h-3.5" />
                      <span>
                        {game.multiplayer.maxPlayers && `${game.multiplayer.maxPlayers}P`}
                        {game.multiplayer.maxPlayers && game.multiplayer.type && " • "}
                        {game.multiplayer.type && t(`games.multiplayerType.${game.multiplayer.type}`)}
                        {!game.multiplayer.maxPlayers && !game.multiplayer.type && t("games.multiplayer")}
                        {game.multiplayer.modes?.length > 0 &&
                          ` (${game.multiplayer.modes.map((m) => t(`games.multiplayerModes.${m}`)).join(", ")})`}
                      </span>
                    </span>
                  )}

                  {game.version && !hasMultipleVersions && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-md backdrop-blur-sm border text-xs font-medium bg-accent/20 border-accent/30 text-accent">
                      <FiPackage className="w-3 h-3" />v{game.version}
                    </span>
                  )}
                  {hasMultipleVersions && (
                    <VersionSelector
                      currentVersion={game}
                      versions={gameVersions}
                      onSelectVersion={onSelectVersion}
                    />
                  )}

                  {onSetStatus && (
                    <GameStatusSelector
                      gameId={game._id}
                      gameStatus={gameStatus}
                      onSetStatus={onSetStatus}
                    />
                  )}

                  {ratingEl}

                  {isInstalled && onCreateShortcut && (
                    <div className="relative group/sc">
                      <button
                        onClick={() => onCreateShortcut(game)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md backdrop-blur-sm border text-xs font-medium bg-surface/80 border-border/50 text-text-secondary hover:border-primary/50 hover:text-primary transition-colors"
                      >
                        <FiExternalLink className="w-3.5 h-3.5" />
                        {t("games.shortcut")}
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-lg px-3 py-2 text-[11px] text-center text-text-secondary bg-background border border-border shadow-lg opacity-0 group-hover/sc:opacity-100 transition-opacity z-50">
                        {t("games.shortcutTooltip")}
                      </div>
                    </div>
                  )}


                </motion.div>
              </div>
              </div>

              <div className="shrink-0 hidden sm:block">
                <ActionButtons
                  game={game}
                  isInstalled={isInstalled}
                  isPlaying={isPlaying}
                  isUninstalling={isUninstalling}
                  isPending={isPending}
                  isQueued={isQueued}
                  activeDownload={activeDownload}
                  user={user}
                  onLaunch={onLaunch}
                  onStop={onStop}
                  onForceStop={onForceStop}
                  onInstall={onInstall}
                  onUninstall={onUninstall}
                  onOpenFolder={onOpenFolder}
                  onDeleteFromServer={onDeleteFromServer}
                />
              </div>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-primary/20 to-transparent overflow-hidden">
          {activeDownload ? (
            <motion.div
              className="h-full bg-linear-to-r from-primary/60 via-primary to-primary/60"
              initial={{ width: 0 }}
              animate={{ width: `${activeDownload.progress || 0}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          ) : (
            <div className="h-full w-full bg-linear-to-r from-transparent via-primary/50 to-transparent" />
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 lg:p-5">
          <div className="sm:hidden mb-4">
            <ActionButtons
              game={game}
              isInstalled={isInstalled}
              isPlaying={isPlaying}
              isUninstalling={isUninstalling}
              isPending={isPending}
              isQueued={isQueued}
              activeDownload={activeDownload}
              user={user}
              onLaunch={onLaunch}
              onStop={onStop}
              onForceStop={onForceStop}
              onInstall={onInstall}
              onUninstall={onUninstall}
              onOpenFolder={onOpenFolder}
              onDeleteFromServer={onDeleteFromServer}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4 bg-surface border border-border"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20">
                    <FiInfo className="text-base text-primary" />
                  </div>
                  <h2 className={`text-lg font-bold ${getTextClass("primary")}`}>
                    {t("games.about")}
                  </h2>
                </div>
                <p
                  className={`text-sm leading-relaxed transition-all duration-200 ${descExpanded ? "" : "line-clamp-4"} ${getTextClass("secondary")}`}
                >
                  {game.summary || game.storyline || t("games.noDescription")}
                </p>
                {(game.summary || game.storyline) && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-2 text-xs text-primary hover:text-primary/70 transition-colors font-medium"
                  >
                    {descExpanded ? t("games.seeLess") : t("games.seeMore")}
                  </button>
                )}
              </motion.div>

              {isInstalled && gameStats && gameStats.totalSessions > 0 && (
                <GameStatistics stats={gameStats} isPlaying={isPlaying} />
              )}

              {isInstalled && <CollapsibleMods gameId={game._id} />}

              {isInstalled && <LaunchOptions gameId={game._id} />}
            </div>

            <div className="xl:col-span-1">
              <div className="sticky top-4">
                <GameInformation
                  game={game}
                  gameSize={gameSize}
                  isInstalled={isInstalled}
                  getGenresArray={getGenresArray}
                  getPlatformsArray={getPlatformsArray}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border/50 px-5 py-1.5 flex items-center gap-5 bg-background">
        <span className="flex items-center gap-1.5 text-[11px] text-text-secondary/50">
          <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono leading-none">Ctrl+R</kbd>
          {t('common.refresh')}
        </span>
      </div>

    </div>
  );
};

export default GameDetails;
