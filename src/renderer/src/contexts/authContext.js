import { createContext, useContext, useState, useEffect } from "react";
import jwt_decode from "jwt-decode";
import { loginUser, registerUser } from "../api/functions";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwt_decode(token);
        setUser(decoded.user);
      } catch (error) {
        sessionStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const { data, error } = await loginUser(username, password);

      if (error) {
        return { success: false, error };
      }

      sessionStorage.setItem("token", data.token);
      const decoded = jwt_decode(data.token);
      setUser(decoded.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erreur de connexion" };
    }
  };

  const register = async (username, password) => {
    try {
      const { data, error } = await registerUser(username, password);

      if (error) {
        return { success: false, error };
      }

      sessionStorage.setItem("token", data.token);
      const decoded = jwt_decode(data.token);
      setUser(decoded.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erreur d'inscription" };
    }
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
};
