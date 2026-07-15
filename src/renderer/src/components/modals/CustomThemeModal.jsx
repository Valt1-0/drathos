import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiSave, FiDroplet } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/themeContext";
import { buildCustomTheme } from "../../config/themes";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const DEFAULT_COLORS = {
  primary: "#6366F1",
  secondary: "#8B5CF6",
  background: "#0A0A0A",
  surface: "#1A1A1A",
  text: "#FAFAFA",
};

const ColorSwatch = ({ label, value, onChange }) => (
  <div className="group relative rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all">
    <div className="relative h-14" style={{ backgroundColor: value }}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-crosshair"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
          <FiDroplet className="text-white text-xs" />
          <span className="text-white text-[10px] font-medium">Pick</span>
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-6 bg-linear-to-t from-black/30 to-transparent" />
    </div>

    <div className="bg-background px-2.5 py-2 flex items-center justify-between gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary/70 shrink-0">
        {label}
      </span>
      <input
        type="text"
        value={value.toUpperCase()}
        onChange={(e) => {
          let v = e.target.value;
          if (!v.startsWith("#")) v = "#" + v;
          if (/^#[0-9A-Fa-f]{0,6}$/.test(v) && v.length <= 7) onChange(v);
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-16 text-[10px] font-mono text-text bg-transparent focus:outline-none text-right"
        maxLength={7}
        spellCheck={false}
      />
    </div>
  </div>
);

const MiniPreview = ({ colors }) => {
  const { primary, secondary, background, surface, text } = colors;
  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{ background, borderColor: `${primary}30` }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-2 border-b"
        style={{ background: surface, borderColor: `${text}10` }}
      >
        <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
        <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
        <div className="w-2 h-2 rounded-full bg-[#28c840]" />
        <div className="flex-1 mx-2 h-1.5 rounded-full" style={{ background: `${text}15` }} />
        <div
          className="h-4 w-12 rounded"
          style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})`, opacity: 0.8 }}
        />
      </div>

      <div className="flex" style={{ minHeight: 168 }}>
        <div
          className="w-9 flex flex-col items-center pt-3 pb-2 gap-2 border-r shrink-0"
          style={{ background: surface, borderColor: `${text}08` }}
        >
          {[primary, secondary, text, text, text].map((c, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-md"
              style={{
                background: i === 0 ? `${primary}30` : i === 1 ? `${secondary}20` : `${text}10`,
                border: i === 0 ? `1.5px solid ${primary}60` : "none",
              }}
            />
          ))}
          <div className="mt-auto w-5 h-5 rounded-full" style={{ background: `${primary}25` }} />
        </div>

        <div className="flex-1 p-3 space-y-2 overflow-hidden">
          <div
            className="h-6 rounded-lg w-full"
            style={{ background: `${text}08`, border: `1px solid ${text}12` }}
          />

          {[
            { accent: primary, w: "70%" },
            { accent: secondary, w: "55%" },
          ].map(({ accent, w }, i) => (
            <div
              key={i}
              className="rounded-lg p-2 flex items-center gap-2"
              style={{ background: surface, border: `1px solid ${text}08` }}
            >
              <div
                className="w-8 h-8 rounded-md shrink-0"
                style={{ background: `linear-gradient(135deg, ${accent}cc, ${accent}55)` }}
              />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-1.5 rounded-full" style={{ background: `${text}45`, width: w }} />
                <div className="h-1.5 rounded-full w-1/3" style={{ background: `${text}20` }} />
              </div>
              <div
                className="shrink-0 px-2 py-1 rounded-md text-[8px] font-bold"
                style={{ background: `${accent}20`, color: accent }}
              >
                ▶
              </div>
            </div>
          ))}

          <div
            className="rounded-lg p-2"
            style={{ background: surface, border: `1px solid ${text}08` }}
          >
            <div className="flex justify-between mb-1.5">
              <div className="h-1.5 rounded-full w-1/3" style={{ background: `${text}25` }} />
              <div className="h-1.5 rounded-full w-8" style={{ background: `${primary}40` }} />
            </div>
            <div className="h-1.5 rounded-full w-full" style={{ background: `${text}12` }}>
              <div
                className="h-full rounded-full"
                style={{ width: "62%", background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CustomThemeModal({ isOpen, onClose, editTheme = null }) {
  const { t } = useTranslation();
  const { saveCustomTheme, changeTheme } = useTheme();
  const containerRef = useFocusTrap(isOpen);

  const [name, setName] = useState("");
  const [colors, setColors] = useState(DEFAULT_COLORS);

  useEffect(() => {
    if (isOpen) {
      setName(editTheme?.name ?? "");
      setColors(editTheme?.userColors ?? DEFAULT_COLORS);
    }
  }, [isOpen, editTheme]);

  const setColor = (key, value) => setColors((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (Object.values(colors).some(c => !/^#[0-9A-Fa-f]{6}$/.test(c))) return;
    const id = editTheme?.id ?? `custom_${Date.now()}`;
    const theme = buildCustomTheme(id, name.trim() || t("settings.customTheme"), colors);
    saveCustomTheme(theme);
    changeTheme(id);
    onClose();
  };

  const swatches = [
    { key: "primary",    label: t("settings.primaryColor") },
    { key: "secondary",  label: t("settings.secondaryColor") },
    { key: "background", label: t("settings.backgroundColor") },
    { key: "surface",    label: t("settings.surfaceColor") },
    { key: "text",       label: t("settings.textColor") },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
                >
                  <FiDroplet className="text-white text-base" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text leading-none">
                    {editTheme ? t("settings.editTheme") : t("settings.createTheme")}
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {t("settings.colorThemeDesc")}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-background-secondary transition-colors text-text-secondary hover:text-text"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="px-6 pt-5 pb-0">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("settings.themeNamePlaceholder")}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text font-semibold text-base focus:outline-none focus:border-primary placeholder:text-text-secondary/30 transition-colors"
                maxLength={32}
              />
            </div>

            <div className="grid grid-cols-2 gap-5 p-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary/60 mb-3">
                  {t("settings.colors")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {swatches.slice(0, 4).map(({ key, label }) => (
                    <ColorSwatch
                      key={key}
                      label={label}
                      value={colors[key]}
                      onChange={(v) => setColor(key, v)}
                    />
                  ))}
                </div>
                <div className="mt-2">
                  <ColorSwatch
                    label={swatches[4].label}
                    value={colors[swatches[4].key]}
                    onChange={(v) => setColor(swatches[4].key, v)}
                  />
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary/60 mb-3">
                  {t("settings.preview")}
                </p>
                <MiniPreview colors={colors} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background/40">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text hover:bg-background-secondary transition-colors"
              >
                {t("common.cancel")}
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  boxShadow: `0 4px 16px ${colors.primary}40`,
                }}
              >
                <FiSave className="text-sm" />
                {t("settings.saveTheme")}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
