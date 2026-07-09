import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FiMonitor, FiCheck } from "react-icons/fi";
import { useTheme } from "../../contexts/themeContext";
import { getThemesList } from "../../config/themes";
import { Card } from "../ui";

const ThemeSwatch = ({ themeOption, isActive, onSelect, children }) => (
  <motion.button
    whileHover={{ scale: 1.03, y: -2 }}
    whileTap={{ scale: 0.97 }}
    onClick={onSelect}
    className={`relative p-3 rounded-xl border-2 transition-all overflow-hidden ${isActive ? "border-secondary shadow-lg shadow-secondary/30" : "border-white/10 hover:border-secondary/50"}`}
    style={{
      background: isActive
        ? `linear-gradient(135deg, ${themeOption.colors.primary}15 0%, ${themeOption.colors.secondary}15 100%)`
        : "rgba(255, 255, 255, 0.03)",
    }}
  >
    <div className="flex gap-1.5 mb-2 justify-center">
      <div className="w-5 h-5 rounded-full shadow-lg" style={{ background: themeOption.gradients.primary, boxShadow: `0 0 8px ${themeOption.colors.primary}60` }} />
      <div className="w-5 h-5 rounded-full shadow-lg" style={{ background: themeOption.gradients.secondary, boxShadow: `0 0 8px ${themeOption.colors.secondary}60` }} />
    </div>
    {children}
    {isActive && (
      <motion.div
        layoutId="activeThemeIndicator"
        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
        style={{ background: themeOption.gradients.primary, boxShadow: `0 0 8px ${themeOption.colors.primary}80` }}
      >
        <FiCheck className="text-xs" style={{ color: "#FFFFFF" }} />
      </motion.div>
    )}
  </motion.button>
);

// onOpenModal(themeToEdit | null) — the parent owns the CustomThemeModal
const ThemeCard = ({ onOpenModal }) => {
  const { t } = useTranslation();
  const { currentTheme, changeTheme: changeAppTheme, customThemes, deleteCustomTheme } = useTheme();
  const themesList = getThemesList();

  return (
    <div id="setting-theme">
      <Card variant="glass" hover>
        <Card.Header
          icon={<FiMonitor className="text-sm" />}
          title={t("settings.colorTheme")}
          subtitle={t("settings.colorThemeDesc")}
        />
        <Card.Body>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {themesList.map((themeOption) => (
              <ThemeSwatch
                key={themeOption.id}
                themeOption={themeOption}
                isActive={currentTheme === themeOption.id}
                onSelect={() => changeAppTheme(themeOption.id)}
              >
                <div className="text-center">
                  <div className="font-semibold text-xs" style={{ color: "var(--app-text)" }}>{themeOption.name}</div>
                </div>
              </ThemeSwatch>
            ))}

            {customThemes.map((themeOption) => {
              const isActive = currentTheme === themeOption.id;
              return (
                <ThemeSwatch
                  key={themeOption.id}
                  themeOption={themeOption}
                  isActive={isActive}
                  onSelect={() => changeAppTheme(themeOption.id)}
                >
                  <div className="text-center">
                    <div className="font-semibold text-xs truncate" style={{ color: "var(--app-text)" }}>{themeOption.name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--app-textSecondary)" }}>{t("settings.customTheme")}</div>
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenModal(themeOption); }}
                      className="px-3 py-1.5 rounded-lg bg-primary/80 text-white text-xs font-medium hover:bg-primary transition-colors"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteCustomTheme(themeOption.id); if (isActive) changeAppTheme("default"); }}
                      className="px-3 py-1.5 rounded-lg bg-error/80 text-white text-xs font-medium hover:bg-error transition-colors"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </ThemeSwatch>
              );
            })}

            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenModal(null)}
              className="relative p-3 rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 min-h-20"
            >
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-current flex items-center justify-center text-text-secondary">
                <span className="text-lg leading-none">+</span>
              </div>
              <div className="text-xs font-medium text-text-secondary text-center">{t("settings.addCustomTheme")}</div>
            </motion.button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ThemeCard;
