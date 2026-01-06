import React from "react";
import { motion } from "framer-motion";
import { FiPackage, FiTrash2, FiToggleLeft, FiToggleRight, FiDownload } from "react-icons/fi";
import { useTheme } from "../../contexts/themeContext";
import Card from "../ui/Card";
import Button from "../ui/Button";

const MOD_TYPE_COLORS = {
  gameplay: "var(--app-primary)",
  visual: "var(--app-secondary)",
  audio: "var(--app-success)",
  "total-conversion": "var(--app-error)",
  other: "var(--app-textSecondary)",
};

const ModCard = ({ mod, installed, enabled, onInstall, onToggle, onUninstall }) => {
  const { getTextClass } = useTheme();

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (installed && onToggle) {
      await onToggle(!enabled);
    }
  };

  const handleUninstall = async (e) => {
    e.stopPropagation();
    if (installed && onUninstall) {
      await onUninstall();
    }
  };

  const handleInstall = async (e) => {
    e.stopPropagation();
    if (!installed && onInstall) {
      await onInstall();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card
        variant="glass"
        gradient={installed && enabled}
        gradientColor="primary"
        className="relative overflow-hidden"
      >
        {installed && enabled && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'var(--app-primary)', opacity: 0.05 }}
          />
        )}
        <div className="p-4 relative z-10">
          <div className="flex items-start justify-between gap-3">
            {/* Mod Info */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                style={{
                  background: installed && enabled ? 'var(--app-gradient-primary)' : 'var(--app-surface)'
                }}
              >
                <FiPackage
                  className="w-6 h-6"
                  style={{
                    color: installed && enabled ? 'white' : 'var(--app-textSecondary)'
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate" style={{ color: 'var(--app-text)' }}>
                    {mod.name}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: installed && enabled ? 'var(--app-primary)' : 'var(--app-surface)',
                      color: installed && enabled ? 'white' : 'var(--app-textSecondary)',
                      opacity: installed && enabled ? 0.8 : 1
                    }}
                  >
                    v{mod.version}
                  </span>
                  {mod.modType && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: 'var(--app-surface)',
                        color: MOD_TYPE_COLORS[mod.modType] || MOD_TYPE_COLORS.other
                      }}
                    >
                      {mod.modType}
                    </span>
                  )}
                </div>

                {mod.description && (
                  <p className="text-sm mb-2 line-clamp-2" style={{ color: 'var(--app-textSecondary)' }}>
                    {mod.description}
                  </p>
                )}

                <div className="text-xs flex items-center gap-3" style={{ color: 'var(--app-textTertiary)' }}>
                  {mod.author && <span>Par {mod.author}</span>}
                  {mod.sizeMB && <span>{mod.sizeMB.toFixed(1)} MB</span>}
                  {mod.downloads !== undefined && <span>{mod.downloads} téléchargements</span>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {installed ? (
                <>
                  {/* Toggle Button */}
                  <Button
                    variant={enabled ? "primary" : "ghost"}
                    size="sm"
                    iconOnly
                    icon={enabled ? <FiToggleRight /> : <FiToggleLeft />}
                    onClick={handleToggle}
                    title={enabled ? 'Désactiver le mod' : 'Activer le mod'}
                  />

                  {/* Delete Button */}
                  <Button
                    variant="danger"
                    size="sm"
                    iconOnly
                    icon={<FiTrash2 />}
                    onClick={handleUninstall}
                    title="Désinstaller le mod"
                  />
                </>
              ) : (
                /* Install Button */
                <Button
                  variant="primary"
                  gradient={true}
                  size="sm"
                  icon={<FiDownload />}
                  onClick={handleInstall}
                  title="Installer le mod"
                >
                  Installer
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default ModCard;
