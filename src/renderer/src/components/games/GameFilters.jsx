import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiUsers, FiX, FiArrowUp, FiArrowDown } from "react-icons/fi";

const GameFilters = ({ filters, onFiltersChange, allGenres, activeFilterCount }) => {
  const { t } = useTranslation();
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  const update = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleGenre = (genre) => {
    const current = filters.selectedGenres;
    const next = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    update("selectedGenres", next);
  };

  const resetFilters = () => {
    onFiltersChange({
      sortBy: "name-asc",
      statusFilter: "all",
      selectedGenres: [],
      showOnlyMultiplayer: false,
      playtimeRange: "all",
    });
  };

  const sortOptions = [
    { value: "name-asc", label: t("games.sortNameAsc"), icon: <FiArrowUp className="w-3 h-3" /> },
    { value: "name-desc", label: t("games.sortNameDesc"), icon: <FiArrowDown className="w-3 h-3" /> },
    { value: "rating", label: t("games.sortRating") },
    { value: "size", label: t("games.sortSize") },
    { value: "release-date", label: t("games.sortReleaseDate") },
    { value: "playtime", label: t("games.sortPlaytime") },
    { value: "recently-added", label: t("games.sortRecentlyAdded") },
  ];

  const currentSort = sortOptions.find((o) => o.value === filters.sortBy) || sortOptions[0];

  const statusOptions = [
    { value: "all", label: t("games.statusAll") },
    { value: "installed", label: t("games.statusInstalled") },
    { value: "not-installed", label: t("games.statusNotInstalled") },
  ];

  const playtimeOptions = [
    { value: "all", label: t("games.playtimeAll") },
    { value: "none", label: t("games.playtimeNone") },
    { value: "under1h", label: t("games.playtimeUnder1h") },
    { value: "1to10h", label: t("games.playtime1to10h") },
    { value: "10to50h", label: t("games.playtime10to50h") },
    { value: "over50h", label: t("games.playtimeOver50h") },
  ];

  return (
    <div className="space-y-2">
      {/* Sort - custom dropdown */}
      <div ref={sortRef} className="relative">
        <button
          onClick={() => setSortOpen(!sortOpen)}
          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
            sortOpen
              ? "bg-surface ring-1 ring-primary"
              : "bg-background-secondary hover:bg-surface"
          }`}
          style={{ border: "1px solid var(--app-border)" }}
        >
          <span className="flex items-center gap-1.5 font-medium truncate">
            <span className="text-text-secondary">{t("games.sortBy")}</span>
            <span className="text-text">{currentSort.label}</span>
          </span>
          <FiChevronDown
            className="w-3.5 h-3.5 text-text-secondary flex-shrink-0 transition-transform duration-200"
            style={{ transform: sortOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {sortOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-[9999] py-0.5 bg-background-secondary"
            style={{
              border: "1px solid var(--app-border)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}
          >
            {sortOptions.map((opt) => {
              const active = filters.sortBy === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { update("sortBy", opt.value); setSortOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-surface hover:text-text"
                  }`}
                >
                  {opt.icon && <span className="opacity-60">{opt.icon}</span>}
                  <span className="font-medium">{opt.label}</span>
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Status filter - segmented buttons */}
      <div
        className="flex rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--app-border)" }}
      >
        {statusOptions.map((opt) => {
          const active = filters.statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => update("statusFilter", opt.value)}
              className={`flex-1 text-xs py-1.5 font-medium transition-colors ${
                active
                  ? "bg-primary/15 text-primary"
                  : "bg-background-secondary text-text-secondary hover:bg-surface hover:text-text"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Genres - multi-select badges */}
      {allGenres.length > 0 && (
        <div>
          <p className="text-xs text-text-secondary mb-1.5 font-medium">
            {t("games.genres").replace(":", "")}
          </p>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-surface scrollbar-track-background">
            {allGenres.map((genre) => {
              const active = filters.selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "bg-surface text-text-secondary hover:text-text"
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible "More filters" */}
      <button
        onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
        className="flex items-center gap-1.5 w-full text-xs text-text-secondary hover:text-text transition-colors py-0.5"
      >
        <FiChevronDown
          className="w-3.5 h-3.5 transition-transform duration-200"
          style={{ transform: moreFiltersOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
        {moreFiltersOpen ? t("games.lessFilters") : t("games.moreFilters")}
      </button>

      {moreFiltersOpen && (
        <div className="space-y-2.5">
          {/* Multiplayer toggle */}
          <button
            onClick={() => update("showOnlyMultiplayer", !filters.showOnlyMultiplayer)}
            role="switch"
            aria-checked={filters.showOnlyMultiplayer}
            className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg transition-colors ${
              filters.showOnlyMultiplayer
                ? "bg-secondary/15 ring-1 ring-secondary/30"
                : "bg-background-secondary hover:bg-surface"
            }`}
            style={{ border: "1px solid var(--app-border)" }}
          >
            <div
              className={`relative w-8 h-4 rounded-full transition-all duration-200 flex-shrink-0 ${
                filters.showOnlyMultiplayer ? "bg-secondary" : "bg-surface"
              }`}
              style={!filters.showOnlyMultiplayer ? { border: "2px solid var(--app-border)" } : {}}
            >
              <div
                className="absolute w-3 h-3 bg-white rounded-full shadow transition-all duration-200"
                style={{
                  top: "50%",
                  transform: `translateY(-50%) translateX(${filters.showOnlyMultiplayer ? "16px" : "1px"})`,
                }}
              />
            </div>
            <FiUsers
              className={`w-3.5 h-3.5 transition-colors ${
                filters.showOnlyMultiplayer ? "text-secondary" : "text-text-secondary"
              }`}
            />
            <span
              className={`text-xs font-medium transition-colors ${
                filters.showOnlyMultiplayer ? "text-text" : "text-text-secondary"
              }`}
            >
              {t("games.multiplayer")}
            </span>
          </button>

          {/* Playtime range */}
          <div>
            <p className="text-xs text-text-secondary mb-1.5 font-medium">{t("games.playtime")}</p>
            <div className="flex flex-wrap gap-1">
              {playtimeOptions.map((opt) => {
                const active = filters.playtimeRange === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => update("playtimeRange", opt.value)}
                    className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                      active
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                        : "bg-surface text-text-secondary hover:text-text"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reset button */}
      {activeFilterCount > 0 && (
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 transition-colors"
        >
          <FiX className="w-3 h-3" />
          {t("games.resetFilters")}
          <span className="opacity-60">({activeFilterCount})</span>
        </button>
      )}
    </div>
  );
};

export default GameFilters;
