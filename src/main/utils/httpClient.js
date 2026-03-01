/**
 * Internal HTTP client for Drathos backend API.
 * Supports self-signed certificates (self-hosted servers).
 * Do NOT use for external services (Discord, IGDB, etc.) — use fetch() for those.
 */

import http from "http";
import https from "https";

/**
 * Makes an HTTP/HTTPS request to the backend with optional self-signed cert support.
 * Returns a fetch-like response object: { ok, status, headers, json(), text(), arrayBuffer() }
 *
 * @param {string} url
 * @param {{ method?, headers?, body?, allowSelfSigned? }} options
 */
export const apiRequest = (url, { method = "GET", headers = {}, body = null, allowSelfSigned = false } = {}) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === "https:";
    const transport = isHttps ? https : http;

    const bodyBuf = body != null
      ? Buffer.from(typeof body === "string" ? body : JSON.stringify(body))
      : null;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + (parsedUrl.search || ""),
      method,
      headers: {
        ...headers,
        ...(bodyBuf ? { "Content-Length": bodyBuf.length } : {}),
      },
    };

    if (isHttps && allowSelfSigned) options.rejectUnauthorized = false;

    const req = transport.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: res.headers,
          arrayBuffer: () => buf,
          text: () => buf.toString("utf8"),
          json: () => JSON.parse(buf.toString("utf8")),
        });
      });
    });

    req.on("error", reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
};
