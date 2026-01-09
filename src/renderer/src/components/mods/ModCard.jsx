import { useState, memo } from "react";
import { motion } from "framer-motion";
import { FiPackage, FiTrash2, FiToggleLeft, FiToggleRight, FiDownload, FiShield, FiX, FiUser, FiHardDrive, FiFolder } from "react-icons/fi";
import { useAuth } from "../../contexts/authContext";
import Card from "../ui/Card";
import Button from "../ui/Button";

const ModCard = ({ mod, installed, enabled, installing, onInstall, onToggle, onUninstall, onVerifyIntegrity, onDelete }) => {
  const { user } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const isAdmin = user?.role === 'admin';

  const handleAction = (fn) => async (e) => {
    e.stopPropagation();
    if (fn) await fn();
  };

  const handleVerifyIntegrity = handleAction(async () => {
    if (installed && onVerifyIntegrity) {
      setVerifying(true);
      await onVerifyIntegrity();
      setVerifying(false);
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ scale: 1.005, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        variant="glass"
        gradient={installed && enabled}
        gradientColor="primary"
        className="relative overflow-hidden transition-all hover:shadow-xl"
        style={{
          borderColor: installed && enabled ? 'var(--app-primary)' : 'var(--app-border)',
          borderWidth: installed && enabled ? '2px' : '1px',
          background: installed && enabled
            ? 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-backgroundSecondary) 100%)'
            : 'var(--app-surface)'
        }}
      >
        {installed && enabled && (
          <>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'var(--app-gradient-primary)',
                opacity: 0.08,
                mixBlendMode: 'overlay'
              }}
            />
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background: 'var(--app-gradient-primary)',
                boxShadow: '0 2px 10px var(--app-primary)60'
              }}
            />
          </>
        )}
        <div className="p-5 relative z-10">
          <div className="flex items-start justify-between gap-3">
            {/* Mod Info */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-white transition-all relative"
                style={{
                  background: installed && enabled
                    ? 'var(--app-gradient-primary)'
                    : 'linear-gradient(135deg, var(--app-backgroundSecondary) 0%, var(--app-surface) 100%)',
                  boxShadow: installed && enabled
                    ? '0 4px 16px var(--app-primary)40, 0 0 0 1px var(--app-primary)20'
                    : '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                {installed && enabled && (
                  <div
                    className="absolute inset-0 rounded-xl animate-pulse"
                    style={{
                      background: 'var(--app-gradient-primary)',
                      opacity: 0.3
                    }}
                  />
                )}
                <FiPackage
                  className="w-7 h-7 transition-all relative z-10"
                  style={{
                    color: installed && enabled ? 'white' : 'var(--app-textSecondary)',
                    filter: installed && enabled ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : 'none'
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3
                    className="font-bold text-lg truncate"
                    style={{
                      color: 'var(--app-text)',
                      textShadow: installed && enabled ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {mod.name}
                  </h3>
                  <span
                    className="text-xs px-3 py-1 rounded-full flex-shrink-0 font-semibold"
                    style={{
                      background: installed && enabled
                        ? 'linear-gradient(135deg, var(--app-primary) 0%, var(--app-primaryHover) 100%)'
                        : 'var(--app-backgroundSecondary)',
                      color: installed && enabled ? 'white' : 'var(--app-textSecondary)',
                      border: `1px solid ${installed && enabled ? 'var(--app-primary)40' : 'var(--app-border)'}`,
                      boxShadow: installed && enabled ? '0 2px 8px var(--app-primary)30' : 'none'
                    }}
                  >
                    v{mod.version}
                  </span>
                  {installed && enabled && (
                    <span
                      className="text-xs px-3 py-1 rounded-full flex-shrink-0 font-semibold backdrop-blur-sm"
                      style={{
                        background: 'linear-gradient(135deg, var(--app-success) 0%, var(--app-success)CC 100%)',
                        color: 'white',
                        border: '1px solid var(--app-success)40',
                        boxShadow: '0 2px 12px var(--app-success)40, 0 0 20px var(--app-success)20',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }}
                    >
                      ● ACTIF
                    </span>
                  )}
                </div>

                {mod.description && (
                  <p
                    className="text-sm mb-3 line-clamp-2 leading-relaxed"
                    style={{
                      color: 'var(--app-textSecondary)',
                      opacity: 0.9
                    }}
                  >
                    {mod.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium">
                  {mod.author && (
                    <div
                      className="flex items-center gap-2 px-2 py-1 rounded-md transition-colors hover:bg-opacity-50"
                      style={{
                        color: 'var(--app-textSecondary)',
                        background: 'var(--app-backgroundSecondary)'
                      }}
                    >
                      <FiUser className="w-3.5 h-3.5" style={{ color: 'var(--app-primary)' }} />
                      <span>{mod.author}</span>
                    </div>
                  )}
                  {mod.sizeMB && (
                    <div
                      className="flex items-center gap-2 px-2 py-1 rounded-md"
                      style={{
                        color: 'var(--app-textSecondary)',
                        background: 'var(--app-backgroundSecondary)'
                      }}
                    >
                      <FiHardDrive className="w-3.5 h-3.5" style={{ color: 'var(--app-accent)' }} />
                      <span>{mod.sizeMB.toFixed(1)} MB</span>
                    </div>
                  )}
                  {mod.installPath && installed && (
                    <div
                      className="flex items-center gap-2 px-2 py-1 rounded-md"
                      style={{
                        color: 'var(--app-textSecondary)',
                        background: 'var(--app-backgroundSecondary)'
                      }}
                    >
                      <FiFolder className="w-3.5 h-3.5" style={{ color: 'var(--app-secondary)' }} />
                      <span>{mod.installPath}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {installed ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={verifying ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : <FiShield />}
                    onClick={handleVerifyIntegrity}
                    disabled={verifying}
                    title="Vérifier l'intégrité"
                  />
                  <Button
                    variant={enabled ? "primary" : "ghost"}
                    size="sm"
                    iconOnly
                    icon={enabled ? <FiToggleRight /> : <FiToggleLeft />}
                    onClick={handleAction(() => onToggle?.(!enabled))}
                    title={enabled ? 'Désactiver' : 'Activer'}
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    iconOnly
                    icon={<FiTrash2 />}
                    onClick={handleAction(onUninstall)}
                    title="Désinstaller"
                  />
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    gradient
                    size="sm"
                    icon={installing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : <FiDownload />}
                    onClick={handleAction(onInstall)}
                    disabled={installing}
                    title={installing ? "Installation en cours..." : "Installer"}
                  >
                    {installing ? "Installation..." : "Installer"}
                  </Button>
                  {isAdmin && onDelete && (
                    <Button
                      variant="danger"
                      size="sm"
                      iconOnly
                      icon={<FiX />}
                      onClick={handleAction(onDelete)}
                      title="Supprimer du serveur"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default memo(ModCard);
