# Changelog

## [1.2.0] - 2026-07-26

### Added
- **Game screenshots** — IGDB screenshots in the game detail view, and as the Big Picture backdrop
- **Big Picture entry/exit sounds** — short WebAudio arpeggios on open and close

### Changed
- **Big Picture split into modules** — `BigPictureMode.jsx` from 2168 to 735 lines; grid, detail view, overlays, state hooks and shared primitives now live under `src/renderer/src/components/bigPicture/`
- **Single source of input priority** — an `activeMode` value replaces the `nowPlaying > prompt > confirm > search > detail` cascade that was duplicated across `onNav` / `onConfirm` / `onBack`

### Performance
- **Big Picture lazy-loaded** — its 42 kB chunk is fetched only after the first open
- **Audio device boot deferred** — constructing an `AudioContext` blocks the main thread for up to ~2.5s on Windows; that cost is now paid when a pad connects or Big Picture is first opened, never on a plain keyboard-and-mouse session
- **Grid cards take per-card primitives** — a download ticking 4x/s no longer re-renders every card in the section
- **IGDB screenshots deduplicated** — concurrent requests for the same game share one in-flight promise, and cache entries now honour `CACHE_DURATION`

### Fixed
- Uninstalling a game from Big Picture left it listed on Home and in the library — every view now drops it
- The first d-pad press landed on the title bar window controls, which sit first in DOM order; focus now enters the sidebar
- Focus ring was invisible on sidebar nav links — Chromium drops outlines on inline boxes wrapping block children, so the link is a block now
- The Big Picture close transition never ran: the overlay was unmounted before `AnimatePresence` could animate it
- Pressing down from a partial last row in the Big Picture grid went nowhere; it now lands on the last card
- Every navigation blip carried a 50ms lead-in; it now applies only while the audio device is still starting
- The update dialog showed raw `<p>` / `<ul>` / `<code>` markup instead of the release notes — `electron-updater`'s GitHub provider returns GitHub's rendered HTML, which is now parsed through a tag allowlist

### Security
- **`fast-uri` pinned to `>=4.1.1`** — the previous `>=3.1.2` override was open-ended enough to resolve to 4.1.0, covered by GHSA-v2hh-gcrm-f6hx (host confusion via a literal backslash authority delimiter). Reached only through `electron-store > conf > ajv`; that schema declares no `uri` formats and the app's own host check uses the WHATWG URL parser, so no reachable path was affected.

## [1.1.0] - 2026-07-15

### Added
- Full controller navigation across the app, and Big Picture mode
- Per-game display selection and custom launch arguments
- Close to system tray
- Bug reports filed as GitHub issues from inside the app

### Changed
- Safer default install folder
- Electron 43

## [1.0.0] - 2026-06-17

### Security
- **TLS certificate pinning** — `rejectUnauthorized` now only bypassed for the configured self-hosted backend hostname (via `tlsHelper.js`), never for third-party hosts
- **CSP hardened** — `script-src 'unsafe-inline'` removed in production builds
- **Shell injection prevention** — replaced `exec` with `execFile` in `wineDetector.js`
- **Path traversal prevention** — `gamePath` validated against download directory before any `fs` operation in game/mod handlers
- **IPC hardened** — all handlers migrated to `secureHandle` (validates sender frame origin)
- **safeStorage migration** — store encryption key protected by OS keychain (Windows DPAPI / macOS Keychain / Linux secret-service); plaintext fallback for headless Linux
- **openExternal allowlist** — external browser opens restricted to `winehq.org` explicitly; blanket http/https allow removed
- **Input validation on IPC** — logger level allowlist prevents arbitrary method calls; notification title/body length capped
- **Protocol allowlist** — `urlHelper.buildServerUrl` rejects non-http/https protocols

### Authentication
- **JWT lifetime reduced** — 30 days → 4 hours (limits stolen-token exposure window)
- **Refresh tokens** — 7-day refresh tokens (SHA-256 hashed in DB) issued on login and register
- **Rolling sessions** — refresh token rotated on every use; 7-day window resets with each app open
- **Silent refresh on startup** — expired access token triggers automatic refresh; no re-login prompt if refresh token is valid
- **Reactive 401 refresh** — all HTTP calls (renderer + main process) auto-retry with fresh token on 401
- **Offline compatibility** — expired token + unreachable server → app stays usable; locally installed games can still be launched
- **Server-side logout** — `POST /api/users/logout` called on logout; refresh token invalidated in DB immediately
- **Socket.io dynamic auth** — token fetched fresh from store on every connection attempt (covers reconnection after token rotation)
- **Socket auth error recovery** — `connect_error` with auth failure triggers a token refresh before the next reconnect attempt

### Performance
- **`calculateDirSize` deduplicated** — single implementation in `dirSize.js` (was duplicated in `gameEngine.js` and `game.handlers.js`); I/O concurrency capped at 32 to prevent thrashing; hard limit at 50,000 files
- **IPC progress rate** — install/download progress events throttled from 100ms → 250ms interval
- **Production bundle fix** — `framer-motion` and `dayjs` moved from `devDependencies` to `dependencies`

### Architecture
- `rawRequest.js` — minimal worker-safe HTTP client (no Electron APIs, no store); used by both `httpClient.js` and worker threads in `gameEngine.js`
- `tokenStore.js` — safeStorage-backed token persistence with transparent plaintext fallback
- `tlsHelper.js` — `isTrustedServerHost()` utility centralising TLS bypass decisions
- `httpClient.js` — refactored as thin layer over `rawRequest.js` with 401 auto-refresh; no more inline http/https boilerplate
- `store.js` — lazy Proxy initialisation ensures `safeStorage.isEncryptionAvailable()` is called after `app.whenReady()`
- Auto-updater — migrated to GitHub Releases provider; `app-update.yml` embedded at build time by electron-builder; fork override via `UPDATE_GITHUB_OWNER` / `UPDATE_GITHUB_REPO` env vars

### Bug Fixes
- `addedDate` → `addedAt` in server game sort queries (matched actual schema field name)
- `fs.promises.rmdir` (deprecated) → `fs.promises.rm({ recursive: true, force: true })`
- `store-clear` now also wipes `userToken` and `refreshToken` (tokens survived store clear before)
- `installGame` / `uninstallGame` worker settle guard — `resolve()` and `reject()` can no longer both be called on the same promise
- `mod.handlers.js` — token read via `getToken()` (safeStorage-aware) instead of raw `store.get("userToken")`
- Dead code removed — `useFetchWithAuth.js` referenced an invalid import path and an undefined env var

### Backend
- `POST /api/users/refresh` — new endpoint for access token renewal using a stored refresh token
- `POST /api/users/register` — now issues a refresh token alongside the access token (was access-token only)
- `POST /api/users/logout` — now invalidates the refresh token in DB (`refreshTokenHash: null`)
- `userModel` — added `refreshTokenHash` (String, select: false) and `refreshTokenExpiresAt` (Date, select: false) fields; `setRefreshToken()` and `verifyRefreshToken()` instance methods
- Error detail leak fixed — `error.message` only included in responses when `NODE_ENV !== "production"`

### Upgrade Notes
- **Existing users (0.9.0 → 1.0.0)** — users will need to log in once after upgrading; their account has no `refreshTokenHash` in the DB until first login with the new version
- **Twitch credentials** — if your Twitch Client ID/Secret were previously committed to git, rotate them at <https://dev.twitch.tv/console>
- **JWT_TOKEN** — rotate your `JWT_TOKEN` in `.env`; all existing sessions will be invalidated
