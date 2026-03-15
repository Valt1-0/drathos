export const buildServerUrl = (serverAddress, path = '', protocol = null) => {
  if (!serverAddress) throw new Error('Server address is required');
  if (serverAddress.startsWith('http://') || serverAddress.startsWith('https://')) {
    return `${serverAddress}${path}`;
  }
  if (protocol) return `${protocol}://${serverAddress}${path}`;

  // Smart detection: HTTPS for domains, HTTP for IPs
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
      // Do not specify a mode for Electron - let the browser handle it
      const response = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      clearTimeout(timeoutId);
      return false;
    }
  };

  // Extract the address without port for detection
  const addressWithoutPort = serverAddress.split(':')[0];

  // Detect whether it is a domain (contains letters) or an IP (digits and dots only)
  const isDomain = /[a-zA-Z]/.test(addressWithoutPort);

  // For domains, prefer HTTPS (reverse proxy, certificates)
  // For IPs, prefer HTTP (local servers)
  if (isDomain) {
    // Test HTTPS first for domains
    const httpsUrl = `https://${serverAddress}${testPath}`;
    if (await testUrl(httpsUrl)) return { protocol: 'https', url: `https://${serverAddress}` };

    // Fallback to HTTP if HTTPS fails
    const httpUrl = `http://${serverAddress}${testPath}`;
    if (await testUrl(httpUrl)) return { protocol: 'http', url: `http://${serverAddress}` };
  } else {
    // Test HTTP first for IPs
    const httpUrl = `http://${serverAddress}${testPath}`;
    if (await testUrl(httpUrl)) return { protocol: 'http', url: `http://${serverAddress}` };

    // Fallback to HTTPS if HTTP fails
    const httpsUrl = `https://${serverAddress}${testPath}`;
    if (await testUrl(httpsUrl)) return { protocol: 'https', url: `https://${serverAddress}` };
  }

  // If none work, smart fallback based on type
  return {
    protocol: isDomain ? 'https' : 'http',
    url: `${isDomain ? 'https' : 'http'}://${serverAddress}`
  };
};

export const normalizeServerAddress = (serverAddress) => {
  if (!serverAddress) return '';
  return serverAddress.trim().replace(/\/+$/, '');
};

export const buildProfilePictureUrl = async (profilePicture) => {
  if (!profilePicture) return null;

  // Already a full URL
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    return profilePicture;
  }

  // Server-relative path - build full URL
  if (profilePicture.startsWith('/')) {
    const serverAddress = await window.store.get("serverAddress");
    if (serverAddress) {
      return buildServerUrl(serverAddress, profilePicture);
    }
  }

  return profilePicture;
};

export const buildProfilePictureUrlSync = (profilePicture, serverAddress) => {
  if (!profilePicture) return null;

  // Already a full URL
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    return profilePicture;
  }

  // Server-relative path - build full URL
  if (profilePicture.startsWith('/') && serverAddress) {
    return buildServerUrl(serverAddress, profilePicture);
  }

  return profilePicture;
};
