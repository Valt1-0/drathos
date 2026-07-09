import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { FiServer, FiCheck, FiUpload, FiMonitor } from "react-icons/fi";
import { useAuth } from "../../contexts/authContext";
import { useConnection } from "../../contexts/connectionContext";
import { Button, Card } from "../ui";
import { getServerLimits, updateServerLimits } from "../../api/server";
import logger from "../../services/logger";

const CONFIGS = [
  { key: "maxModSizeGB", icon: <FiUpload />, labelKey: "settings.maxModSize", ranges: { GB: { min: 0.1, max: 100, step: 0.5 }, MB: { min: 100, max: 102400, step: 100 } } },
  { key: "maxGameSizeGB", icon: <FiMonitor />, labelKey: "settings.maxGameSize", ranges: { GB: { min: 1, max: 2000, step: 1 }, MB: { min: 1000, max: 2048000, step: 500 } } },
];

const toDisplay = (gb, unit) => (unit === "MB" ? Math.round(gb * 1024) : gb);
const toGB = (val, unit) => (unit === "MB" ? val / 1024 : val);

const ServerLimitsCard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isOnline } = useConnection();
  const [serverLimits, setServerLimits] = useState({ maxModSizeGB: 2, maxGameSizeGB: 50 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState({ maxModSizeGB: "GB", maxGameSizeGB: "GB" });
  const [drafts, setDrafts] = useState({ maxModSizeGB: "", maxGameSizeGB: "" });

  useEffect(() => {
    if (user?.role !== "admin" || !isOnline) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const limits = await getServerLimits();
        if (mounted) setServerLimits(limits);
      } catch (error) {
        logger.error("[Settings] Error fetching server limits", error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.role, isOnline]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updated = await updateServerLimits(serverLimits);
      setServerLimits(updated);
      toast.success(t("settings.limitsUpdated"));
    } catch (error) {
      logger.error("[Settings] Error saving server limits", error);
      toast.error(t("common.error"), { description: t("settings.limitsError") });
    } finally {
      setSaving(false);
    }
  }, [serverLimits, t]);

  if (user?.role !== "admin") return null;

  return (
    <div id="setting-server-limits">
      <Card variant="glass" hover>
        <Card.Header
          icon={<FiServer className="text-sm" />}
          title={t("settings.serverLimits")}
          subtitle={t("settings.serverLimitsDesc")}
          action={
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              disabled={saving || !isOnline}
              icon={saving ? <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin border-white" /> : <FiCheck />}
              iconPosition="left"
            >
              {saving ? t("settings.savingLimits") : t("settings.saveLimits")}
            </Button>
          }
        />
        <Card.Body>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--app-primary)", borderTopColor: "transparent" }} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {CONFIGS.map(({ key, icon, labelKey, ranges }) => {
                const unit = units[key];
                const { min, max, step } = ranges[unit];
                const displayVal = toDisplay(serverLimits[key], unit);
                const draft = drafts[key];
                return (
                  <div
                    key={key}
                    className="rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--app-border)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span style={{ color: "var(--app-primary)" }}>{icon}</span>
                        <span className="text-sm font-medium" style={{ color: "var(--app-text)" }}>{t(labelKey)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draft !== "" ? draft : String(unit === "GB" ? parseFloat(displayVal.toFixed(key === "maxModSizeGB" ? 1 : 0)) : displayVal)}
                          onFocus={() => setDrafts((prev) => ({ ...prev, [key]: String(unit === "GB" ? parseFloat(displayVal.toFixed(key === "maxModSizeGB" ? 1 : 0)) : displayVal) }))}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                          onBlur={(e) => {
                            const parsed = parseFloat(e.target.value.replace(",", "."));
                            const clamped = isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed));
                            setServerLimits((prev) => ({ ...prev, [key]: toGB(clamped, unit) }));
                            setDrafts((prev) => ({ ...prev, [key]: "" }));
                          }}
                          disabled={saving || !isOnline}
                          className="w-16 text-sm font-bold text-right bg-transparent outline-none"
                          style={{ color: "var(--app-primary)", borderBottom: "1px solid var(--app-border)" }}
                        />
                        <button
                          onClick={() => {
                            setUnits((prev) => ({ ...prev, [key]: unit === "GB" ? "MB" : "GB" }));
                            setDrafts((prev) => ({ ...prev, [key]: "" }));
                          }}
                          disabled={saving || !isOnline}
                          className="text-xs font-semibold px-1.5 py-0.5 rounded-md transition-colors"
                          style={{ color: "var(--app-primary)", background: "rgba(99,102,241,0.15)" }}
                        >
                          {unit}
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={min} max={max} step={step}
                      value={Math.min(max, Math.max(min, displayVal))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setServerLimits((prev) => ({ ...prev, [key]: toGB(val, unit) }));
                        setDrafts((prev) => ({ ...prev, [key]: "" }));
                      }}
                      disabled={saving || !isOnline}
                      className="w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ accentColor: "var(--app-primary)", height: "4px" }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default ServerLimitsCard;
