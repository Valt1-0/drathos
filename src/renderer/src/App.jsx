import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
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
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#1e293b',
                  color: '#f1f5f9',
                  border: '1px solid #334155',
                },
              }}
            />
          </Router>
        </DownloadProvider>
      </ConnectionProvider>
    </AuthProvider>
  );
}
