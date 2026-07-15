import { memo } from "react";
import { motion } from "framer-motion";
import { FiPackage, FiTrash2, FiDownload, FiX, FiUser, FiHardDrive } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/authContext";
import Card from "../ui/Card";
import Button from "../ui/Button";

const ModCard = ({ mod, installed, installing, installProgress, onInstall, onUninstall, onDelete }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const getProgressMessage = () => {
    if (!installProgress) return t('mods.installing');
    return installProgress.message || t('mods.installing');
  };

  const handleAction = (fn) => async (e) => {
    e.stopPropagation();
    if (fn) await fn();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <Card
        variant="glass"
        className="relative overflow-hidden transition-all hover:shadow-md"
        style={{
          borderColor: 'var(--app-border)',
          borderWidth: '1px',
          background: 'var(--app-surface)'
        }}
      >
        <div className="p-3 relative z-10">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white transition-all relative"
                style={{
                  background: 'linear-gradient(135deg, var(--app-backgroundSecondary) 0%, var(--app-surface) 100%)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                }}
              >
                <FiPackage
                  className="w-5 h-5 transition-all relative z-10"
                  style={{
                    color: 'var(--app-textSecondary)'
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <h3
                    className="font-semibold text-sm truncate"
                    style={{
                      color: 'var(--app-text)'
                    }}
                  >
                    {mod.name}
                  </h3>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-md flex-shrink-0 font-medium"
                    style={{
                      background: 'var(--app-backgroundSecondary)',
                      color: 'var(--app-textSecondary)',
                      border: '1px solid var(--app-border)'
                    }}
                  >
                    v{mod.version}
                  </span>
                </div>

                {mod.description && (
                  <p
                    className="text-xs mb-2 line-clamp-1"
                    style={{
                      color: 'var(--app-textSecondary)',
                      opacity: 0.9
                    }}
                  >
                    {mod.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium">
                  {mod.author && (
                    <div
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                      style={{
                        color: 'var(--app-textSecondary)',
                        background: 'var(--app-backgroundSecondary)'
                      }}
                    >
                      <FiUser className="w-3 h-3" style={{ color: 'var(--app-primary)' }} />
                      <span>{mod.author}</span>
                    </div>
                  )}
                  {mod.sizeMB && (
                    <div
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                      style={{
                        color: 'var(--app-textSecondary)',
                        background: 'var(--app-backgroundSecondary)'
                      }}
                    >
                      <FiHardDrive className="w-3 h-3" style={{ color: 'var(--app-accent)' }} />
                      <span>{mod.sizeMB.toFixed(1)} MB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {installed ? (
                <Button
                  variant="danger"
                  size="sm"
                  iconOnly
                  icon={<FiTrash2 />}
                  onClick={handleAction(onUninstall)}
                  title={t('mods.uninstall')}
                />
              ) : (
                <>
                  <Button
                    variant="primary"
                    gradient
                    size="sm"
                    iconOnly
                    icon={installing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : <FiDownload />}
                    onClick={handleAction(onInstall)}
                    disabled={installing}
                    title={installing ? getProgressMessage() : t('mods.install')}
                  />
                  {isAdmin && onDelete && (
                    <Button
                      variant="danger"
                      size="sm"
                      iconOnly
                      icon={<FiX />}
                      onClick={handleAction(onDelete)}
                      title={t('mods.deleteFromServer')}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {installing && installProgress && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium" style={{ color: 'var(--app-textSecondary)' }}>
                  {getProgressMessage()}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--app-primary)' }}>
                  {installProgress.progress || 0}%
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--app-backgroundSecondary)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, var(--app-primary), var(--app-secondary))',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${installProgress.progress || 0}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default memo(ModCard);
