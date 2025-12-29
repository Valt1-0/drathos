import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FaBars,
  FaTrash,
  FaGamepad,
  FaDownload,
  FaGear,
} from "react-icons/fa6";
import { FaHome, FaFolderOpen } from "react-icons/fa";
import { FiX, FiLogOut, FiUser } from "react-icons/fi";
import { Link, useLocation } from "react-router";
import { useAuth } from "../contexts/authContext";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "./modals/ConfirmationModal";
import syncQueue from "../utils/syncQueue";

const Drawer = ({ children }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { label: t('nav.home'), icon: FaHome, path: "/" },
    { label: t('nav.library'), icon: FaGamepad, path: "/games" },
    { label: t('nav.collections'), icon: FaFolderOpen, path: "/collections" },
    { label: t('nav.downloads'), icon: FaDownload, path: "/download" },
    { label: t('nav.settings'), icon: FaGear, path: "/settings" },
  ];

  // Listen to sync queue changes
  useEffect(() => {
    const updatePendingCount = (count) => {
      setPendingSyncs(count);
    };

    // Initial load
    setPendingSyncs(syncQueue.getPendingCount());

    // Subscribe to changes
    const listenerId = syncQueue.addListener(updatePendingCount);

    return () => {
      syncQueue.removeListener(listenerId);
    };
  }, []);

  const handlerDeleteUserData = async () => {
    await window.store.clear();
    window.api.reloadApp();
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: isOpen ? 280 : 80 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="relative flex flex-col shadow-2xl"
        style={{
          overflow: 'hidden',
          WebkitAppRegion: 'no-drag',
          background: 'var(--app-backgroundSecondary)',
          borderRight: '1px solid var(--app-border)',
        }}
      >

        {/* Header with toggle button */}
        <motion.div
          className="relative z-10 flex items-center"
          style={{ borderBottom: '1px solid var(--app-border)' }}
          animate={{
            justifyContent: isOpen ? "flex-end" : "center",
            padding: isOpen ? "20px" : "16px"
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            className="p-3 rounded-xl flex items-center justify-center transition-all duration-300"
            style={{
              background: 'var(--app-surface)',
              color: 'var(--app-primary)',
            }}
            whileHover={{
              scale: 1.05,
              boxShadow: '0 4px 12px var(--app-primary)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiX className="text-xl" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FaBars className="text-xl" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>

        {/* Navigation Menu */}
        <nav
          className={`relative z-10 flex-1 py-6 space-y-2 ${isOpen ? "px-3" : "px-2"}`}
          style={{ overflowY: 'auto', overflowX: 'hidden' }}
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.path);

            return (
              <Link key={index} to={item.path}>
                <motion.div
                  className="group relative overflow-hidden rounded-xl border"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, var(--app-primary) 0%, var(--app-secondary) 100%)'
                      : 'transparent',
                    borderColor: isActive ? 'var(--app-primary)' : 'transparent',
                    opacity: isActive ? 0.9 : 1,
                  }}
                  whileHover={{
                    scale: 1.03,
                    backgroundColor: isActive ? undefined : 'var(--app-surface)',
                  }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  {/* Active glow indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                      style={{
                        background: 'linear-gradient(to bottom, var(--app-accent), var(--app-primary))',
                        boxShadow: '0 0 8px var(--app-primary)',
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}

                  <div className={`flex items-center py-3 transition-all duration-200 ${
                    isOpen ? "px-4" : "justify-center"
                  }`}>
                    <div className="relative">
                      <motion.div
                        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-all duration-200"
                        style={{
                          background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'var(--app-surface)',
                          color: isActive ? 'var(--app-text)' : 'var(--app-textSecondary)',
                        }}
                        whileHover={{
                          backgroundColor: isActive ? undefined : 'var(--app-primary)',
                          color: 'var(--app-text)',
                        }}
                      >
                        <Icon className="text-lg" />
                      </motion.div>
                      {/* Sync badge for Settings */}
                      {item.path === "/settings" && pendingSyncs > 0 && (
                        <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-warning text-white text-xs font-bold rounded-full animate-pulse">
                          {pendingSyncs}
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.span
                          initial={{ opacity: 0, x: -20 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            transition: {
                              opacity: { duration: 0.3, delay: 0.15 },
                              x: { duration: 0.3, delay: 0.15, ease: [0.4, 0, 0.2, 1] }
                            }
                          }}
                          exit={{
                            opacity: 0,
                            x: -10,
                            transition: {
                              duration: 0.2,
                              ease: [0.4, 0, 1, 1]
                            }
                          }}
                          className={`ml-4 font-medium whitespace-nowrap ${
                            isActive ? "text-text" : "text-text-secondary group-hover:text-text"
                          }`}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section - User Info & Actions */}
        <motion.div
          className="relative z-10 space-y-2"
          style={{ borderTop: '1px solid var(--app-border)' }}
          animate={{
            padding: isOpen ? "12px" : "8px"
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Delete Data Button */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="group relative overflow-hidden w-full rounded-xl transition-all duration-300"
            style={{ border: '1px solid var(--app-border)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--app-error)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--app-border)';
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-error/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <motion.div
              className="relative flex items-center py-3"
              animate={{
                paddingLeft: isOpen ? "16px" : "8px",
                paddingRight: isOpen ? "16px" : "8px",
                justifyContent: isOpen ? "flex-start" : "center"
              }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300" style={{ background: 'var(--app-surface)', color: 'var(--app-textSecondary)' }}>
                <FaTrash className="text-lg group-hover:text-error" />
              </div>
              <AnimatePresence mode="wait">
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="ml-4 font-medium text-text-secondary group-hover:text-error"
                  >
                    {t('nav.clearData')}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </button>

          {/* User Profile */}
          {user && (
            <motion.div
              className="relative overflow-hidden rounded-xl"
              style={{
                background: 'var(--app-surface)',
                border: '1px solid var(--app-border)'
              }}
              animate={{
                padding: isOpen ? "12px" : "8px"
              }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
              <motion.div
                className="relative flex items-center"
                animate={{
                  gap: isOpen ? "12px" : "0px",
                  justifyContent: isOpen ? "flex-start" : "center"
                }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt="User Avatar"
                    className={`rounded-lg border-2 object-cover transition-all duration-300 ${
                      isOpen ? "w-12 h-12" : "w-10 h-10"
                    }`}
                    style={{ borderColor: 'var(--app-border)' }}
                  />
                ) : (
                  <div
                    className={`flex items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary transition-all duration-300 ${
                      isOpen ? "w-12 h-12" : "w-10 h-10"
                    }`}
                  >
                    <FiUser className="text-text text-lg" />
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm font-semibold text-text truncate">
                        {user.username}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {user.role || t('nav.userOnline')}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 bg-background overflow-hidden">
        {children}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handlerDeleteUserData}
        title={t('modals.clearData.title')}
        message={t('modals.clearData.message')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        confirmColor="red"
        icon={FaTrash}
      />
    </div>
  );
};

export default Drawer;
