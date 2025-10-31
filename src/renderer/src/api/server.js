import { fetchWithConnectionTracking } from "../utils/apiUtils";
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

    const response = await fetchWithConnectionTracking(url);

    if (response.ok) {
      return { online: true, protocol };
    }

    const data = await response.json();
    return {
      online: false,
      error: `Le serveur a répondu avec le statut: ${response.status}`,
      uptime: data.uptime,
      protocol,
    };
  } catch (error) {
    return { online: false, error: "Impossible de se connecter au serveur" };
  }
};
