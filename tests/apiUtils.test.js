import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchWithTimeout,
  setUnauthorizedHandler,
  setTokenRefresher,
} from "../src/renderer/src/utils/apiUtils.js";

const okResponse = (status = 200) => ({ status, ok: status < 400 });

beforeEach(() => {
  vi.restoreAllMocks();
  setUnauthorizedHandler(null);
  setTokenRefresher(null);
});

describe("fetchWithTimeout", () => {
  it("returns the response on success", async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(200));
    const res = await fetchWithTimeout("http://server/api/x");
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("translates AbortError into a timeout error", async () => {
    const abort = new Error("aborted");
    abort.name = "AbortError";
    global.fetch = vi.fn().mockRejectedValue(abort);
    await expect(fetchWithTimeout("http://server/api/x")).rejects.toThrow(
      "Request timeout"
    );
  });

  it("refreshes the token and retries once on 401", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(okResponse(401))
      .mockResolvedValueOnce(okResponse(200));
    const refresher = vi.fn().mockResolvedValue("new-token");
    setTokenRefresher(refresher);

    const res = await fetchWithTimeout("http://server/api/x", {
      headers: { Authorization: "Bearer old-token" },
    });

    expect(res.status).toBe(200);
    expect(refresher).toHaveBeenCalledTimes(1);
    // The retry must carry the refreshed token
    const retryOptions = fetch.mock.calls[1][1];
    expect(retryOptions.headers.Authorization).toBe("Bearer new-token");
  });

  it("does not retry more than once (401 after refresh stays 401)", async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(401));
    const refresher = vi.fn().mockResolvedValue("new-token");
    const onUnauthorized = vi.fn();
    setTokenRefresher(refresher);
    setUnauthorizedHandler(onUnauthorized);

    const res = await fetchWithTimeout("http://server/api/x");

    expect(res.status).toBe(401);
    expect(refresher).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    // Second 401 is a retry — must trigger the unauthorized handler, not loop
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("calls the unauthorized handler when the refresh itself fails", async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(401));
    const refresher = vi.fn().mockRejectedValue(new Error("refresh failed"));
    const onUnauthorized = vi.fn();
    setTokenRefresher(refresher);
    setUnauthorizedHandler(onUnauthorized);

    const res = await fetchWithTimeout("http://server/api/x");

    expect(res.status).toBe(401);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1); // no retry without a new token
  });

  it("shares a single refresh across concurrent 401s", async () => {
    let resolveRefresh;
    const refresher = vi.fn(
      () => new Promise((resolve) => (resolveRefresh = resolve))
    );
    setTokenRefresher(refresher);

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(okResponse(401))
      .mockResolvedValueOnce(okResponse(401))
      .mockResolvedValue(okResponse(200));

    const p1 = fetchWithTimeout("http://server/api/a");
    const p2 = fetchWithTimeout("http://server/api/b");

    // Let both requests hit their 401 and enqueue on the shared refresh
    await new Promise((r) => setTimeout(r, 10));
    resolveRefresh("shared-token");

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(refresher).toHaveBeenCalledTimes(1); // singleton: one refresh for both
  });

  it("calls the unauthorized handler on 401 when no refresher is set", async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(401));
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    const res = await fetchWithTimeout("http://server/api/x");
    expect(res.status).toBe(401);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
