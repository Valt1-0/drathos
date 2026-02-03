import { fetchWithConnectionTracking } from "../utils/apiUtils";
import { buildServerUrl, buildProfilePictureUrlSync } from "../utils/urlHelper";

// Helper functions
const getConfig = async () => {
  const [serverAddress, token] = await Promise.all([
    window.store.get("serverAddress"),
    window.store.get("userToken")
  ]);
  return { serverAddress, token };
};

const authFetch = async (endpoint, options = {}) => {
  const { serverAddress, token } = await getConfig();
  const url = buildServerUrl(serverAddress, endpoint);

  return fetchWithConnectionTracking(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });
};

// Auth
export const registerUser = async (username, password) => {
  try {
    const { serverAddress } = await getConfig();
    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, "/api/users/register"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      }
    );

    const data = await response.json();
    if (response.ok) {
      await window.store.set("userToken", data.token);
      return { success: true, token: data.token };
    }
    return { success: false, error: data.msg };
  } catch {
    return { success: false, error: "Server connection error" };
  }
};

export const loginUser = async (username, password) => {
  try {
    const { serverAddress } = await getConfig();
    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, "/api/users/login"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      }
    );

    const data = await response.json();
    if (response.ok) {
      await window.store.set("userToken", data.token);
      return { success: true, token: data.token };
    }
    return { success: false, error: data.msg };
  } catch {
    return { success: false, error: "Server connection error" };
  }
};

// Profiles
export const getAllUsers = async ({ search = "", page = 1, limit = 20 } = {}) => {
  try {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) params.append("search", search);

    const response = await authFetch(`/api/users/profiles?${params}`);
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  } catch {
    return null;
  }
};

export const getUserProfile = async (userId) => {
  try {
    const response = await authFetch(`/api/users/profiles/${userId}`);

    if (response.status === 403) return { error: "private" };
    if (response.status === 404) return { error: "not_found" };
    if (!response.ok) throw new Error(`Error: ${response.status}`);

    return response.json();
  } catch {
    return null;
  }
};

export const updateProfileVisibility = async (isPublic) => {
  const response = await authFetch("/api/users/profile/visibility", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPublic })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update profile visibility");
  }
  return response.json();
};

export const uploadProfilePicture = async (file) => {
  const { serverAddress, token } = await getConfig();
  const formData = new FormData();
  formData.append("profilePicture", file);

  const response = await fetchWithConnectionTracking(
    buildServerUrl(serverAddress, "/api/users/profile/picture"),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to upload profile picture");
  }

  const data = await response.json();
  if (data.profilePicture) {
    data.profilePicture = buildProfilePictureUrlSync(data.profilePicture, serverAddress);
  }
  return data;
};

export const deleteProfilePicture = async () => {
  const response = await authFetch("/api/users/profile/picture", { method: "DELETE" });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete profile picture");
  }
  return response.json();
};

export const updateUserRole = async (userId, role) => {
  const response = await authFetch(`/api/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update user role");
  }
  return response.json();
};
