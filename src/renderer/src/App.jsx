import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Drawer from "./components/Drawer";
import Home from "./pages/Home";
import Welcome from "./pages/Welcome";

function App() {
  return (
    <>
      <Router>
        <Drawer>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<Home />} />
            <Route path="/services" element={<Home />} />
            <Route path="/contact" element={<Home />} />
            <Route path="/welcome" element={<Welcome />} />
          </Routes>
        </Drawer>
      </Router>
    </>
  );
}

export default App;
