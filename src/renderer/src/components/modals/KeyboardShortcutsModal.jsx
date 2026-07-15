import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/themeContext";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const Kbd = ({ children }) => (
  <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface border border-border text-[11px] font-mono leading-none text-text-secondary whitespace-nowrap">
    {children}
  </kbd>
);

const ShortcutRow = ({ keys, label }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <span className="text-sm text-text-secondary">{label}</span>
    <div className="flex items-center gap-1 shrink-0">
      {keys.map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </div>
  </div>
);

const Section = ({ title, children }) => {
  const { getTextClass } = useTheme();
  return (
    <div>
      <h3 className={`text-xs font-semibold uppercase tracking-wider mb-1 pb-1.5 border-b border-border ${getTextClass('secondary')}`}>
        {title}
      </h3>
      <div className="divide-y divide-border/40">
        {children}
      </div>
    </div>
  );
};

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { getTextClass } = useTheme();
  const backdropRef = useRef(null);
  const containerRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={backdropRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onMouseDown={(e) => { if (e.target === backdropRef.current) onClose(); }}
        >
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className={`text-lg font-bold ${getTextClass('primary')}`}>
                  {t("keyboard.shortcuts")}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-background-secondary transition-colors text-text-secondary hover:text-text"
                aria-label={t("common.close")}
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 p-6">
              <div className="space-y-5">
                <Section title={t("keyboard.navigation")}>
                  <ShortcutRow keys={["Ctrl", "H"]} label={t("keyboard.ctrlH")} />
                  <ShortcutRow keys={["Ctrl", "G"]} label={t("keyboard.ctrlG")} />
                  <ShortcutRow keys={["Ctrl", "D"]} label={t("keyboard.ctrlD")} />
                  <ShortcutRow keys={["Ctrl", ","]} label={t("keyboard.ctrlComma")} />
                </Section>

                <Section title={t("keyboard.actions")}>
                  <ShortcutRow keys={["Ctrl", "K"]} label={t("keyboard.ctrlK")} />
                  <ShortcutRow keys={["Ctrl", "Shift", "?"]} label={t("keyboard.question")} />
                </Section>
              </div>

              <div className="space-y-5">
                <Section title={t("keyboard.games")}>
                  <ShortcutRow keys={["↵"]} label={t("keyboard.enter")} />
                  <ShortcutRow keys={["Ctrl", "R"]} label={t("keyboard.ctrlR")} />
                  <ShortcutRow keys={["Ctrl", "F"]} label={t("keyboard.ctrlF")} />
                </Section>

                <Section title={t("keyboard.system")}>
                  <ShortcutRow keys={["F11"]} label={t("keyboard.f11")} />
                  <ShortcutRow keys={["F12"]} label={t("keyboard.f12")} />
                  <ShortcutRow keys={["Esc"]} label={t("keyboard.escape")} />
                </Section>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-border bg-background-secondary/50">
              <p className={`text-xs ${getTextClass('secondary')} opacity-60 text-center`}>
                {t("keyboard.question")} — <Kbd>Ctrl</Kbd> <Kbd>Shift</Kbd> <Kbd>?</Kbd>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
