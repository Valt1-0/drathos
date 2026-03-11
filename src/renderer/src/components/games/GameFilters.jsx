import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiUsers, FiX, FiArrowUp, FiArrowDown, FiFilter } from "react-icons/fi";

const GameFilters = ({ filters, onFiltersChange, allGenres, activeFilterCount }) => {
  const { t } = useTranslation();
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [genresOpen, setGenresOpen] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [userStatusOpen, setUserStatusOpen] = useState(false);
  const sortRef = useRef(null);
  const statusRef = useRef(null);
  const userStatusRef = useRef(null);

  useEffect(() => {
    if (!sortOpen && !statusOpen && !userStatusOpen) return;
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusOpen(false);
      if (userStatusRef.current && !userStatusRef.current.contains(e.target)) setUserStatusOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen, userStatusOpen]);

  const update = (key, value) => onFiltersChange({ ...filters, [key]: value });

  const toggleGenre = (genre) => {
    const next = filters.selectedGenres.includes(genre)
      ? filters.selectedGenres.filter((g) => g !== genre)
      : [...filters.selectedGenres, genre];
    update("selectedGenres", next);
  };

  const resetFilters = () => {
    onFiltersChange({
      sortBy: "name-asc",
      statusFilter: "all",
      selectedGenres: [],
      showOnlyMultiplayer: false,
      playtimeRange: "all",
      userStatusFilter: "all",
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

  const statusOptions = [
    { value: "all",           label: t("games.statusAll"),          dot: null           },
    { value: "installed",     label: t("games.statusInstalled"),    dot: "bg-success"   },
    { value: "not-installed", label: t("games.statusNotInstalled"), dot: "bg-surface border border-border" },
  ];

  const userStatusOptions = [
    { value: "all",        label: t("games.userStatusFilterAll"),   dot: null          },
    { value: "backlog",    label: t("games.userStatusBacklog"),     dot: "bg-primary"  },
    { value: "inProgress", label: t("games.userStatusInProgress"),  dot: "bg-warning"  },
    { value: "completed",  label: t("games.userStatusCompleted"),   dot: "bg-success"  },
    { value: "dropped",    label: t("games.userStatusDropped"),     dot: "bg-red-400"  },
  ];

  const playtimeOptions = [
    { value: "all",      label: t("games.playtimeAll")      },
    { value: "none",     label: t("games.playtimeNone")     },
    { value: "under1h",  label: t("games.playtimeUnder1h")  },
    { value: "1to10h",   label: t("games.playtime1to10h")   },
    { value: "10to50h",  label: t("games.playtime10to50h")  },
    { value: "over50h",  label: t("games.playtimeOver50h")  },
  ];

  const currentSort = sortOptions.find((o) => o.value === filters.sortBy) || sortOptions[0];
  const currentStatus = statusOptions.find((o) => o.value === filters.statusFilter) || statusOptions[0];
  const currentUserStatus = userStatusOptions.find((o) => o.value === (filters.userStatusFilter || "all")) || userStatusOptions[0];

  const hiddenActiveCount = [
    filters.showOnlyMultiplayer,
    filters.playtimeRange !== "all",
    filters.userStatusFilter && filters.userStatusFilter !== "all",
  ].filter(Boolean).length;

  const dropdownStyle = { border: "1px solid var(--app-border)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" };

  return (
    <div className="space-y-2">

      {/* Sort */}
      <div ref={sortRef} className="relative">
        <button
          onClick={() => { setSortOpen(!sortOpen); setStatusOpen(false); setUserStatusOpen(false); }}
          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            sortOpen ? "bg-surface ring-1 ring-primary text-text" : "bg-background-secondary text-text-secondary hover:bg-surface hover:text-text"
          }`}
          style={{ border: "1px solid var(--app-border)" }}
        >
          <span className="flex items-center gap-1.5 truncate">
            {currentSort.icon && <span className="opacity-50 shrink-0">{currentSort.icon}</span>}
            <span className="truncate">{currentSort.label}</span>
          </span>
          <FiChevronDown
            className="w-3 h-3 shrink-0 transition-transform duration-200"
            style={{ transform: sortOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
        {sortOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-[9999] py-0.5 bg-background-secondary"
            style={dropdownStyle}
          >
            {sortOptions.map((opt) => {
              const active = filters.sortBy === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { update("sortBy", opt.value); setSortOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface hover:text-text"
                  }`}
                >
                  {opt.icon && <span className="opacity-50 shrink-0">{opt.icon}</span>}
                  <span className="font-medium">{opt.label}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Status — dropdown */}
      <div ref={statusRef} className="relative">
        <button
          onClick={() => { setStatusOpen(!statusOpen); setSortOpen(false); }}
          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            statusOpen ? "bg-surface ring-1 ring-primary text-text" : "bg-background-secondary text-text-secondary hover:bg-surface hover:text-text"
          }`}
          style={{ border: "1px solid var(--app-border)" }}
        >
          <span className="flex items-center gap-1.5 truncate">
            {currentStatus.dot
              ? <div className={`w-2 h-2 rounded-full shrink-0 ${currentStatus.dot}`} />
              : <span className="w-2 h-2 rounded-full border border-current opacity-40 shrink-0" />
            }
            <span className={filters.statusFilter !== "all" ? "text-primary" : ""}>{currentStatus.label}</span>
          </span>
          <FiChevronDown
            className="w-3 h-3 shrink-0 transition-transform duration-200"
            style={{ transform: statusOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
        {statusOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-[9999] py-0.5 bg-background-secondary" style={dropdownStyle}>
            {statusOptions.map((opt) => {
              const active = filters.statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { update("statusFilter", opt.value); setStatusOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface hover:text-text"
                  }`}
                >
                  {opt.dot
                    ? <div className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />
                    : <span className="w-2 h-2 rounded-full border border-current opacity-40 shrink-0" />
                  }
                  <span className="font-medium">{opt.label}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Genres */}
      {allGenres.length > 0 && (
        <div>
          <button
            onClick={() => setGenresOpen(!genresOpen)}
            className="flex items-center justify-between w-full mb-1 group"
          >
            <span className="text-xs text-text-secondary font-medium group-hover:text-text transition-colors">
              {t("games.genres").replace(":", "")}
              {filters.selectedGenres.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                  {filters.selectedGenres.length}
                </span>
              )}
            </span>
            <FiChevronDown
              className="w-3 h-3 text-text-secondary transition-transform duration-200"
              style={{ transform: genresOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          {genresOpen && (
            <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto scrollbar-thin scrollbar-thumb-surface scrollbar-track-background">
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
          )}
        </div>
      )}

      {/* More filters toggle */}
      <button
        onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
        className="flex items-center gap-1.5 w-full text-xs text-text-secondary hover:text-text transition-colors py-0.5"
      >
        <FiFilter className="w-3 h-3 shrink-0" />
        <span>{moreFiltersOpen ? t("games.lessFilters") : t("games.moreFilters")}</span>
        {hiddenActiveCount > 0 && (
          <span className="ml-auto px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold leading-none">
            {hiddenActiveCount}
          </span>
        )}
        {!hiddenActiveCount && (
          <FiChevronDown
            className="w-3 h-3 ml-auto transition-transform duration-200"
            style={{ transform: moreFiltersOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        )}
      </button>

      {moreFiltersOpen && (
        <div className="space-y-2 pt-0.5">

          {/* Multiplayer toggle */}
          <button
            onClick={() => update("showOnlyMultiplayer", !filters.showOnlyMultiplayer)}
            role="switch"
            aria-checked={filters.showOnlyMultiplayer}
            className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filters.showOnlyMultiplayer
                ? "bg-secondary/15 text-secondary ring-1 ring-secondary/30"
                : "bg-background-secondary text-text-secondary hover:bg-surface hover:text-text"
            }`}
            style={{ border: "1px solid var(--app-border)" }}
          >
            <FiUsers className="w-3.5 h-3.5 shrink-0" />
            {t("games.multiplayer")}
            <div className={`ml-auto relative w-7 h-3.5 rounded-full transition-colors duration-200 shrink-0 ${
              filters.showOnlyMultiplayer ? "bg-secondary" : "bg-surface"
            }`} style={!filters.showOnlyMultiplayer ? { border: "1.5px solid var(--app-border)" } : {}}>
              <div
                className="absolute w-2.5 h-2.5 bg-white rounded-full shadow transition-all duration-200"
                style={{ top: "50%", transform: `translateY(-50%) translateX(${filters.showOnlyMultiplayer ? "13px" : "1px"})` }}
              />
            </div>
          </button>

          {/* User status — compact dropdown */}
          <div ref={userStatusRef} className="relative">
            <p className="text-xs text-text-secondary mb-1 font-medium">{t("games.userStatusLabel")}</p>
            <button
              onClick={() => setUserStatusOpen(!userStatusOpen)}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                userStatusOpen ? "bg-surface ring-1 ring-primary" : "bg-background-secondary hover:bg-surface"
              }`}
              style={{ border: "1px solid var(--app-border)" }}
            >
              <span className="flex items-center gap-1.5">
                {currentUserStatus.dot
                  ? <div className={`w-2 h-2 rounded-full shrink-0 ${currentUserStatus.dot}`} />
                  : <div className="w-2 h-2 rounded-full border border-current opacity-40 shrink-0" />
                }
                <span className={currentUserStatus.value !== "all" ? "text-text" : "text-text-secondary"}>
                  {currentUserStatus.label}
                </span>
              </span>
              <FiChevronDown
                className="w-3 h-3 text-text-secondary shrink-0 transition-transform duration-200"
                style={{ transform: userStatusOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            {userStatusOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-[9999] py-0.5 bg-background-secondary"
                style={dropdownStyle}
              >
                {userStatusOptions.map((opt) => {
                  const active = (filters.userStatusFilter || "all") === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { update("userStatusFilter", opt.value); setUserStatusOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                        active ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface hover:text-text"
                      }`}
                    >
                      {opt.dot
                        ? <div className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />
                        : <div className="w-2 h-2 rounded-full border border-current opacity-40 shrink-0" />
                      }
                      <span className="font-medium">{opt.label}</span>
                      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Playtime */}
          <div>
            <p className="text-xs text-text-secondary mb-1 font-medium">{t("games.playtime")}</p>
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

      {/* Reset */}
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
