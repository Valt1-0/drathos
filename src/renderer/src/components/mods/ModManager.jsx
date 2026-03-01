import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPackage, FiCircle, FiFilter, FiChevronDown } from "react-icons/fi";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useDebounce } from "../../hooks/useDebounce";
import { useConnection } from "../../contexts/connectionContext";
import { getModsForGame, installMod, uninstallMod, getInstalledMods, deleteMod, normalizeGameId, normalizeModId } from "../../api/mods";
import ModCard from "./ModCard";
import { Button, SearchBar } from "../ui";

// Sort configuration
const SORT_CONFIG = {
  NAME_ASC: { key: 'name', dir: 1 },
  NAME_DESC: { key: 'name', dir: -1 },
  DATE_DESC: { key: 'date', dir: -1 },
  DATE_ASC: { key: 'date', dir: 1 },
  SIZE_DESC: { key: 'size', dir: -1 },
  SIZE_ASC: { key: 'size', dir: 1 },
};

// Reusable filter select
const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] font-medium" style={{ color: 'var(--app-textSecondary)' }}>{label}:</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs px-2 py-1 rounded border-0 cursor-pointer focus:outline-none focus:ring-1"
      style={{ background: 'var(--app-surface)', color: 'var(--app-text)' }}
    >
      {options.map(({ value: v, label: l }) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>
);

// Empty state component
const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="text-center py-8">
    <Icon className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--app-textSecondary)' }} />
    <p className="text-sm font-medium mb-1" style={{ color: 'var(--app-text)' }}>{title}</p>
    <p className="text-xs" style={{ color: 'var(--app-textSecondary)' }}>{subtitle}</p>
  </div>
);

// Error message helper
const getErrorMessage = (error, t, ctx) => {
  const msg = (error?.message || "").toLowerCase();
  if (msg.includes("network") || msg.includes("fetch")) return t(ctx === "download" ? 'mods.errorDownload' : 'mods.errorNetwork');
  if (msg.includes("404") || msg.includes("not found")) return t(ctx === "uninstall" ? 'mods.errorNotFound' : 'mods.errorGameNotFound');
  if (msg.includes("403")) return t('mods.errorForbidden');
  if (msg.includes("disk") || msg.includes("enospc")) return t('mods.errorDiskSpace');
  if (msg.includes("permission")) return t('mods.errorPermission');
  return error?.message ? t('mods.errorGeneric', { message: error.message }) : t('common.error');
};

