import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/themeContext";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FiBarChart2,
  FiClock,
  FiTarget,
  FiTrendingUp,
  FiPlay,
  FiActivity,
  FiFolder,
  FiTrash2,
  FiSquare,
  FiZap,
  FiDownload,
  FiInfo,
  FiUsers,
  FiAward,
  FiCalendar,
  FiTag,
  FiMonitor,
  FiHardDrive,
  FiStar,
  FiPackage,
  FiChevronDown,
  FiCheck,
} from "react-icons/fi";
import GameCover from "../GameCover";

const VersionSelector = ({ currentVersion, versions, onSelectVersion }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const { getTextClass } = useTheme();
  const { t } = useTranslation();

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.right - 180, // Align to right edge
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        ref={buttonRef}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-lg backdrop-blur-sm border text-sm font-medium bg-accent/20 border-accent/30 text-accent cursor-pointer hover:bg-accent/30 transition-all focus:outline-none focus:ring-2 focus:ring-accent/50"
      >
        <FiPackage className="w-3.5 h-3.5" />
        <span>v{currentVersion.version}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FiChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu - Rendered in Portal */}
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 9999,
            }}
            className="min-w-[180px] rounded-xl overflow-hidden bg-surface border border-border shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-border bg-background/50">
              <p className={`text-xs font-semibold ${getTextClass('secondary')}`}>
                {t('games.versionsAvailable')}
              </p>
            </div>

            {/* Version List */}
            <div className="py-1 max-h-64 overflow-y-auto overflow-x-hidden">
              {versions.map((version) => {
                const isSelected = version._id === currentVersion._id;

                return (
                  <motion.button
                    key={version._id}
                    whileHover={{
                      scale: 1.01,
                      x: 2,
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (!isSelected && onSelectVersion) {
                        onSelectVersion(version);
                        setIsOpen(false);
                      }
                    }}
                    className={`group w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent/10'
                        : 'hover:bg-accent/15 hover:shadow-lg hover:border-l-2 hover:border-accent'
                    }`}
                  >
                    {/* Icon */}
                    <motion.div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected
                          ? 'bg-accent/20 text-accent'
                          : 'bg-background text-accent/60 group-hover:bg-accent/20 group-hover:text-accent group-hover:scale-110'
                      }`}
                    >
                      <FiPackage className="w-4 h-4" />
                    </motion.div>

                    {/* Version Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold transition-colors ${
                          isSelected ? 'text-accent' : `${getTextClass('primary')} group-hover:text-accent`
                        }`}>
                          v{version.version}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center"
                          >
                            <FiCheck className="w-3 h-3 text-accent" />
                          </motion.div>
                        )}
                      </div>
                      {version.sizeMB && (
                        <p className={`text-xs ${getTextClass('secondary')}`}>
                          {version.sizeMB} MB
                        </p>
                      )}
                    </div>

                    {/* Check icon for selected */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="flex-shrink-0"
                      >
                        <FiCheck className="w-5 h-5 text-accent" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer with count */}
            <div className="px-3 py-2 border-t border-border bg-background/50">
              <p className={`text-xs font-medium ${getTextClass('secondary')}`}>
                {t('games.versionCount', { count: versions.length })}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
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
  isInstalling,
  user,
  onLaunch,
  onStop,
  onForceStop,
  onInstall,
  onUninstall,
  onOpenFolder,
  onDeleteFromServer,
  getGenresArray,
  getPlatformsArray,
}) => {
  const { t } = useTranslation();
  const { isLight, getTextClass } = useTheme();

  // Calculate game versions
  const gameVersions = game && game.igdbId
    ? allGames
        .filter(g => g.igdbId === game.igdbId)
        .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: 'base' }))
    : [];

  const hasMultipleVersions = gameVersions.length > 1;

  if (!game) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-6">
            <div className="text-5xl">🎮</div>
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${getTextClass('primary')}`}>
            {t('games.selectGame')}
          </h2>
          <p className={`text-base ${getTextClass('secondary')}`}>
            {t('games.selectGameDesc')}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Enhanced Header with Cover */}
      <div className="relative h-64 overflow-hidden border-b border-border">
        {game.coverUrl ? (
          <>
            {/* Background Image with Enhanced Effects */}
            <div className="absolute inset-0">
              <GameCover
                src={game.coverUrl}
                alt={game.name}
                className="w-full h-full object-cover"
                size="cover_big"
                blur={true}
              />
              {/* Multiple gradient overlays for depth */}
              <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
              {/* Vignette effect */}
              <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-background/80" />
            </div>

            {/* Animated accent glow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        )}

        <div className="relative h-full flex items-end">
          <div className="w-full px-8 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-end gap-6"
            >
              {/* Game Cover Thumbnail with Glow */}
              {game.coverUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="hidden sm:block relative flex-shrink-0"
                >
                  <div className="absolute -inset-2 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30 rounded-2xl blur-xl opacity-75" />
                  <div className="relative w-28 h-40 rounded-xl overflow-hidden shadow-2xl border-2 border-border/50 backdrop-blur-sm">
                    <GameCover
                      src={game.coverUrl}
                      alt={game.name}
                      className="w-full h-full object-cover"
                      size="cover_small"
                    />
                  </div>
                </motion.div>
              )}

              {/* Title and Meta Information */}
              <div className="flex-1 min-w-0 space-y-4">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`text-4xl sm:text-5xl font-black truncate ${getTextClass('primary')} drop-shadow-lg`}
                  style={{
                    textShadow: isLight
                      ? '0 2px 10px rgba(0,0,0,0.1)'
                      : '0 2px 20px rgba(0,0,0,0.5), 0 0 40px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  {game.name}
                </motion.h1>

                {/* Meta Tags */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-wrap items-center gap-3"
                >
                  {/* Primary Genre Badge */}
                  {getGenresArray(game).length > 0 && (
                    <span className="px-3 py-1.5 rounded-lg bg-primary/20 backdrop-blur-sm text-primary font-semibold text-sm border border-primary/30 shadow-lg">
                      {getGenresArray(game)[0]}
                    </span>
                  )}

                  {/* Release Year */}
                  {game.releaseDate && (
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-sm border text-sm font-medium bg-surface/80 border-border/50 ${getTextClass('secondary')}`}>
                      <FiCalendar className="w-4 h-4" />
                      {dayjs(game.releaseDate).format("YYYY")}
                    </span>
                  )}

                  {/* Multiplayer Badge */}
                  {game.multiplayer?.enabled && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-sm border text-sm font-medium bg-secondary/20 border-secondary/30 text-secondary">
                      <FiUsers className="w-4 h-4" />
                      <span>
                        {game.multiplayer.maxPlayers && `${game.multiplayer.maxPlayers}P`}
                        {game.multiplayer.maxPlayers && game.multiplayer.type && ' • '}
                        {game.multiplayer.type && t(`games.multiplayerType.${game.multiplayer.type}`)}
                        {!game.multiplayer.maxPlayers && !game.multiplayer.type && t('games.multiplayer')}
                        {game.multiplayer.modes?.length > 0 && ` (${game.multiplayer.modes.map(m => t(`games.multiplayerModes.${m}`)).join(', ')})`}
                      </span>
                    </span>
                  )}

                  {/* Version Selector */}
                  {hasMultipleVersions && (
                    <VersionSelector
                      currentVersion={game}
                      versions={gameVersions}
                      onSelectVersion={onSelectVersion}
                    />
                  )}

                  {/* Enhanced Rating Display */}
                  {game.rating > 0 && (() => {
                    // Normalize rating to 0-10 scale (handle both 0-10 and 0-100 scales)
                    const normalizedRating = game.rating > 10 ? game.rating / 10 : game.rating;
                    const displayRating = normalizedRating.toFixed(1);

                    return (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm border bg-gradient-to-r from-warning/20 to-warning/10 border-warning/30">
                        {/* Star Rating Visual */}
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, index) => {
                            const fillPercentage = Math.min(Math.max((normalizedRating / 2) - index, 0), 1);
                            return (
                              <div key={index} className="relative w-4 h-4">
                                {/* Background star (empty) */}
                                <FiStar className="absolute inset-0 w-4 h-4 text-warning/30" />
                                {/* Filled star */}
                                {fillPercentage > 0 && (
                                  <div
                                    className="absolute inset-0 overflow-hidden"
                                    style={{ width: `${fillPercentage * 100}%` }}
                                  >
                                    <FiStar className="w-4 h-4 text-warning fill-warning" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {/* Numeric Score */}
                        <span className="text-warning font-bold text-sm">
                          {displayRating}
                        </span>
                        <span className={`text-xs font-medium ${getTextClass('secondary')}`}>
                          / 10
                        </span>
                      </div>
                    );
                  })()}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {/* Actions - Sticky au scroll */}
          <div className="mb-8">
            <ActionButtons
              game={game}
              isInstalled={isInstalled}
              isPlaying={isPlaying}
              isUninstalling={isUninstalling}
              isPending={isPending}
              isInstalling={isInstalling}
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

          {/* Main Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="xl:col-span-2 space-y-6">
              {/* About */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-6 lg:p-8 bg-surface border border-border"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/20">
                    <FiInfo className="text-lg text-primary" />
                  </div>
                  <h2 className={`text-2xl font-bold ${getTextClass('primary')}`}>
                    {t('games.about')}
                  </h2>
                </div>
                <p className={`text-base leading-relaxed ${getTextClass('secondary')}`}>
                  {game.summary || game.storyline || t('games.noDescription')}
                </p>
              </motion.div>

              {/* Stats */}
              {isInstalled && gameStats && gameStats.totalSessions > 0 && (
                <GameStatistics stats={gameStats} isPlaying={isPlaying} />
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="xl:col-span-1">
              <div className="sticky top-6 space-y-6">
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
    </div>
  );
};

const ActionButtons = ({
  game,
  isInstalled,
  isPlaying,
  isUninstalling,
  isPending,
  isInstalling,
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
  const { isLight, getTextClass } = useTheme();

  // Status cards for pending/uninstalling states
  if (isPending && !isUninstalling) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-6 border bg-warning/10 border-warning/30"
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center bg-warning/20">
            <svg className="w-8 h-8 text-warning animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h3 className={`text-xl font-bold mb-2 ${getTextClass('primary')}`}>
            {t('games.syncPending')}
          </h3>
          <p className={`text-sm mb-2 ${getTextClass('secondary')}`}>
            {t('games.syncPendingDesc')}
          </p>
          <p className={`text-xs ${getTextClass('secondary')}`}>
            {t('games.cannotLaunchSync')}
          </p>
        </div>
      </motion.div>
    );
  }

  if (isUninstalling) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-6 border bg-warning/10 border-warning/30"
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center bg-warning/20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-warning border-t-transparent" />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${getTextClass('primary')}`}>
            {t('games.uninstalling')}
          </h3>
          <p className={`text-sm ${getTextClass('secondary')}`}>
            {t('games.removingFiles')}
          </p>
        </div>
      </motion.div>
    );
  }

  // Not installed - show install button
  if (!isInstalled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <button
          onClick={() => onInstall(game)}
          disabled={isInstalling}
          className={`group relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 ${
            user?.role === "admin" ? "sm:col-span-1" : "sm:col-span-2"
          } ${
            isInstalling
              ? 'bg-primary/10 border-primary/50 scale-95'
              : 'bg-surface border-border hover:border-primary/50 hover:shadow-primary hover:scale-[1.02]'
          }`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent transition-opacity ${isInstalling ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center bg-primary/20">
              {isInstalling ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-primary" />
              ) : (
                <FiDownload className="text-2xl group-hover:animate-bounce text-primary" />
              )}
            </div>
            <h3 className={`text-xl font-bold mb-2 ${getTextClass('primary')}`}>
              {isInstalling ? t('games.starting') : t('games.installGame')}
            </h3>
            <p className={`text-sm ${getTextClass('secondary')}`}>
              {isInstalling ? t('games.redirecting') : t('games.downloadAndInstall', { size: game.sizeMB })}
            </p>
          </div>
        </button>

        {user?.role === "admin" && (
          <button
            onClick={() => onDeleteFromServer(game)}
            className="group relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02] bg-surface border-border hover:border-error/50 hover:shadow-error"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-error/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center bg-error/20">
                <FiTrash2 className="text-2xl text-error" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${getTextClass('primary')}`}>
                {t('games.deleteFromServerBtn')}
              </h3>
              <p className={`text-sm ${getTextClass('secondary')}`}>
                {t('games.adminOnly')}
              </p>
            </div>
          </button>
        )}
      </motion.div>
    );
  }

  // Installed - show action buttons
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isPlaying ? (
          <>
            <button
              onClick={() => onStop(game)}
              className="group relative overflow-hidden rounded-xl p-4 border transition-all duration-300 hover:scale-105 bg-surface border-border hover:border-warning/50 hover:shadow-warning"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-warning/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 text-center">
                <div className="w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center bg-warning/20">
                  <FiSquare className="text-xl text-warning" />
                </div>
                <p className={`text-sm font-semibold ${getTextClass('primary')}`}>
                  {t('games.stop')}
                </p>
              </div>
            </button>

            <button
              onClick={() => onForceStop(game)}
              className="group relative overflow-hidden rounded-xl p-4 border transition-all duration-300 hover:scale-105 bg-surface border-border hover:border-error/50 hover:shadow-error"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-error/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 text-center">
                <div className="w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center bg-error/20">
                  <FiZap className="text-xl text-error" />
                </div>
                <p className={`text-sm font-semibold ${getTextClass('primary')}`}>
                  {t('games.forceStop')}
                </p>
              </div>
            </button>
          </>
        ) : (
          <button
            onClick={() => onLaunch(game)}
            className="group relative overflow-hidden rounded-xl p-4 border transition-all duration-300 hover:scale-105 col-span-2 bg-success/10 border-success/30 hover:border-success/50 hover:shadow-success"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-xl mx-auto mb-3 flex items-center justify-center bg-success/20">
                <FiPlay className="text-3xl text-success" />
              </div>
              <p className={`text-lg font-bold ${getTextClass('primary')}`}>
                {t('games.playNow')}
              </p>
            </div>
          </button>
        )}

        <button
          onClick={() => onOpenFolder(game)}
          className="group relative overflow-hidden rounded-xl p-4 border transition-all duration-300 hover:scale-105 bg-surface border-border hover:border-primary/50 hover:shadow-primary"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 text-center">
            <div className="w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center bg-primary/20">
              <FiFolder className="text-xl text-primary" />
            </div>
            <p className={`text-sm font-semibold ${getTextClass('primary')}`}>
              {t('games.folder')}
            </p>
          </div>
        </button>

        <button
          onClick={() => onUninstall(game)}
          className="group relative overflow-hidden rounded-xl p-4 border transition-all duration-300 hover:scale-105 bg-surface border-border hover:border-error/50 hover:shadow-error"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-error/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 text-center">
            <div className="w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center bg-error/20">
              <FiTrash2 className="text-xl text-error" />
            </div>
            <p className={`text-sm font-semibold ${getTextClass('primary')}`}>
              {t('games.uninstall')}
            </p>
          </div>
        </button>
      </div>
    </motion.div>
  );
};

const GameStatistics = ({ stats, isPlaying }) => {
  const { t } = useTranslation();
  const { isLight, getTextClass } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl p-6 lg:p-8 bg-surface border border-border"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary/20">
          <FiBarChart2 className="text-lg text-secondary" />
        </div>
        <h2 className={`text-2xl font-bold ${getTextClass('primary')}`}>
          {t('games.gameStatistics')}
        </h2>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="group relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 hover:scale-105 bg-surface border-border hover:shadow-primary">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${getTextClass('secondary')}`}>
                {t('games.totalTime')}
              </span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20">
                <FiClock className="text-primary" />
              </div>
            </div>
            <div className={`text-2xl font-bold mb-2 ${getTextClass('primary')}`}>
              {stats.totalPlayTime || "0h 0m"}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-background-secondary">
              <div className="h-full bg-gradient-primary rounded-full w-3/4" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 hover:scale-105 bg-surface border-border hover:shadow-secondary">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${getTextClass('secondary')}`}>
                {t('games.sessions')}
              </span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary/20">
                <FiTarget className="text-secondary" />
              </div>
            </div>
            <div className={`text-2xl font-bold mb-2 ${getTextClass('primary')}`}>
              {stats.totalSessions || 0}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-background-secondary">
              <div className="h-full rounded-full w-2/3 bg-gradient-secondary" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 hover:scale-105 bg-surface border-border hover:shadow-accent">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${getTextClass('secondary')}`}>
                {t('games.averageTime')}
              </span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/20">
                <FiTrendingUp className="text-accent" />
              </div>
            </div>
            <div className={`text-2xl font-bold mb-2 ${getTextClass('primary')}`}>
              {stats.averageSessionTime || "0h 0m"}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-background-secondary">
              <div className="h-full rounded-full w-1/2 bg-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-background-secondary border border-border">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-warning/20 flex-shrink-0">
            <FiPlay className="text-xl text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium mb-1 ${getTextClass('secondary')}`}>
              {t('games.firstLaunch')}
            </p>
            <p className={`text-sm font-bold truncate ${getTextClass('primary')}`}>
              {stats.firstLaunchedFormatted || t('games.never')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-background-secondary border border-border">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent/20 flex-shrink-0">
            <FiActivity className="text-xl text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium mb-1 ${getTextClass('secondary')}`}>
              {t('games.lastSession')}
            </p>
            <p className={`text-sm font-bold truncate ${getTextClass('primary')}`}>
              {stats.lastPlayedFormatted || t('games.never')}
            </p>
          </div>
        </div>
      </div>

      {/* Game in Progress Banner */}
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-r from-success/20 to-success/10 border border-success/30"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-success/10 to-transparent animate-pulse" />
          <div className="relative flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
              <span className="text-xl">🎮</span>
            </div>
            <span className={`font-bold text-base ${getTextClass('primary')}`}>
              {t('games.gameInProgress')}
            </span>
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const GameInformation = ({
  game,
  gameSize,
  isInstalled,
  getGenresArray,
  getPlatformsArray,
}) => {
  const { t } = useTranslation();
  const { isLight, getTextClass } = useTheme();

  const InfoCard = ({ icon: Icon, label, value, color = "primary" }) => {
    const colorClasses = {
      primary: 'bg-primary/20 text-primary',
      secondary: 'bg-secondary/20 text-secondary',
      accent: 'bg-accent/20 text-accent',
      warning: 'bg-warning/20 text-warning',
    };

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="group rounded-xl p-4 border transition-all duration-300 bg-surface border-border hover:border-primary/30"
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
            <Icon className="text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium mb-1 ${getTextClass('secondary')}`}>
              {label}
            </p>
            <p className={`text-sm font-semibold truncate ${getTextClass('primary')}`}>
              {value}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border bg-surface border-border overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <FiInfo className="text-primary" />
          </div>
          <h3 className={`text-lg font-bold ${getTextClass('primary')}`}>
            {t('games.information')}
          </h3>
        </div>
      </div>

      {/* Info Cards */}
      <div className="p-6 space-y-3 border-b border-border">
        {game.developer && (
          <InfoCard
            icon={FiUsers}
            label={t('games.developer')}
            value={game.developer}
            color="primary"
          />
        )}

        {game.publisher && (
          <InfoCard
            icon={FiAward}
            label={t('games.publisher')}
            value={game.publisher}
            color="secondary"
          />
        )}

        {game.releaseDate && (
          <InfoCard
            icon={FiCalendar}
            label={t('games.releaseDate')}
            value={dayjs(game.releaseDate).format("DD/MM/YYYY")}
            color="accent"
          />
        )}

        {(isInstalled ? gameSize : game.sizeMB) && (
          <InfoCard
            icon={FiHardDrive}
            label={isInstalled ? t('games.installedSize') : t('games.downloadSize')}
            value={isInstalled ? `${gameSize?.sizeGB || '...'} GB` : `${game.sizeMB} MB`}
            color="warning"
          />
        )}
      </div>

      {/* Genres */}
      {getGenresArray(game).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 border-b border-border"
        >
          <div className="flex items-center gap-2 mb-3">
            <FiTag className="text-primary text-sm" />
            <h4 className={`text-sm font-semibold ${getTextClass('primary')}`}>
              {t('games.genres')}
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {getGenresArray(game).map((genre, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="px-2.5 py-1 text-xs font-medium rounded-lg cursor-default transition-all bg-primary/10 text-primary hover:bg-primary/20"
              >
                {genre}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Platforms */}
      {getPlatformsArray(game).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <FiMonitor className="text-secondary text-sm" />
            <h4 className={`text-sm font-semibold ${getTextClass('primary')}`}>
              {t('games.platforms')}
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {getPlatformsArray(game).map((platform, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="px-2.5 py-1 text-xs font-medium rounded-lg cursor-default transition-all bg-secondary/10 text-secondary hover:bg-secondary/20"
              >
                {platform}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GameDetails;
