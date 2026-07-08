import { useEffect, lazy, Suspense, useState } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router";
import { Toaster, toast } from "sonner";
import { motion } from "framer-motion";
import { FiLoader } from "react-icons/fi";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "./i18n/config";

import { AuthProvider, useAuth } from "./contexts/authContext";
import { DownloadProvider } from "./contexts/downloadContext";
import { ConnectionProvider } from "./contexts/connectionContext";
import { UploadProvider } from "./contexts/uploadContext";
import { UpdateProvider } from "./contexts/updateContext";
import { ThemeProvider } from "./contexts/themeContext";
import { CollectionsProvider } from "./contexts/collectionsContext";
import { NotificationProvider } from "./contexts/notificationContext";

import Drawer from "./components/Drawer";
import TitleBar from "./components/TitleBar";
import ProtectedRoute from "./components/ProtectedRoute";
import UploadNotification from "./components/UploadNotification";
import UpdateModal from "./components/modals/UpdateModal";
import DownloadTray from "./components/DownloadTray";
import ErrorBoundary from "./components/ErrorBoundary";
import QuickLaunch from "./components/QuickLaunch";
import KeyboardShortcutsModal from "./components/modals/KeyboardShortcutsModal";
import useKeyboardShortcuts, { useGlobalShortcuts } from "./hooks/useKeyboardShortcuts";

// * Critical pages imported directly (no lazy loading)
import Games from "./pages/Games";
import Collections from "./pages/Collections";
import Home from "./pages/Home";

// * Lazy-loaded pages for less frequently used pages
const Welcome = lazy(() => import("./pages/Welcome"));
const Download = lazy(() => import("./pages/Download"));
const Settings = lazy(() => import("./pages/Settings"));
const Mods = lazy(() => import("./pages/Mods"));
const Users = lazy(() => import("./pages/Users"));
const UserProfile = lazy(() => import("./pages/UserProfile"));

// Loading fallback component
function PageLoader() {
  const { t } = useTranslation();
  return (
    <div className="h-full w-full flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="inline-block mb-4"
        >
          <FiLoader className="text-5xl text-primary" />
        </motion.div>
        <p className="text-text-secondary text-sm">{t('common.loading')}</p>
      </motion.div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quickLaunchOpen, setQuickLaunchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useGlobalShortcuts(navigate);
  useKeyboardShortcuts({
    'ctrl+k': () => user && setQuickLaunchOpen(true),
    'ctrl+shift+?': () => user && setShortcutsOpen((prev) => !prev),
  });

  return (
    <>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {!user && <Route path="/welcome" element={<Welcome />} />}

        {user && (
          <>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Drawer>
                    <ErrorBoundary>
                      <Home />
                    </ErrorBoundary>
                  </Drawer>
                </ProtectedRoute>
              }
            />
            <Route
              path="/games"
              element={
                <ProtectedRoute>
                  <Drawer>
                    <ErrorBoundary>
                      <Games />
                    </ErrorBoundary>
                  </Drawer>
                </ProtectedRoute>
              }
            />
            <Route
              path="/collections"
              element={
                <ProtectedRoute>
                  <Drawer>
                    <ErrorBoundary>
                      <Collections />
                    </ErrorBoundary>
                  </Drawer>
                </ProtectedRoute>
              }
            />
            <Route
              path="/download"
              element={
                <ProtectedRoute>
                  <Drawer>
                    <ErrorBoundary>
                      <Download />
                    </ErrorBoundary>
                  </Drawer>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Drawer>
                    <ErrorBoundary>
                      <Settings />
                    </ErrorBoundary>
                  </Drawer>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mods"
              element={
                <ProtectedRoute>
                  <Drawer>
                    <ErrorBoundary>
                      <Mods />
                    </ErrorBoundary>
                  </Drawer>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Drawer>
                    <ErrorBoundary>
                      <Users />
                    </ErrorBoundary>
                  </Drawer>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:userId"
              element={
                <ProtectedRoute>
                  <Drawer>
                    <ErrorBoundary>
                      <UserProfile />
                    </ErrorBoundary>
                  </Drawer>
                </ProtectedRoute>
              }
            />
          </>
        )}

        <Route
          path="*"
          element={<Navigate to={user ? "/" : "/welcome"} replace />}
        />
      </Routes>
    </Suspense>
    <QuickLaunch
      isOpen={quickLaunchOpen}
      onClose={() => setQuickLaunchOpen(false)}
      navigate={navigate}
    />
    <KeyboardShortcutsModal
      isOpen={shortcutsOpen}
      onClose={() => setShortcutsOpen(false)}
    />
    </>
  );
}

export default function App() {
  useEffect(() => {
    // Keyboard shortcut to open DevTools
    const handleKeyDown = (e) => {
      // F12 or Ctrl+Shift+I
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
        e.preventDefault();
        window.api.windowToggleDevTools();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // A pinned server certificate changed — warn the user and let them re-trust
  // (legitimate renewal) or leave it blocked (possible interception).
  useEffect(() => {
    const unsub = window.api?.security?.onCertificateChanged?.(() => {
      toast.error(i18n.t("errors.certChangedTitle"), {
        description: i18n.t("errors.certChangedDesc"),
        duration: Infinity,
        action: {
          label: i18n.t("errors.trustNewCert"),
          onClick: async () => {
            try {
              await window.api.security.resetServerTrust();
            } catch {
              /* ignore */
            }
            window.api.reloadApp?.();
          },
        },
      });
    });
    return unsub;
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <ErrorBoundary>
          <AuthProvider>
            <ConnectionProvider>
              <DownloadProvider>
                <UploadProvider>
                  <CollectionsProvider>
                    <NotificationProvider>
                      <UpdateProvider>
                        <Router>
                          <div className="flex flex-col h-screen overflow-hidden">
                            <TitleBar />
                            <main className="flex-1 overflow-hidden">
                              <AppRoutes />
                            </main>
                          </div>
                          <UploadNotification />
                          <UpdateModal />
                          <DownloadTray />
                          <Toaster
                            position="top-right"
                            expand={true}
                            richColors
                            visibleToasts={3}
                            closeButton={false}
                            toastOptions={{
                              duration: 4000,
                              style: {
                                background: "var(--app-surface)",
                                color: "var(--app-text)",
                                border: "1px solid var(--app-border)",
                                borderRadius: "12px",
                                padding: "16px",
                                backdropFilter: "blur(12px)",
                                boxShadow: "var(--app-shadow-primary)",
                              },
                              className: "sonner-toast",
                              descriptionClassName: "sonner-description",
                            }}
                          />
                        </Router>
                      </UpdateProvider>
                    </NotificationProvider>
                  </CollectionsProvider>
                </UploadProvider>
              </DownloadProvider>
            </ConnectionProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </I18nextProvider>
  );
}
