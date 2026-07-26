import { useTranslation } from "react-i18next";
import { FiClock, FiZap, FiSearch } from "react-icons/fi";
import GameCover from "../GameCover";
import {
  BPDialog, BPDialogTitle, PadHints, choiceStyle,
  OSK_SPACE, OSK_ERASE, OSK_DONE, OSK_ROWS,
} from "./shared";

const formatSession = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${String(s % 60).padStart(2, "0")}s`;
};

export const BPNowPlayingOverlay = ({
  nowPlaying,
  sessionNow,
  selectedIndex,
  onSelect,
  onResume,
  onStop,
  glyphs: G,
}) => {
  const { t } = useTranslation();
  const options = [
    { label: t("bigPicture.resume"), danger: false },
    { label: t("bigPicture.stopGame"), danger: true },
  ];

  return (
    <BPDialog z="z-30" dim="rgba(0,0,0,0.8)" blur="blur(8px)" maxWidth="max-w-xl" className="flex gap-6">
      {nowPlaying.coverUrl && (
        <div className="shrink-0 w-28 rounded-xl overflow-hidden" style={{ aspectRatio: "3 / 4" }}>
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
        <h2 className="text-2xl font-bold truncate mb-1" style={{ color: "var(--app-text)" }}>
          {nowPlaying.name}
        </h2>
        <p
          className="flex items-center gap-1.5 text-sm tabular-nums mb-5"
          style={{ color: "var(--app-textSecondary)" }}
        >
          <FiClock size={13} />
          {formatSession(sessionNow - nowPlaying.startTime)}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt, i) => (
            <button
              key={i}
              onMouseEnter={() => onSelect(i)}
              onClick={() => (i === 1 ? onStop() : onResume())}
              className="rounded-xl px-4 py-3 text-sm font-bold transition-all outline-none"
              style={{
                ...choiceStyle(selectedIndex === i, opt.danger),
                border: "1px solid var(--app-border)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <PadHints
          items={[
            { glyph: G.confirm, color: G.confirmColor, label: t("common.confirm") },
            { glyph: G.back, color: G.backColor, label: t("common.cancel") },
          ]}
        />
      </div>
    </BPDialog>
  );
};

export const BPSearchOverlay = ({ query, resultCount, osk, onOskFocus, onOskPress, onClose, glyphs: G }) => {
  const { t } = useTranslation();

  const labelFor = (key) =>
    key === OSK_SPACE
      ? t("bigPicture.space")
      : key === OSK_ERASE
        ? t("bigPicture.erase")
        : key === OSK_DONE
          ? t("bigPicture.done")
          : key;

  return (
    <BPDialog dim="rgba(0,0,0,0.8)" blur="blur(8px)" onBackdropClick={onClose}>
      <div
        className="flex items-center gap-3 px-5 py-4 rounded-xl mb-6 text-xl font-semibold"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid var(--app-border)",
          color: "var(--app-text)",
        }}
      >
        <FiSearch size={20} style={{ color: "var(--app-primary)" }} />
        <span className="flex-1 min-h-6 tabular-nums">
          {query}
          <span className="animate-pulse" style={{ color: "var(--app-primary)" }}>
            |
          </span>
        </span>
        {resultCount > 0 && query && (
          <span className="text-sm font-normal" style={{ color: "var(--app-textSecondary)" }}>
            {resultCount}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {OSK_ROWS.map((row, r) => (
          <div key={r} className="flex justify-center gap-2">
            {row.map((key, c) => {
              const isFocusedKey = osk.row === r && osk.col === c;
              const wide = typeof key === "object";
              return (
                <button
                  key={c}
                  onMouseEnter={() => onOskFocus(r, c)}
                  onClick={() => onOskPress(key)}
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
                  {labelFor(key)}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <PadHints
        className="mt-6"
        items={[
          { glyph: G.confirm, color: G.confirmColor, label: t("common.confirm") },
          { glyph: G.action, color: G.actionColor, label: t("bigPicture.erase") },
          { glyph: G.secondary, color: G.secondaryColor, label: t("bigPicture.space") },
          { glyph: G.back, color: G.backColor, label: t("bigPicture.done") },
        ]}
      />
    </BPDialog>
  );
};

export const BPUninstallDialog = ({ gameName, selectedIndex, onSelect, onCancel, onConfirm }) => {
  const { t } = useTranslation();
  const labels = [t("common.cancel"), t("games.uninstall")];

  return (
    <BPDialog role="alertdialog" maxWidth="max-w-lg">
      <BPDialogTitle
        title={t("bigPicture.uninstallConfirmTitle", { name: gameName })}
        description={t("bigPicture.uninstallConfirmDesc")}
      />
      <div className="grid grid-cols-2 gap-4">
        {labels.map((label, i) => (
          <button
            key={i}
            onMouseEnter={() => onSelect(i)}
            onClick={() => (i === 1 ? onConfirm() : onCancel())}
            className="rounded-xl px-5 py-3.5 text-base font-bold transition-all outline-none"
            style={{
              ...choiceStyle(selectedIndex === i, i === 1),
              border: "1px solid var(--app-border)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </BPDialog>
  );
};

export const BPPathPromptDialog = ({ gameName, defaultDir, selectedIndex, onSelect, onResolve, glyphs: G }) => {
  const { t } = useTranslation();
  const options = [
    { key: "default", title: t("bigPicture.useDefault"), sub: defaultDir },
    { key: "browse", title: t("bigPicture.browseFolder"), sub: t("bigPicture.browseFolderDesc") },
  ];

  return (
    <BPDialog>
      <BPDialogTitle
        title={t("bigPicture.pathPromptTitle")}
        description={t("bigPicture.pathPromptDesc", { name: gameName })}
      />
      <div className="grid grid-cols-2 gap-4">
        {options.map((opt, i) => (
          <button
            key={opt.key}
            onMouseEnter={() => onSelect(i)}
            onClick={() => onResolve(opt.key)}
            className="rounded-xl p-5 text-left transition-all outline-none"
            style={{
              background: selectedIndex === i ? "var(--app-primary)" : "rgba(255,255,255,0.04)",
              color: selectedIndex === i ? "#fff" : "var(--app-text)",
              boxShadow: selectedIndex === i ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
              border: "1px solid var(--app-border)",
            }}
          >
            <span className="block text-base font-bold mb-1">{opt.title}</span>
            <span
              className="block text-xs break-all"
              style={{ opacity: selectedIndex === i ? 0.85 : 0.6 }}
            >
              {opt.sub}
            </span>
          </button>
        ))}
      </div>
      <PadHints
        gap="gap-8"
        className="mt-6"
        items={[
          { glyph: G.confirm, color: G.confirmColor, label: t("common.confirm") },
          { glyph: G.back, color: G.backColor, label: t("common.cancel") },
        ]}
      />
    </BPDialog>
  );
};