const ModManager = ({ gameId, allowDownload = true, isOpen = true, onToggle }) => {
  const { t } = useTranslation();
  const { isOnline } = useConnection();
  const [activeTab, setActiveTab] = useState(allowDownload ? "available" : "installed");
  const [availableMods, setAvailableMods] = useState([]);
  const [installedMods, setInstalledMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [installing, setInstalling] = useState(null);
  const [installProgress, setInstallProgress] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Sort and filter states
  const [sortOption, setSortOption] = useState('NAME_ASC');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const resetFilters = () => { setTypeFilter('all'); setSortOption('NAME_ASC'); };

  // Pagination state
  const [pagination, setPagination] = useState({
    available: { page: 1, totalPages: 1, totalMods: 0 },
    installed: { page: 1, totalPages: 1, totalMods: 0 }
  });

  // Helper to filter installed mods for current game
  const filterInstalledModsForGame = useCallback((mods) => {
    const normalizedGameId = normalizeGameId(gameId);
    return mods.filter((im) => normalizeGameId(im.gameId) === normalizedGameId);
  }, [gameId]);

  // Load mods - memoized for proper useEffect dependency
  const loadMods = useCallback(async (reset = false, currentPage = 1) => {
    reset ? setLoading(true) : setLoadingMore(true);

    try {
      const [availableData, installedData] = await Promise.all([
        getModsForGame(gameId, { page: reset ? 1 : currentPage, limit: 20 }),
        getInstalledMods({ limit: 100 })
      ]);

      const gameInstalledMods = filterInstalledModsForGame(installedData.installedMods);

      setAvailableMods(reset ? availableData.mods : prev => [...prev, ...availableData.mods]);
      setInstalledMods(gameInstalledMods);

      setPagination({
        available: {
          page: availableData.currentPage,
          totalPages: availableData.totalPages,
          totalMods: availableData.totalMods
        },
        installed: {
          page: 1,
          totalPages: 1,
          totalMods: gameInstalledMods.length
        }
      });
    } catch (error) {
      toast.error(getErrorMessage(error, t, "load"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [gameId, filterInstalledModsForGame, t]);

  // Reload on gameId change (seulement si confirmé online)
  useEffect(() => {
    // Skip si pas encore vérifié (null) ou offline (false)
    if (isOnline !== true) {
      setLoading(false);
      return;
    }
    loadMods(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, isOnline]);

  const loadMoreAvailable = async () => {
    if (pagination.available.page >= pagination.available.totalPages || loadingMore) return;

    setLoadingMore(true);
    try {
      const data = await getModsForGame(gameId, {
        page: pagination.available.page + 1,
        limit: 20
      });
      setAvailableMods(prev => [...prev, ...data.mods]);
      setPagination(prev => ({
        ...prev,
        available: { ...prev.available, page: prev.available.page + 1 }
      }));
    } catch (error) {
      toast.error(t('mods.errorLoadMore', { message: error.message || t('common.error') }));
    } finally {
      setLoadingMore(false);
    }
  };

  const reloadInstalledMods = useCallback(async () => {
    const { installedMods: mods } = await getInstalledMods({ limit: 100 });
    const gameInstalledMods = filterInstalledModsForGame(mods);
    setInstalledMods(gameInstalledMods);
    setPagination(prev => ({ ...prev, installed: { ...prev.installed, totalMods: gameInstalledMods.length } }));
    return gameInstalledMods;
  }, [filterInstalledModsForGame]);

  const handleInstall = useCallback(async (modId) => {
    setInstalling(modId);
    setInstallProgress({ progress: 0, message: t('mods.initializing'), phase: 'init' });
    let installSucceeded = false;

    try {
      await installMod(modId, gameId, (progressData) => {
        setInstallProgress(progressData);
      });
      installSucceeded = true;

      try {
        await reloadInstalledMods();
        toast.success(t('mods.installSuccess'));
      } catch {
        toast.warning(t('mods.installPartialSuccess'));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t, "download"));
      if (installSucceeded) toast.info(t('mods.maybeInstalled'));
    } finally {
      setInstalling(null);
      setInstallProgress(null);
    }
  }, [gameId, reloadInstalledMods, t]);

  const handleUninstall = useCallback(async (modId) => {
    try {
      await uninstallMod(modId);
      await reloadInstalledMods();
      toast.success(t('mods.uninstallSuccess'));
    } catch (error) {
      toast.error(getErrorMessage(error, t, "uninstall"));
    }
  }, [reloadInstalledMods, t]);

  const handleDelete = useCallback(async (modId) => {
    try {
      await deleteMod(modId);
      setAvailableMods(prev => prev.filter(m => m._id !== modId));
      setPagination(prev => ({ ...prev, available: { ...prev.available, totalMods: prev.available.totalMods - 1 } }));
      toast.success(t('mods.deletedFromServer'));
    } catch (error) {
      toast.error(getErrorMessage(error, t, "delete"));
    }
  }, [t]);

  // Memoize installed mod IDs for performance (normalized to strings)
  const installedModIds = useMemo(() =>
    new Set(installedMods.map(im => normalizeModId(im.modId)).filter(Boolean)),
    [installedMods]
  );

  const isModInstalled = useCallback(
    (modId) => installedModIds.has(normalizeModId(modId)),
    [installedModIds]
  );

  const installedModsWithData = useMemo(() =>
    installedMods.map(im => ({ ...im.modId, installedAt: im.installedAt })),
    [installedMods]
  );

  // Filter and sort mods
  const filterAndSortMods = useCallback((mods) => {
    const { key, dir } = SORT_CONFIG[sortOption];
    const query = debouncedSearchQuery?.toLowerCase();

    return mods
      .filter(mod => (typeFilter === 'all' || mod.modType === typeFilter) &&
        (!query || mod.name?.toLowerCase().includes(query) ||
          mod.author?.toLowerCase().includes(query) ||
          mod.description?.toLowerCase().includes(query)))
      .sort((a, b) => {
        const cmp = key === 'name' ? (a.name || '').localeCompare(b.name || '')
          : key === 'date' ? new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
          : (a.sizeMB || 0) - (b.sizeMB || 0);
        return cmp * dir;
      });
  }, [sortOption, typeFilter, debouncedSearchQuery]);

  const filteredAvailableMods = useMemo(() => filterAndSortMods(availableMods), [availableMods, filterAndSortMods]);
  const filteredInstalledMods = useMemo(() => filterAndSortMods(installedModsWithData), [installedModsWithData, filterAndSortMods]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--app-primary)' }}></div>
        <p className="mt-2 text-xs" style={{ color: 'var(--app-textSecondary)' }}>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Clickable Header */}
      {onToggle ? (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-2.5 p-4 hover:bg-primary/5 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20">
              <FiPackage className="text-base text-primary" />
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--app-text)' }}>
              {t('mods.modTitle')}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {allowDownload && (
              <div className="flex items-center gap-1.5">
                <FiPackage className="w-3 h-3" style={{ color: 'var(--app-primary)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--app-text)' }}>
                  {pagination.available.totalMods}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <FiCircle className="w-3 h-3" style={{ color: 'var(--app-secondary)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--app-text)' }}>
                {pagination.installed.totalMods}
              </span>
            </div>
            <div className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: 'var(--app-surface)' }}>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <FiChevronDown className="w-4 h-4" style={{ color: 'var(--app-textSecondary)' }} />
              </motion.div>
            </div>
          </div>
        </button>
      ) : (
        <div className="flex items-center justify-between p-4 pb-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20">
              <FiPackage className="text-base text-primary" />
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--app-text)' }}>
              {t('mods.modTitle')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {allowDownload && (
              <div className="flex items-center gap-1.5">
                <FiPackage className="w-3 h-3" style={{ color: 'var(--app-primary)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--app-text)' }}>
                  {pagination.available.totalMods}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <FiCircle className="w-3 h-3" style={{ color: 'var(--app-secondary)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--app-text)' }}>
                {pagination.installed.totalMods}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
      {isOpen && (
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: 'auto' }}
        exit={{ height: 0 }}
        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ overflow: 'hidden' }}
      >
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, delay: 0.06 }}
      >
      <div className="p-4 pt-3">
      {/* Compact Search & Tabs */}
      <div className="flex items-center gap-2 mb-2">
        {/* Tabs */}
        <div className="flex gap-1">
          {allowDownload && (
            <Button
              variant={activeTab === "available" ? "primary" : "ghost"}
              gradient={activeTab === "available"}
              size="sm"
              onClick={() => setActiveTab("available")}
            >
              {t('mods.available')}
            </Button>
          )}
          <Button
            variant={activeTab === "installed" ? "primary" : "ghost"}
            gradient={activeTab === "installed"}
            size="sm"
            onClick={() => setActiveTab("installed")}
          >
            {t('mods.installed')}
          </Button>
        </div>

        {/* Compact Search Bar */}
        <SearchBar
          placeholder={t('mods.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
          className="flex-1"
        />

        {/* Filter Toggle Button */}
        <Button
          variant={showFilters ? "primary" : "ghost"}
          size="sm"
          iconOnly
          icon={<FiFilter />}
          onClick={() => setShowFilters(!showFilters)}
          title={t('mods.filters')}
        />
      </div>

      {/* Sort and Filter Controls */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-3"
          >
            <div
              className="flex flex-wrap items-center gap-2 p-2 rounded-lg"
              style={{ background: 'var(--app-backgroundSecondary)' }}
            >
              {/* Sort Dropdown */}
              <FilterSelect
                label={t('mods.sortBy')}
                value={sortOption}
                onChange={setSortOption}
                options={[
                  { value: 'NAME_ASC', label: t('mods.sortNameAsc') },
                  { value: 'NAME_DESC', label: t('mods.sortNameDesc') },
                  { value: 'DATE_DESC', label: t('mods.sortDateDesc') },
                  { value: 'DATE_ASC', label: t('mods.sortDateAsc') },
                  { value: 'SIZE_DESC', label: t('mods.sortSizeDesc') },
                  { value: 'SIZE_ASC', label: t('mods.sortSizeAsc') },
                ]}
              />

              {/* Type Filter */}
              <FilterSelect
                label={t('mods.modType')}
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'all', label: t('mods.typeAll') },
                  { value: 'gameplay', label: t('mods.typeGameplay') },
                  { value: 'visual', label: t('mods.typeVisual') },
                  { value: 'audio', label: t('mods.typeAudio') },
                  { value: 'totalConversion', label: t('mods.typeTotalConversion') },
                  { value: 'other', label: t('mods.typeOther') },
                ]}
              />

              {/* Reset button */}
              {(typeFilter !== 'all' || sortOption !== 'NAME_ASC') && (
                <button
                  onClick={resetFilters}
                  className="text-[10px] px-2 py-0.5 rounded-full transition-colors hover:opacity-80"
                  style={{ background: 'var(--app-primary)', color: 'white' }}
                >
                  {t('mods.resetFilters')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {allowDownload && activeTab === "available" && (
          <motion.div
            key="available"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-2"
          >
            {filteredAvailableMods.length === 0 ? (
              <EmptyState
                icon={FiPackage}
                title={debouncedSearchQuery ? t('mods.noResults') : t('mods.noModsAvailable')}
                subtitle={searchQuery ? t('mods.tryAnotherSearch') : t('mods.noModsAvailable')}
              />
            ) : (
              <>
                {filteredAvailableMods.map((mod) => (
                  <ModCard
                    key={mod._id}
                    mod={mod}
                    installed={isModInstalled(mod._id)}
                    installing={installing === mod._id}
                    installProgress={installing === mod._id ? installProgress : null}
                    onInstall={() => handleInstall(mod._id)}
                    onUninstall={() => handleUninstall(mod._id)}
                    onDelete={!allowDownload ? () => handleDelete(mod._id) : undefined}
                  />
                ))}

                {/* Load More Button */}
                {pagination.available.page < pagination.available.totalPages && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadMoreAvailable}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                          <span className="text-xs">{t('mods.loadingMore')}</span>
                        </>
                      ) : (
                        <span className="text-xs">{t('mods.loadMore', { current: availableMods.length, total: pagination.available.totalMods })}</span>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === "installed" && (
          <motion.div
            key="installed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-2"
          >
            {filteredInstalledMods.length === 0 ? (
              <EmptyState
                icon={FiPackage}
                title={debouncedSearchQuery ? t('mods.noResults') : t('mods.noModsForGame')}
                subtitle={searchQuery ? t('mods.tryAnotherSearch') : (allowDownload ? t('mods.installFrom') : t('mods.noModsForGame'))}
              />
            ) : (
              <>
                {filteredInstalledMods.map((mod) => (
                  <ModCard
                    key={mod._id}
                    mod={mod}
                    installed={true}
                    onUninstall={() => handleUninstall(mod._id)}
                  />
                ))}

              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      </motion.div>
      </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default ModManager;
