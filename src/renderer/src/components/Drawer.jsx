import React, { useState } from "react";
import {
  FaBars,
  FaTrash,
  FaGamepad,
  FaDownload,
  FaGear,
} from "react-icons/fa6";
import { FaHome } from "react-icons/fa";
import { FiX, FiLogOut, FiUser } from "react-icons/fi";
import { Link, useLocation } from "react-router";
import { useAuth } from "../contexts/authContext";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "./modals/ConfirmationModal";

const menuItems = [
  { label: "Accueil", icon: FaHome, path: "/" },
  { label: "Bibliothèque", icon: FaGamepad, path: "/games" },
  { label: "Téléchargements", icon: FaDownload, path: "/download" },
  { label: "Paramètres", icon: FaGear, path: "/settings" },
];

const Drawer = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

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
        className="relative flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800/50 shadow-2xl"
        style={{ overflow: 'hidden', WebkitAppRegion: 'no-drag' }}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        {/* Header with toggle button */}
        <motion.div
          className="relative z-10 flex items-center border-b border-slate-800/50"
          animate={{
            justifyContent: isOpen ? "flex-end" : "center",
            padding: isOpen ? "20px" : "16px"
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center"
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
                  className={`group relative overflow-hidden rounded-xl ${
                    isActive
                      ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30"
                      : "hover:bg-slate-800/50 border border-transparent"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}

                  <div className={`flex items-center py-3 transition-all duration-200 ${
                    isOpen ? "px-4" : "justify-center"
                  }`}>
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                        isActive
                          ? "bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-blue-400"
                          : "bg-slate-800/50 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-700/50"
                      } transition-all duration-200`}
                    >
                      <Icon className="text-lg" />
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
                            isActive ? "text-white" : "text-slate-300 group-hover:text-white"
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
          className="relative z-10 border-t border-slate-800/50 space-y-2"
          animate={{
            padding: isOpen ? "12px" : "8px"
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Delete Data Button */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="group relative overflow-hidden w-full rounded-xl border border-slate-800/50 hover:border-red-500/30 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <motion.div
              className="relative flex items-center py-3"
              animate={{
                paddingLeft: isOpen ? "16px" : "8px",
                paddingRight: isOpen ? "16px" : "8px",
                justifyContent: isOpen ? "flex-start" : "center"
              }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800/50 text-slate-400 group-hover:text-red-400 group-hover:bg-red-500/10 transition-all duration-300">
                <FaTrash className="text-lg" />
              </div>
              <AnimatePresence mode="wait">
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="ml-4 font-medium text-slate-300 group-hover:text-red-400"
                  >
                    Effacer données
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </button>

          {/* User Profile */}
          {user && (
            <motion.div
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50"
              animate={{
                padding: isOpen ? "12px" : "8px"
              }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
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
                    className={`rounded-lg border-2 border-slate-600/50 object-cover transition-all duration-300 ${
                      isOpen ? "w-12 h-12" : "w-10 h-10"
                    }`}
                  />
                ) : (
                  <div
                    className={`flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 transition-all duration-300 ${
                      isOpen ? "w-12 h-12" : "w-10 h-10"
                    }`}
                  >
                    <FiUser className="text-white text-lg" />
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
                      <p className="text-sm font-semibold text-white truncate">
                        {user.username}
                      </p>
                      <p className="text-xs text-slate-400">En ligne</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 overflow-hidden">
        {children}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handlerDeleteUserData}
        title="Effacer toutes les données"
        message="Êtes-vous sûr de vouloir supprimer toutes vos données locales ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmColor="red"
        icon={FaTrash}
      />
    </div>
  );
};

export default Drawer;
