import { motion } from "framer-motion";

export const CARD_WIDTH = 176;
export const SECTIONS = ["installed", "library"];
export const SORTS = ["name", "rating", "release"];

export const PAD_GLYPHS = {
  xbox: {
    confirm: "A", back: "B", action: "X", secondary: "Y", bumpers: "LB · RB",
    confirmColor: "#3fbf5a", backColor: "#e5484d", actionColor: "#3b82f6", secondaryColor: "#e8b339",
  },
  playstation: {
    confirm: "✕", back: "◯", action: "▢", secondary: "△", bumpers: "L1 · R1",
    confirmColor: "#7c9cd9", backColor: "#ff6265", actionColor: "#e48fc0", secondaryColor: "#40c9a2",
  },
};

export const STATUS_VALUES = [null, "backlog", "inProgress", "completed", "dropped"];
export const STATUS_COLORS = {
  backlog: "var(--app-primary)",
  inProgress: "var(--app-warning)",
  completed: "var(--app-success)",
  dropped: "#f87171",
};

export const OSK_SPACE = { special: "space" };
export const OSK_ERASE = { special: "erase" };
export const OSK_DONE = { special: "done" };
export const OSK_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
  ["K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"],
  ["U", "V", "W", "X", "Y", "Z", "-", "'", ":", "&"],
  [OSK_SPACE, OSK_ERASE, OSK_DONE],
];

const MP_TYPE_LABELS = { online: "mpOnline", local: "mpLocal", both: "mpBoth" };
const MP_MODE_LABELS = { "co-op": "Co-op", pvp: "PvP" };

export const formatPlaytime = (stats) => {
  const total = stats?.totalPlayTime || 0;
  if (total < 60) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const genreName = (g) => (typeof g === "string" ? g : g?.name || "");
export const platformName = (p) => (typeof p === "string" ? p : p?.name || "");

export const formatSize = (sizeMB) =>
  sizeMB > 0 ? (sizeMB >= 1024 ? `${(sizeMB / 1024).toFixed(2)} GB` : `${sizeMB} MB`) : null;

export const hasUpdate = (game, installedEntry) =>
  !!(
    installedEntry &&
    game?.version &&
    installedEntry.version &&
    String(installedEntry.version) !== String(game.version)
  );

export const displayRatingOf = (game) => {
  const raw =
    game?.rating > 0 ? game.rating : game?.aggregatedRating > 0 ? game.aggregatedRating : 0;
  return raw > 0 ? (raw > 10 ? raw / 10 : raw).toFixed(1) : null;
};

export const choiceStyle = (focused, danger = false) => ({
  background: focused ? (danger ? "var(--app-error)" : "var(--app-primary)") : "rgba(255,255,255,0.04)",
  color: focused ? "#fff" : "var(--app-text)",
});

export const detailPillStyle = (isFocusedItem, isCurrent, item) => ({
  background: isFocusedItem
    ? item.danger ? "var(--app-error)" : "var(--app-primary)"
    : isCurrent ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
  color: isFocusedItem ? "#fff" : isCurrent && item.color ? item.color : "var(--app-text)",
  border: `1px solid ${isCurrent && !isFocusedItem ? item.color || "var(--app-primary)" : "var(--app-border)"}`,
});

export const describeMultiplayer = (mp, t) => {
  if (!mp || !(mp.enabled || mp === true)) return null;
  const parts = [
    MP_TYPE_LABELS[mp.type] ? t(`bigPicture.${MP_TYPE_LABELS[mp.type]}`) : null,
    Array.isArray(mp.modes) && mp.modes.length > 0
      ? mp.modes.map((m) => MP_MODE_LABELS[m] || m).join(", ")
      : null,
    mp.maxPlayers ? `1–${mp.maxPlayers}` : null,
  ].filter(Boolean);
  return parts.join(" · ") || "✓";
};

export const StatRow = ({ icon: Icon, label, value }) => (
  <div
    className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--app-border)" }}
  >
    <span className="flex items-center gap-2" style={{ color: "var(--app-textSecondary)" }}>
      <Icon size={13} /> {label}
    </span>
    <span className="font-bold" style={{ color: "var(--app-text)" }}>
      {value}
    </span>
  </div>
);

export const DetailRow = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-center gap-3 text-sm min-w-0">
    <Icon size={14} className="shrink-0" style={{ color: "var(--app-primary)" }} />
    <span className="shrink-0" style={{ color: "var(--app-textSecondary)" }}>
      {label}
    </span>
    <span
      className={`font-semibold truncate ${mono ? "font-mono text-xs" : ""}`}
      style={{ color: "var(--app-text)" }}
    >
      {value}
    </span>
  </div>
);

export const Hint = ({ glyph, color, wide, children }) => (
  <span className="flex items-center gap-2">
    <span
      className={`flex items-center justify-center ${wide ? "px-2 rounded-lg" : "w-6 rounded-full"} h-6 text-[11px] font-bold`}
      style={{
        background: color ? `${color}26` : "rgba(255,255,255,0.08)",
        color: color || "var(--app-text)",
        border: `1px solid ${color || "var(--app-border)"}`,
      }}
    >
      {glyph}
    </span>
    {children}
  </span>
);

export const PadHints = ({ items, gap = "gap-6", className = "mt-4" }) => (
  <div
    className={`flex items-center justify-center ${gap} ${className} text-xs`}
    style={{ color: "var(--app-textSecondary)" }}
  >
    {items.map(({ glyph, color, label }, i) => (
      <Hint key={i} glyph={glyph} color={color}>
        {label}
      </Hint>
    ))}
  </div>
);

export const BPDialog = ({
  role = "dialog",
  maxWidth = "max-w-2xl",
  z = "z-20",
  blur = "blur(6px)",
  dim = "rgba(0,0,0,0.75)",
  onBackdropClick,
  className = "",
  children,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className={`absolute inset-0 ${z} flex items-center justify-center`}
    style={{ background: dim, backdropFilter: blur }}
    onClick={onBackdropClick}
  >
    <motion.div
      role={role}
      aria-modal="true"
      initial={{ scale: 0.95, y: 12 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.95, y: 12 }}
      className={`w-full ${maxWidth} mx-8 rounded-2xl p-8 ${className}`}
      style={{
        background: "var(--app-backgroundSecondary)",
        border: "1px solid var(--app-border)",
      }}
      onClick={onBackdropClick ? (e) => e.stopPropagation() : undefined}
    >
      {children}
    </motion.div>
  </motion.div>
);

export const BPDialogTitle = ({ title, description }) => (
  <>
    <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--app-text)" }}>
      {title}
    </h2>
    <p className="text-sm mb-6" style={{ color: "var(--app-textSecondary)" }}>
      {description}
    </p>
  </>
);
