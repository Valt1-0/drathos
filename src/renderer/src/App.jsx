import { useEffect, lazy, Suspense } from "react";
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router";
import { Toaster } from "sonner";
import { motion } from "framer-motion";
import { FiLoader } from "react-icons/fi";
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';

import { AuthProvider, useAuth } from "./contexts/authContext";
import { DownloadProvider } from "./contexts/downloadContext";
import { ConnectionProvider } from "./contexts/connectionContext";
import { UploadProvider } from "./contexts/uploadContext";
import { UpdateProvider } from "./contexts/updateContext";

import Drawer from "./components/Drawer";
import TitleBar from "./components/TitleBar";
import ProtectedRoute from "./components/ProtectedRoute";
import UploadNotification from "./components/UploadNotification";
import UpdateModal from "./components/UpdateModal";
import ErrorBoundary from "./components/ErrorBoundary";
import { useGlobalShortcuts } from "./hooks/useKeyboardShortcuts";

// * Lazy-loaded Pages for better performance
const Home = lazy(() => import("./pages/Home"));
const Welcome = lazy(() => import("./pages/Welcome"));
const Games = lazy(() => import("./pages/Games"));
const Download = lazy(() => import("./pages/Download"));
const Settings = lazy(() => import("./pages/Settings"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="inline-block"
        >
          <FiLoader className="text-5xl text-blue-500 mb-4" />
        </motion.div>
        <p className="text-slate-400 text-sm">Loading...</p>
      </motion.div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Enable global keyboard shortcuts
  useGlobalShortcuts(navigate);

  return (
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
                    <Home />
                  </Drawer>
                </ProtectedRoute>
              }
            />
            <Route
              path="/games"
              element={
                <ProtectedRoute>
                  <Drawer>
                    <Games />
                  </Drawer>
                </ProtectedRoute>
              }
            />
            <Route
              path="/download"
              element={
                <ProtectedRoute>
                  <Drawer>
                    <Download />
                  </Drawer>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Drawer>
                    <Settings />
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
  );
}

export default function App() {
  useEffect(() => {
    // Raccourci clavier pour ouvrir le DevTools
    const handleKeyDown = (e) => {
      // F12 ou Ctrl+Shift+I
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        window.api.windowToggleDevTools();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <ErrorBoundary>
        <AuthProvider>
          <ConnectionProvider>
            <DownloadProvider>
              <UploadProvider>
                <UpdateProvider>
                  <Router>
                  <div className="flex flex-col h-screen overflow-hidden">
                    <TitleBar />
                    <div className="flex-1 overflow-hidden">
                      <AppRoutes />
                    </div>
                  </div>
                  <UploadNotification />
                  <UpdateModal />
                  <Toaster
                    position="top-right"
                    expand={true}
                    richColors
                    closeButton={false}
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        color: '#f1f5f9',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '12px',
                        padding: '16px',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                      },
                      className: 'sonner-toast',
                      descriptionClassName: 'sonner-description',
                    }}
                  />
                  </Router>
                </UpdateProvider>
              </UploadProvider>
            </DownloadProvider>
          </ConnectionProvider>
        </AuthProvider>
      </ErrorBoundary>
    </I18nextProvider>
  );
}
