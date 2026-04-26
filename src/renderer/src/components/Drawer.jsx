import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FaBars,
  FaTrash,
  FaGamepad,
  FaDownload,
  FaGear,
} from "react-icons/fa6";
import { FaHome, FaFolderOpen } from "react-icons/fa";
import { FiX, FiPackage, FiUsers } from "react-icons/fi";
import { Link, useLocation } from "react-router";
import { useAuth } from "../contexts/authContext";
import { useConnection } from "../contexts/connectionContext";
import ProfileAvatar from "./ProfileAvatar";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "./modals/ConfirmationModal";
import syncQueue from "../utils/syncQueue";

const Drawer = ({ children }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const { user } = useAuth();
  const { isOnline } = useConnection();
  const location = useLocation();

  const menuItems = useMemo(() => [
    { label: t('nav.home'), icon: FaHome, path: "/" },
    { label: t('nav.library'), icon: FaGamepad, path: "/games" },
    { label: t('nav.collections'), icon: FaFolderOpen, path: "/collections" },
    { label: t('nav.downloads'), icon: FaDownload, path: "/download" },
    { label: t('nav.settings'), icon: FaGear, path: "/settings" },
    ...(user?.role === 'admin' ? [
      { label: t('nav.mods'), icon: FiPackage, path: "/mods", requiresServer: true },
      { label: t('nav.users'), icon: FiUsers, path: "/users", requiresServer: true },
    ] : []),
  ], [t, user?.role]);

  // Listen to sync queue changes
  useEffect(() => {
    setPendingSyncs(syncQueue.getPendingCount());
    const listenerId = syncQueue.addListener(setPendingSyncs);
    return () => syncQueue.removeListener(listenerId);
  }, []);

  const toggleDrawer = useCallback(() => setIsOpen(prev => !prev), []);
  const openDeleteModal = useCallback(() => setShowDeleteModal(true), []);
  const closeDeleteModal = useCallback(() => setShowDeleteModal(false), []);

  const handlerDeleteUserData = useCallback(async () => {
    await window.store.clear();
    window.api.reloadApp();
  }, []);

  const isActiveRoute = useCallback((path) => location.pathname === path, [location.pathname]);

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
            onClick={toggleDrawer}
            aria-label={isOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={isOpen}
            className="p-3 rounded-xl flex items-center justify-center transition-all duration-300"
            style={{
              background: 'var(--app-surface)',
              color: 'var(--app-primary)',
            }}
            whileHover={{ scale: 1.05 }}
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
          aria-label="Main navigation"
          className={`relative z-10 flex-1 py-4 space-y-2 ${isOpen ? "px-3" : "px-2"}`}
          style={{ overflowY: 'auto', overflowX: 'hidden' }}
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.path);
            const isDisabled = item.requiresServer && !isOnline;

            return (
              <Link
                key={index}
                to={isDisabled ? "#" : item.path}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={isDisabled ? "pointer-events-none" : ""}
                title={isDisabled ? t('nav.serverOffline') : undefined}
              >
                <motion.div
                  className={`group relative overflow-hidden rounded-xl border transition-colors duration-200 ${
                    !isActive && !isDisabled ? 'hover:bg-surface' : ''
                  }`}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, var(--app-primary) 0%, var(--app-secondary) 100%)'
                      : undefined,
                    borderColor: isActive ? 'var(--app-primary)' : 'transparent',
                    opacity: isDisabled ? 0.35 : (isActive ? 0.9 : 1),
                  }}
                  whileHover={isDisabled ? {} : { scale: 1.03 }}
                  whileTap={isDisabled ? {} : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  {/* Active glow indicator */}
                  {isActive && !isDisabled && (
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
                    isOpen ? "px-4" : "justify-center px-2"
                  }`}>
                    <motion.div
                      className="relative shrink-0"
                    >
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-all duration-200 ${
                          isActive
                            ? 'text-text'
                            : 'bg-surface text-text-secondary group-hover:bg-primary group-hover:text-text'
                        }`}
                        style={isActive ? { background: 'rgba(255, 255, 255, 0.15)' } : undefined}
                      >
                        <Icon className="text-lg" />
                      </div>
                      {/* Sync badge for Settings */}
                      {item.path === "/settings" && pendingSyncs > 0 && (
                        <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-warning text-white text-xs font-bold rounded-full animate-pulse">
                          {pendingSyncs}
                        </div>
                      )}
                    </motion.div>

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
                          className={`ml-4 text-sm font-medium whitespace-nowrap ${
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
            onClick={openDeleteModal}
            aria-label={t('nav.clearData')}
            className="group relative overflow-hidden w-full rounded-xl transition-all duration-300 border border-error/30 hover:border-error"
          >
            <div className="absolute inset-0 bg-linear-to-r from-error/10 to-transparent transition-opacity duration-300 group-hover:from-error/20" />
            <motion.div
              className="relative flex items-center py-3"
              animate={{
                paddingLeft: isOpen ? "16px" : "8px",
                paddingRight: isOpen ? "16px" : "8px",
                justifyContent: isOpen ? "flex-start" : "center"
              }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 bg-surface">
                <FaTrash className="text-lg text-error/60 group-hover:text-error" />
              </div>
              <AnimatePresence mode="wait">
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="ml-4 text-sm font-medium text-text-secondary group-hover:text-error"
                  >
                    {t('nav.clearData')}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </button>

          {/* User Profile with Server Status */}
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
              <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-secondary/5" />
              <motion.div
                className="relative flex items-center"
                animate={{
                  gap: isOpen ? "12px" : "0px",
                  justifyContent: isOpen ? "flex-start" : "center"
                }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Avatar with status indicator */}
                <div className="relative">
                  <ProfileAvatar
                    profilePicture={user.profilePicture}
                    username={user.username}
                    size={isOpen ? "md" : "sm"}
                    className="rounded-lg transition-all duration-300"
                  />
                  {/* Server status dot */}
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{
                      background: isOnline ? '#22c55e' : '#ef4444',
                      borderColor: 'var(--app-surface)',
                    }}
                  />
                </div>

                <AnimatePresence mode="wait">
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-xs font-semibold text-text truncate">
                        {user.username}
                      </p>
                      {user.role && (
                        <p className="text-[10px] text-text-secondary">
                          {user.role}
                        </p>
                      )}
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
        onClose={closeDeleteModal}
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

Drawer.displayName = 'Drawer';

export default Drawer;
