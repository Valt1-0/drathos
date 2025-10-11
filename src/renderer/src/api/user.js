import { fetchWithConnectionTracking } from "../utils/apiUtils";

export const registerUser = async (username, password) => {
  return apiCall("/api/users/register", { username, password });
};

export const loginUser = async (username, password) => {
  return apiCall("/api/users/login", { username, password });
};

const apiCall = async (endpoint, body) => {
  try {
    const serverAddress = await window.store.get("serverAddress");

    const response = await fetchWithConnectionTracking(`http://${serverAddress}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (response.ok) {
      await window.store.set("userToken", data.token);
      return { success: true, token: data.token };
    }
    return { success: false, error: data.msg };
  } catch (error) {
    return { success: false, error: "Erreur de connexion au serveur" };
  }
};
