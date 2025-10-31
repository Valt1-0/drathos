export const buildServerUrl = (serverAddress, path = '', protocol = null) => {
  if (!serverAddress) throw new Error('Server address is required');
  if (serverAddress.startsWith('http://') || serverAddress.startsWith('https://')) {
    return `${serverAddress}${path}`;
  }
  if (protocol) return `${protocol}://${serverAddress}${path}`;

  // Détection intelligente : HTTPS pour domaines, HTTP pour IPs
  const addressWithoutPort = serverAddress.split(':')[0];
  const isDomain = /[a-zA-Z]/.test(addressWithoutPort);
  const defaultProtocol = isDomain ? 'https' : 'http';

  return `${defaultProtocol}://${serverAddress}${path}`;
};

export const detectServerProtocol = async (serverAddress, testPath = '/api/server/status', timeout = 3000) => {
  if (!serverAddress) throw new Error('Server address is required');
  if (serverAddress.startsWith('http://')) return { protocol: 'http', url: serverAddress };
  if (serverAddress.startsWith('https://')) return { protocol: 'https', url: serverAddress };

  const testUrl = async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      // Ne pas spécifier de mode pour Electron - laisse le navigateur gérer
      const response = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      clearTimeout(timeoutId);
      return false;
    }
  };

  // Extraire l'adresse sans port pour la détection
  const addressWithoutPort = serverAddress.split(':')[0];

  // Détecter si c'est un domaine (contient des lettres) ou une IP (uniquement chiffres et points)
  const isDomain = /[a-zA-Z]/.test(addressWithoutPort);

  // Pour les domaines, privilégier HTTPS (reverse proxy, certificats)
  // Pour les IPs, privilégier HTTP (serveurs locaux)
  if (isDomain) {
    // Tester HTTPS en premier pour les domaines
    const httpsUrl = `https://${serverAddress}${testPath}`;
    if (await testUrl(httpsUrl)) return { protocol: 'https', url: `https://${serverAddress}` };

    // Fallback sur HTTP si HTTPS échoue
    const httpUrl = `http://${serverAddress}${testPath}`;
    if (await testUrl(httpUrl)) return { protocol: 'http', url: `http://${serverAddress}` };
  } else {
    // Tester HTTP en premier pour les IPs
    const httpUrl = `http://${serverAddress}${testPath}`;
    if (await testUrl(httpUrl)) return { protocol: 'http', url: `http://${serverAddress}` };

    // Fallback sur HTTPS si HTTP échoue
    const httpsUrl = `https://${serverAddress}${testPath}`;
    if (await testUrl(httpsUrl)) return { protocol: 'https', url: `https://${serverAddress}` };
  }

  // Si aucun ne fonctionne, fallback intelligent selon le type
  return {
    protocol: isDomain ? 'https' : 'http',
    url: `${isDomain ? 'https' : 'http'}://${serverAddress}`
  };
};

export const normalizeServerAddress = (serverAddress) => {
  if (!serverAddress) return '';
  return serverAddress.trim().replace(/\/+$/, '');
};
