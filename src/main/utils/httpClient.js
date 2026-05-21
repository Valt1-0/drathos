/**
 * Internal HTTP client for Drathos backend API.
 * Supports self-signed certificates (self-hosted servers).
 * Do NOT use for external services (Discord, IGDB, etc.) — use fetch() for those.
 */

import http from "http";
import https from "https";
import { MAX_HTTP_RESPONSE_SIZE, HTTP_REQUEST_TIMEOUT_MS } from "../app/constants.js";

/**
 * Makes an HTTP/HTTPS request to the backend.
 * Always allows self-signed certificates — this client is only used for the
 * configured self-hosted server, never for external services.
 * Returns a fetch-like response object: { ok, status, headers, json(), text(), arrayBuffer() }
 *
 * @param {string} url
 * @param {{ method?, headers?, body?, timeout? }} options
 */
export const apiRequest = (url, { method = "GET", headers = {}, body = null, timeout = HTTP_REQUEST_TIMEOUT_MS } = {}) => {
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

    if (isHttps) options.rejectUnauthorized = false;

    const req = transport.request(options, (res) => {
      const chunks = [];
      let bytesReceived = 0;
      res.on("data", (chunk) => {
        bytesReceived += chunk.length;
        if (bytesReceived > MAX_HTTP_RESPONSE_SIZE) {
          res.destroy(new Error(`Response exceeds ${MAX_HTTP_RESPONSE_SIZE} bytes`));
          return;
        }
        chunks.push(chunk);
      });
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

    req.setTimeout(timeout, () => req.destroy(new Error(`Request timed out after ${timeout}ms`)));
    req.on("error", reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
};
