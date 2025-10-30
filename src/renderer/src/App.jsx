import { useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "./contexts/authContext";
import { DownloadProvider } from "./contexts/downloadContext";
import { ConnectionProvider } from "./contexts/connectionContext";

import Drawer from "./components/Drawer";
import TitleBar from "./components/TitleBar";
import ProtectedRoute from "./components/ProtectedRoute";

// * Pages
import Home from "./pages/Home";
import Welcome from "./pages/Welcome";
import Games from "./pages/Games";
import Download from "./pages/Download";
import Settings from "./pages/Settings";

function AppRoutes() {
  const { user } = useAuth();

  return (
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

  useEffect(() => {
    // Fix pour Wayland: forcer le repaint quand la fenêtre est redimensionnée
    const handleResize = () => {
      // Force un reflow en modifiant temporairement le style
      document.body.style.display = 'none';
      // eslint-disable-next-line no-unused-expressions
      document.body.offsetHeight; // Force reflow
      document.body.style.display = '';
    };

    // Écouter l'événement window resize natif
    window.addEventListener('resize', handleResize);

    // Écouter aussi l'événement IPC depuis le main process (pour Linux)
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on('window-resized', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.removeAllListeners('window-resized');
      }
    };
  }, []);

  return (
    <AuthProvider>
      <ConnectionProvider>
        <DownloadProvider>
          <Router>
            <div className="flex flex-col h-screen overflow-hidden">
              <TitleBar />
              <div className="flex-1 overflow-hidden">
                <AppRoutes />
              </div>
            </div>
            <Toaster
              position="top-right"
              expand={true}
              richColors
              closeButton
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
        </DownloadProvider>
      </ConnectionProvider>
    </AuthProvider>
  );
}
