export const buildServerUrl = (serverAddress, path = '', protocol = null) => {
  if (!serverAddress) throw new Error('Server address is required');
  if (serverAddress.startsWith('http://') || serverAddress.startsWith('https://')) {
    return `${serverAddress}${path}`;
  }
  if (protocol) return `${protocol}://${serverAddress}${path}`;
  return `http://${serverAddress}${path}`;
};

export const detectServerProtocol = async (serverAddress, testPath = '/api/server/status', timeout = 3000) => {
  if (!serverAddress) throw new Error('Server address is required');

  if (serverAddress.startsWith('http://')) return { protocol: 'http', url: serverAddress };
  if (serverAddress.startsWith('https://')) return { protocol: 'https', url: serverAddress };

  const testUrl = async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { method: 'HEAD', signal: controller.signal, mode: 'cors' });
      clearTimeout(timeoutId);
      return response.ok || response.status < 500;
    } catch (error) {
      clearTimeout(timeoutId);
      return false;
    }
  };

  const httpsUrl = `https://${serverAddress}${testPath}`;
  if (await testUrl(httpsUrl)) return { protocol: 'https', url: `https://${serverAddress}` };

  const httpUrl = `http://${serverAddress}${testPath}`;
  if (await testUrl(httpUrl)) return { protocol: 'http', url: `http://${serverAddress}` };

  return { protocol: 'http', url: `http://${serverAddress}` };
};

export const normalizeServerAddress = (serverAddress) => {
  if (!serverAddress) return '';
  return serverAddress.trim().replace(/\/+$/, '');
};
