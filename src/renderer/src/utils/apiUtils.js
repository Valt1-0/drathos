const DEFAULT_TIMEOUT = 5000;

let _onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
  _onUnauthorized = handler;
};

export async function fetchWithTimeout(url, options = {}) {
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.status === 401) {
      _onUnauthorized?.();
    }
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw error;
  }
}
