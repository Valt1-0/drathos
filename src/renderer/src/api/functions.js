export const checkServerStatus = async (serverAddress) => {
  try {
    const response = await fetch(`http://${serverAddress}/api/server/status`);

    if (response.status === 200) {
      return { online: true };
    }

    const data = await response.json();
    return {
      online: false,
      error: `Le serveur a répondu avec le statut: ${response.status}`,
      uptime: data.uptime,
    };
  } catch (error) {
    return {
      online: false,
      error: "Impossible de se connecter au serveur",
    };
  }
};

export const login = async (username, password) => {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (response.ok) {
      sessionStorage.setItem("token", data.token);
      const decoded = jwt_decode(data.token);
      return { success: true, user: decoded.user };
    }
    return { success: false, error: data.msg };
  } catch (error) {
    return { success: false, error: "Erreur de connexion" };
  }
};

export const register = async (username, password) => {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (response.ok) {
      sessionStorage.setItem("token", data.token);
      const decoded = jwt_decode(data.token);
      return { success: true, user: decoded.user };
    }
    return { success: false, error: data.msg };
  } catch (error) {
    return { success: false, error: "Erreur d'inscription" };
  }
};


const register = async (username, password) => {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("token", data.token);
      const decoded = jwt_decode(data.token);
      setUser(decoded.user);
      return { success: true };
    }
    return { success: false, error: data.msg };
  } catch (error) {
    return { success: false, error: "Erreur d'inscription" };
  }
};