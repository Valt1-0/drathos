/**
 * Returns true only when the request hostname matches the user's configured
 * self-hosted backend. Only that host is trusted for self-signed certificates;
 * every other HTTPS destination uses the default OS certificate chain.
 *
 * Mirrors the logic in the session `certificate-error` handler in index.js.
 *
 * @param {string} requestHostname  - hostname extracted from the request URL
 * @param {string} serverAddress    - raw value from store.get("serverAddress")
 */
export function isTrustedServerHost(requestHostname, serverAddress) {
  if (!serverAddress || !requestHostname) return false;
  try {
    const normalized = serverAddress.startsWith("http")
      ? serverAddress
      : `https://${serverAddress}`;
    return new URL(normalized).hostname === requestHostname;
  } catch {
    return false;
  }
}
