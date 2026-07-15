import { fetchWithTimeout } from "../utils/apiUtils";
import { buildServerUrl, buildProfilePictureUrlSync } from "../utils/urlHelper";

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

  return fetchWithTimeout(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });
};

export const registerUser = async (username, password, inviteCode) => {
  try {
    const { serverAddress } = await getConfig();
    const body = { username, password };
    if (inviteCode) body.inviteCode = inviteCode;
    const response = await fetchWithTimeout(
      buildServerUrl(serverAddress, "/api/users/register"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();
    if (response.ok) {
      await window.store.set("userToken", data.token);
      if (data.refreshToken) await window.store.set("refreshToken", data.refreshToken);
      return { success: true, token: data.token };
    }
    return { success: false, error: data.message, code: data.code };
  } catch {
    return { success: false, error: "Server connection error" };
  }
};

export const loginUser = async (username, password) => {
  try {
    const { serverAddress } = await getConfig();
    const response = await fetchWithTimeout(
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
      if (data.refreshToken) await window.store.set("refreshToken", data.refreshToken);
      return { success: true, token: data.token };
    }
    return { success: false, error: data.message };
  } catch {
    return { success: false, error: "Server connection error" };
  }
};

export const logoutUser = async () => {
  try {
    const { serverAddress, token } = await getConfig();
    await fetchWithTimeout(buildServerUrl(serverAddress, "/api/users/logout"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Best-effort — local logout proceeds regardless
  }
};

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

export const uploadProfilePicture = async (file, onProgress) => {
  const { serverAddress, token } = await getConfig();
  const formData = new FormData();
  formData.append("profilePicture", file);
  const url = buildServerUrl(serverAddress, "/api/users/profile/picture");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.profilePicture) {
            data.profilePicture = buildProfilePictureUrlSync(data.profilePicture, serverAddress);
          }
          resolve(data);
        } catch {
          reject(new Error("Failed to parse response"));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || "Failed to upload profile picture"));
        } catch {
          reject(new Error("Failed to upload profile picture"));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("timeout", () => reject(new Error("Upload timed out")));
    xhr.open("POST", url);
    xhr.timeout = 30000;
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  });
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

// Invitation codes (admin/moderator)
export const listInvitations = async () => {
  const response = await authFetch("/api/users/invitations");
  if (!response.ok) throw new Error(`Error fetching invitations: ${response.status}`);
  return (await response.json()).invitations;
};

export const createInvitation = async ({ maxUses, expiresInDays } = {}) => {
  const body = {};
  if (maxUses) body.maxUses = maxUses;
  if (expiresInDays) body.expiresInDays = expiresInDays;
  const response = await authFetch("/api/users/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to create invitation");
  return data.invitation;
};

export const deleteInvitation = async (id) => {
  const response = await authFetch(`/api/users/invitations/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to revoke invitation");
  }
  return response.json();
};
