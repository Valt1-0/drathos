import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiTerminal, FiCheck, FiMonitor } from "react-icons/fi";

// Per-game launch options (Steam-style): extra arguments appended at spawn
// time, and a target display (Unity → -monitor N, others → window mover).
const LaunchOptions = ({ gameId }) => {
  const { t } = useTranslation();
  const [args, setArgs] = useState("");
  const [display, setDisplay] = useState(0);
  const [displays, setDisplays] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    window.store.get("gameLaunchOptions").then((opts) => {
      if (!mounted) return;
      setArgs(opts?.[gameId]?.args || "");
      setDisplay(opts?.[gameId]?.display || 0);
    });
    window.api.app.getDisplays().then((d) => mounted && setDisplays(d || [])).catch(() => {});
    return () => {
      mounted = false;
    };
  }, [gameId]);

  const persist = async (patch) => {
    const opts = (await window.store.get("gameLaunchOptions")) || {};
    const entry = { ...(opts[gameId] || {}), ...patch };
    if (!entry.args?.trim()) delete entry.args;
    if (!entry.display) delete entry.display;
    if (Object.keys(entry).length > 0) opts[gameId] = entry;
    else delete opts[gameId];
    await window.store.set("gameLaunchOptions", opts);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const save = async () => {
    const trimmed = args.trim();
    setArgs(trimmed);
    await persist({ args: trimmed });
  };

  const changeDisplay = async (value) => {
    const n = Number(value);
    setDisplay(n);
    await persist({ display: n });
  };

  return (
    <div className="rounded-xl border border-border/50 bg-surface/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <FiTerminal className="w-3.5 h-3.5 text-text-secondary" />
        <span className="text-sm font-medium text-text">{t("games.launchArgs")}</span>
        {saved && (
          <span className="flex items-center gap-1 text-[11px] text-success">
            <FiCheck className="w-3 h-3" />
            {t("games.launchArgsSaved")}
          </span>
        )}
      </div>
      <input
        type="text"
        value={args}
        onChange={(e) => setArgs(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        placeholder={t("games.launchArgsPlaceholder")}
        spellCheck={false}
        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-text font-mono outline-none focus:border-primary/60 transition-colors"
      />
      <p className="mt-1.5 text-[11px] text-text-secondary/70">{t("games.launchArgsHint")}</p>

      {displays.length > 1 && (
        <div className="mt-3 flex items-center gap-2">
          <FiMonitor className="w-3.5 h-3.5 text-text-secondary shrink-0" />
          <span className="text-xs text-text-secondary">{t("games.launchDisplay")}</span>
          <select
            value={display}
            onChange={(e) => changeDisplay(e.target.value)}
            className="flex-1 px-2 py-1.5 rounded-lg bg-background border border-border text-xs text-text outline-none focus:border-primary/60"
          >
            <option value={0}>{t("games.launchDisplayAuto")}</option>
            {displays.map((d) => (
              <option key={d.index} value={d.index}>
                {t("games.launchDisplayN", { n: d.index, res: `${d.width}×${d.height}` })}
                {d.primary ? ` — ${t("games.launchDisplayPrimary")}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default LaunchOptions;
