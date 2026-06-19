const DEFAULT_TIMEOUT = 5000;

let _onUnauthorized = null;
let _tokenRefresher = null;
let _refreshInFlight = null; // singleton — concurrent 401s share one refresh call

export const setUnauthorizedHandler = (handler) => {
  _onUnauthorized = handler;
};

export const setTokenRefresher = (refresher) => {
  _tokenRefresher = refresher;
};

export async function fetchWithTimeout(url, options = {}, _isRetry = false) {
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
      if (!_isRetry && _tokenRefresher) {
        try {
          if (!_refreshInFlight) {
            _refreshInFlight = _tokenRefresher().finally(() => { _refreshInFlight = null; });
          }
          const newToken = await _refreshInFlight;
          const retryOptions = {
            ...options,
            headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
          };
          return fetchWithTimeout(url, retryOptions, true);
        } catch {
          _onUnauthorized?.();
        }
      } else {
        _onUnauthorized?.();
      }
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
