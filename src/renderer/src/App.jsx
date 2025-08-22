import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "./contexts/authContext";
import { DownloadProvider } from "./contexts/downloadContext";

import Drawer from "./components/Drawer";
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
  return (
    <AuthProvider>
      <DownloadProvider>
        <Router>

          <AppRoutes />
        </Router>
      </DownloadProvider>
    </AuthProvider>
  );
}
