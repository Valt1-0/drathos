import { fetchWithTimeout } from "../utils/apiUtils";
import { buildServerUrl, detectServerProtocol } from "../utils/urlHelper";

export const checkServerStatus = async (serverAddress, autoDetect = true) => {
  try {
    let url;
    let protocol = null;

    if (autoDetect && !serverAddress.startsWith('http://') && !serverAddress.startsWith('https://')) {
      const detection = await detectServerProtocol(serverAddress);
      protocol = detection.protocol;
      url = buildServerUrl(serverAddress, '/api/server/status', protocol);
    } else {
      url = buildServerUrl(serverAddress, '/api/server/status');
      protocol = serverAddress.startsWith('https://') ? 'https' : 'http';
    }

    const response = await fetchWithTimeout(url);

    if (response.ok) {
      return { online: true, protocol };
    }

    const data = await response.json();
    return {
      online: false,
      error: `Server responded with status: ${response.status}`,
      uptime: data.uptime,
      protocol,
    };
  } catch (error) {
    return { online: false, error: "Impossible de se connecter au serveur" };
  }
};

export const getServerLimits = async () => {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");
  const response = await fetchWithTimeout(
    buildServerUrl(serverAddress, '/api/server/settings'),
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(`Error fetching settings: ${response.status}`);
  const data = await response.json();
  return data.settings;
};

export const updateServerLimits = async (settings) => {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");
  const response = await fetchWithTimeout(
    buildServerUrl(serverAddress, '/api/server/settings'),
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Error updating settings: ${response.status}`);
  }
  return (await response.json()).settings;
};
