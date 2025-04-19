import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/authContext";

import Home from "./pages/Home";
import Welcome from "./pages/Welcome";
import Drawer from "./components/Drawer";
import ProtectedRoute from "./components/ProtectedRoute";

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
          {/* <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Drawer>
                  <Home />
                </Drawer>
              </ProtectedRoute>
            }
          /> */}
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
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}