import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiX, FiZap, FiAlertCircle, FiTrendingUp, FiAlertTriangle } from "react-icons/fi";
import changelog from "../../data/changelog.json";
import dayjs from "dayjs";

const SECTION_CONFIG = {
  features:     { icon: FiZap,           bg: "bg-primary/20", text: "text-primary", dot: "bg-primary/60",  labelKey: "patchnotes.features" },
  fixes:        { icon: FiAlertCircle,   bg: "bg-success/20", text: "text-success", dot: "bg-success/60",  labelKey: "patchnotes.fixes" },
  improvements: { icon: FiTrendingUp,    bg: "bg-warning/20", text: "text-warning", dot: "bg-warning/60",  labelKey: "patchnotes.improvements" },
  breaking:     { icon: FiAlertTriangle, bg: "bg-error/20",   text: "text-error",   dot: "bg-error/60",    labelKey: "patchnotes.breaking" },
};

const PatchNotesModal = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.split("-")[0] || "en";
  const [selected, setSelected] = useState(changelog[0] || null);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-3xl h-[70vh] rounded-2xl border shadow-2xl flex overflow-hidden"
            style={{ background: "var(--app-backgroundSecondary)", borderColor: "var(--app-border)" }}
          >
            <div
              className="w-48 shrink-0 flex flex-col border-r overflow-hidden"
              style={{ borderColor: "var(--app-border)" }}
            >
              <div className="p-4 border-b" style={{ borderColor: "var(--app-border)" }}>
                <h2 className="text-base font-bold text-text">{t("patchnotes.title")}</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {changelog.length === 0 && (
                  <p className="p-4 text-sm text-text-secondary text-center">{t("patchnotes.empty")}</p>
                )}
                {changelog.map((note) => (
                  <button
                    key={note.version}
                    onClick={() => setSelected(note)}
                    className={`w-full text-left px-4 py-3 border-b transition-colors ${
                      selected?.version === note.version
                        ? "bg-primary/10"
                        : "hover:bg-surface/50"
                    }`}
                    style={{ borderBottomColor: "var(--app-border)" }}
                  >
                    <p className={`text-sm font-semibold ${selected?.version === note.version ? "text-primary" : "text-text"}`}>
                      v{note.version}
                    </p>
                    {note.releaseDate && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {dayjs(note.releaseDate).format("DD MMM YYYY")}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: "var(--app-border)" }}
              >
                <div>
                  {selected && (
                    <>
                      <h3 className="text-lg font-bold text-text">
                        {(() => {
                          const title = selected.title?.[locale] ?? selected.title?.en ?? selected.title;
                          return title ? `v${selected.version} — ${title}` : `v${selected.version}`;
                        })()}
                      </h3>
                      {selected.releaseDate && (
                        <p className="text-xs text-text-secondary mt-0.5">
                          {dayjs(selected.releaseDate).format("DD MMMM YYYY")}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-text-secondary hover:text-text hover:bg-surface transition-colors"
                >
                  <FiX className="text-lg" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {selected?.sections?.map((section, i) => {
                  const cfg = SECTION_CONFIG[section.type] || SECTION_CONFIG.features;
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                          <Icon className={`text-sm ${cfg.text}`} />
                        </div>
                        <h4 className={`text-sm font-bold ${cfg.text}`}>{t(cfg.labelKey)}</h4>
                      </div>
                      <ul className="space-y-1.5 ml-9">
                        {(section.items?.[locale] ?? section.items?.en ?? section.items ?? []).map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-text-secondary">
                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PatchNotesModal;
