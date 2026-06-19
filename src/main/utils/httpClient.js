/**
 * Internal HTTP client for Drathos backend API.
 * Main-process only — uses electron-store for serverAddress and safeStorage for tokens.
 * For worker threads, import rawRequest.js directly.
 */
import store from "../store.js";
import { getRefreshToken, setToken, setRefreshToken, deleteToken, deleteRefreshToken } from "./tokenStore.js";
import { buildServerUrl } from "./urlHelper.js";
import { rawRequest } from "./rawRequest.js";

/**
 * Makes an HTTP/HTTPS request to the backend.
 * On 401, attempts a token refresh and retries the original request once.
 * Returns a fetch-like response object: { ok, status, headers, json(), text(), arrayBuffer() }
 *
 * @param {string} url
 * @param {{ method?, headers?, body?, timeout? }} options
 */
export const apiRequest = async (url, options = {}) => {
  const serverAddress = store.get("serverAddress", "");
  const response = await rawRequest(url, { ...options, serverAddress });

  if (response.status !== 401) return response;

  // Try to refresh the access token once
  const refreshToken = getRefreshToken();
  if (!refreshToken) return response;

  try {
    const refreshUrl = buildServerUrl(serverAddress, "/api/users/refresh");
    const refreshResponse = await rawRequest(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      serverAddress,
    });

    if (!refreshResponse.ok) {
      deleteToken();
      deleteRefreshToken();
      return response;
    }

    const { token: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.json();
    setToken(newAccessToken);
    if (newRefreshToken) setRefreshToken(newRefreshToken);

    // Retry with the new token, replacing the Authorization header
    const retryHeaders = { ...options.headers, Authorization: `Bearer ${newAccessToken}` };
    return rawRequest(url, { ...options, headers: retryHeaders, serverAddress });
  } catch {
    return response;
  }
};
