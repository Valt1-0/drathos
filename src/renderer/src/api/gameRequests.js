import { fetchWithTimeout } from "../utils/apiUtils";
import { buildServerUrl } from "../utils/urlHelper";

const getConnectionData = async () => {
  const [serverAddress, token] = await Promise.all([
    window.store.get("serverAddress"),
    window.store.get("userToken"),
  ]);
  return {
    serverAddress,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

export const getAllRequests = async () => {
  const { serverAddress, headers } = await getConnectionData();
  const response = await fetchWithTimeout(
    buildServerUrl(serverAddress, "/api/requests"),
    { headers }
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return data.requests ?? data;
};

export const createRequest = async ({ gameTitle, description }) => {
  const { serverAddress, headers } = await getConnectionData();
  const response = await fetchWithTimeout(
    buildServerUrl(serverAddress, "/api/requests"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({ gameTitle, description }),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${response.status}`);
  }
  return response.json();
};

export const deleteRequest = async (id) => {
  const { serverAddress, headers } = await getConnectionData();
  const response = await fetchWithTimeout(
    buildServerUrl(serverAddress, `/api/requests/${id}`),
    { method: "DELETE", headers }
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
};
