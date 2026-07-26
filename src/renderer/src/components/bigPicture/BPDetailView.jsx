import { useTranslation } from "react-i18next";
import {
  FiClock, FiZap, FiStar, FiCalendar, FiUser, FiUsers, FiMonitor,
  FiHardDrive, FiTag, FiPackage, FiTerminal, FiBarChart2, FiRefreshCw,
} from "react-icons/fi";
import GameCover from "../GameCover";
import {
  StatRow, DetailRow, genreName, platformName, formatSize, detailPillStyle, describeMultiplayer,
} from "./shared";

const StatsColumn = ({ game, installed, stats, fallbackPlaytime }) => {
  const { t } = useTranslation();

  return (
    <div className="shrink-0 w-64">
      <div
        className="rounded-xl overflow-hidden"
        style={{ aspectRatio: "3 / 4", boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}
      >
        <GameCover
          src={game.coverUrl}
          alt={game.name}
          className="w-full h-full object-cover"
          size="cover_big"
        />
      </div>

      {installed && (
        <div className="mt-4 flex flex-col gap-2">
          <StatRow
            icon={FiClock}
            label={t("games.playtime")}
            value={stats?.totalPlayTime || fallbackPlaytime || "—"}
          />
          <StatRow
            icon={FiBarChart2}
            label={t("games.sessions")}
            value={stats ? String(stats.totalSessions ?? 0) : "—"}
          />
          {stats?.averageSessionSeconds > 0 && (
            <StatRow
              icon={FiClock}
              label={t("bigPicture.avgSession")}
              value={stats.averageSessionTime}
            />
          )}
          <StatRow
            icon={FiCalendar}
            label={t("bigPicture.lastPlayed")}
            value={stats?.lastPlayedFormatted || t("games.never")}
          />
          {stats?.firstLaunchedFormatted && stats.firstLaunchedFormatted !== t("games.never") && (
            <StatRow
              icon={FiCalendar}
              label={t("bigPicture.firstLaunched")}
              value={stats.firstLaunchedFormatted}
            />
          )}
        </div>
      )}
    </div>
  );
};

const ActionRows = ({ rows, detailPos, setDetailPos, runDetailItem, currentStatus, currentDisplay, disabled }) => (
  <div className="flex flex-col gap-4 mt-6">
    {rows.map((row, rowIdx) => (
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
            const isFocusedItem = detailPos.row === rowIdx && detailPos.col === colIdx;
            const isActions = row.type === "actions";
            const isCurrent =
              (row.type === "status" && item.value === currentStatus) ||
              (row.type === "display" && item.value === currentDisplay);
            return (
              <button
                key={row.type + colIdx}
                onMouseEnter={() => setDetailPos({ row: rowIdx, col: colIdx })}
                onClick={() => runDetailItem(row, item)}
                disabled={disabled}
                className={`flex items-center gap-2 rounded-xl font-bold transition-all outline-none ${
                  isActions ? "px-6 py-3.5 text-base" : "px-4 py-2 text-sm"
                }`}
                style={{
                  ...detailPillStyle(isFocusedItem, isCurrent, item),
                  boxShadow: isFocusedItem ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
                  transform: isFocusedItem ? "scale(1.04)" : "scale(1)",
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                {item.icon && <item.icon size={isActions ? 17 : 13} />}
                {!item.icon && item.color && (
                  <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

const InfoGrid = ({ game, meta, installedEntry, modsInfo, launchArgs, language }) => {
  const { t } = useTranslation();
  const multiplayerText = describeMultiplayer(game.multiplayer, t);

  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-3 mt-6 max-w-3xl pb-4">
      {game.developer && (
        <DetailRow icon={FiUser} label={t("games.developer")} value={game.developer} />
      )}
      {game.publisher && (
        <DetailRow icon={FiUsers} label={t("games.publisher")} value={game.publisher} />
      )}
      {game.releaseDate && (
        <DetailRow
          icon={FiCalendar}
          label={t("games.releaseDate")}
          value={new Date(game.releaseDate).toLocaleDateString(language)}
        />
      )}
      {game.platforms?.length > 0 && (
        <DetailRow
          icon={FiMonitor}
          label={t("games.platforms")}
          value={game.platforms.slice(0, 3).map(platformName).filter(Boolean).join(" · ")}
        />
      )}
      {multiplayerText && (
        <DetailRow icon={FiUsers} label={t("games.multiplayer")} value={multiplayerText} />
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
      {meta.installed && installedEntry?.path && (
        <DetailRow
          icon={FiHardDrive}
          label={t("games.installedSize")}
          value={formatSize(installedEntry?.sizeMB) || meta.size || "—"}
        />
      )}
      {launchArgs && (
        <DetailRow icon={FiTerminal} label={t("games.launchArgs")} value={launchArgs} mono />
      )}
    </div>
  );
};

const BPDetailView = ({
  game,
  meta,
  installedEntry,
  stats,
  modsInfo,
  detailRows,
  detailPos,
  setDetailPos,
  runDetailItem,
  currentStatus,
  currentDisplay,
  launchArgs,
  uninstalling,
  shots,
  shotIndex,
  setShotIndex,
  language,
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative z-10 flex-1 overflow-y-auto px-12 pb-6 pt-2">
      <div className="flex gap-10 max-w-6xl mx-auto">
        <StatsColumn
          game={game}
          installed={meta.installed}
          stats={stats}
          fallbackPlaytime={meta.playtime}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-4 flex-wrap">
            <h1 className="text-4xl font-bold" style={{ color: "var(--app-text)" }}>
              {game.name}
            </h1>
            {meta.running && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <FiZap size={14} /> {t("bigPicture.running")}
              </span>
            )}
            {meta.updateAvailable && (
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
            {meta.year && <span>{meta.year}</span>}
            {meta.rating && (
              <span className="flex items-center gap-1">
                <FiStar size={13} style={{ color: "var(--app-warning)" }} /> {meta.rating}
              </span>
            )}
            {meta.size && <span>{meta.size}</span>}
            {game.version && (
              <span>
                v{String(game.version).replace(/^v/i, "")}
                {meta.updateAvailable && installedEntry?.version && (
                  <span style={{ color: "var(--app-warning)" }}>
                    {" "}
                    ({t("bigPicture.installedVersion", { version: installedEntry.version })})
                  </span>
                )}
              </span>
            )}
            {game.genres?.length > 0 && (
              <span className="flex items-center gap-1.5">
                <FiTag size={12} />
                {game.genres.slice(0, 3).map(genreName).filter(Boolean).join(" · ")}
              </span>
            )}
            {meta.download && (
              <span className="font-semibold tabular-nums" style={{ color: "var(--app-primary)" }}>
                {meta.download.stage === "paused"
                  ? t("bigPicture.paused")
                  : `${t("bigPicture.installing")} ${Math.round(meta.download.progress || 0)}%`}
              </span>
            )}
          </div>

          <ActionRows
            rows={detailRows}
            detailPos={detailPos}
            setDetailPos={setDetailPos}
            runDetailItem={runDetailItem}
            currentStatus={currentStatus}
            currentDisplay={currentDisplay}
            disabled={uninstalling}
          />

          {game.summary && (
            <p
              className="text-sm mt-6 leading-relaxed overflow-hidden max-w-3xl"
              style={{
                color: "var(--app-textSecondary)",
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
              }}
            >
              {game.summary}
            </p>
          )}

          {game.storyline && game.storyline !== game.summary && (
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
                {game.storyline}
              </p>
            </div>
          )}

          <InfoGrid
            game={game}
            meta={meta}
            installedEntry={installedEntry}
            modsInfo={modsInfo}
            launchArgs={launchArgs}
            language={language}
          />

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
                  <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BPDetailView;
