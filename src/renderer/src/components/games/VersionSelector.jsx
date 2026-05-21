import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { FiPackage, FiChevronDown, FiCheck } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/themeContext";
import { usePortalDropdown } from "./GameStatusSelector";

const VersionSelector = ({ currentVersion, versions, onSelectVersion }) => {
  const { isOpen, setIsOpen, position, buttonRef, dropdownRef } =
    usePortalDropdown("right");
  const { getTextClass } = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <motion.button
        ref={buttonRef}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-lg backdrop-blur-sm border text-sm font-medium bg-accent/20 border-accent/30 text-accent cursor-pointer hover:bg-accent/30 transition-all focus:outline-none focus:ring-2 focus:ring-accent/50"
      >
        <FiPackage className="w-3.5 h-3.5" />
        <span>v{currentVersion.version}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <FiChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="version-dropdown"
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed",
                top: `${position.top}px`,
                left: `${position.left}px`,
                zIndex: 9999,
              }}
              className="min-w-[180px] rounded-xl overflow-hidden bg-surface border border-border shadow-2xl backdrop-blur-xl"
            >
              <div className="px-3 py-2 border-b border-border bg-background/50">
                <p className={`text-xs font-semibold ${getTextClass("secondary")}`}>
                  {t("games.versionsAvailable")}
                </p>
              </div>

              <div className="py-1 max-h-64 overflow-y-auto overflow-x-hidden">
                {versions.map((version) => {
                  const isSelected = version._id === currentVersion._id;
                  return (
                    <motion.button
                      key={version._id}
                      whileHover={{ scale: 1.01, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (!isSelected && onSelectVersion) {
                          onSelectVersion(version);
                          setIsOpen(false);
                        }
                      }}
                      className={`group w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-accent/10"
                          : "hover:bg-accent/15 hover:shadow-lg hover:border-l-2 hover:border-accent"
                      }`}
                    >
                      <motion.div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? "bg-accent/20 text-accent"
                            : "bg-background text-accent/60 group-hover:bg-accent/20 group-hover:text-accent group-hover:scale-110"
                        }`}
                      >
                        <FiPackage className="w-4 h-4" />
                      </motion.div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold transition-colors ${
                              isSelected
                                ? "text-accent"
                                : `${getTextClass("primary")} group-hover:text-accent`
                            }`}
                          >
                            v{version.version}
                          </span>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center"
                            >
                              <FiCheck className="w-3 h-3 text-accent" />
                            </motion.div>
                          )}
                        </div>
                        {version.sizeMB && (
                          <p className={`text-xs ${getTextClass("secondary")}`}>
                            {version.sizeMB} MB
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="flex-shrink-0"
                        >
                          <FiCheck className="w-5 h-5 text-accent" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="px-3 py-2 border-t border-border bg-background/50">
                <p className={`text-xs font-medium ${getTextClass("secondary")}`}>
                  {t("games.versionCount", { count: versions.length })}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

export default VersionSelector;
