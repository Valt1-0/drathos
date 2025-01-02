import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Drawer from "./components/Drawer";
import Home from "./pages/Home";
import Welcome from "./pages/Welcome";
import { AuthProvider } from "./contexts/authContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Drawer>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<Home />} />
            <Route path="/services" element={<Home />} />
            <Route path="/contact" element={<Home />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Welcome />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Drawer>
      </Router>
    </AuthProvider>
  );
}

export default App;
