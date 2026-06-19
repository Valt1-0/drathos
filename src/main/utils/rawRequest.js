/**
 * Worker-safe minimal HTTP client.
 * No Electron APIs — safe to import from worker threads.
 * Used by httpClient.js (main process) and gameEngine.js (worker thread).
 *
 * Callers must pass serverAddress explicitly; the main-process httpClient.js
 * reads it from the store automatically.
 */
import http from "http";
import https from "https";
import { MAX_HTTP_RESPONSE_SIZE, HTTP_REQUEST_TIMEOUT_MS } from "../app/constants.js";
import { isTrustedServerHost } from "./tlsHelper.js";

/**
 * @param {string} url
 * @param {{
 *   method?: string,
 *   headers?: object,
 *   body?: string | object | null,
 *   timeout?: number,
 *   serverAddress?: string,
 * }} options
 * @returns {Promise<{ ok: boolean, status: number, headers: object, json(): any, text(): string, arrayBuffer(): Buffer }>}
 */
export const rawRequest = (url, {
  method = "GET",
  headers = {},
  body = null,
  timeout = HTTP_REQUEST_TIMEOUT_MS,
  serverAddress = "",
} = {}) => {
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

    if (isHttps) options.rejectUnauthorized = !isTrustedServerHost(parsedUrl.hostname, serverAddress);

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
