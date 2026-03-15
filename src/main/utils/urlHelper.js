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
