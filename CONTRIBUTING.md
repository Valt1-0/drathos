# Contributing to Drathos

Thank you for your interest in contributing to Drathos!

## Development Setup

**Prerequisites**: Node.js 20+, npm, Git. On Linux, Wine is required to test Wine game launching.

```bash
git clone https://github.com/Valt1-0/drathos.git
cd drathos
npm install
cp .env.example .env          # fill in your local backend URL
npm run dev
```

The app starts in Electron dev mode with Vite HMR. The renderer runs at `http://localhost:5173` and the main process reloads on file changes.

**Backend**: You need a running [drathos-backend](https://github.com/Valt1-0/drathos-backend) instance. See its README for setup instructions.

## Project Structure

```
src/
  main/           # Electron main process
    ipc/          # IPC handlers (one file per domain)
    utils/        # Shared utilities (httpClient, tokenStore, etc.)
    app/          # Security, validation, window management
  renderer/src/   # React renderer
    pages/        # Route-level components
    components/   # Shared UI components
    contexts/     # React contexts (auth, notifications)
    api/          # Fetch wrappers for backend calls
    i18n/locales/ # Translation files (en, fr, de, es)
  preload/        # contextBridge API exposed to renderer
```

## Making Changes

- **Main process changes** (src/main/): restart the Electron process (`Ctrl+R` in the app or restart `npm run dev`)
- **Renderer changes** (src/renderer/): hot-reloaded automatically
- **IPC changes**: update both the handler in `src/main/ipc/` and the preload exposure in `src/preload/index.js`

## i18n

All user-visible strings must be added to all four locale files: `en.json`, `fr.json`, `de.json`, `es.json`. Use the existing key structure (nested namespaces like `common.save`, `games.title`).

## Security

- All IPC handlers go through `secureHandle()` — do not bypass it
- Validate and sanitize any file path received from the renderer using `validateAndResolvePath()`
- Do not add new external hostnames to renderer fetch calls without updating the CSP in `src/main/index.js`
- Report vulnerabilities privately via [SECURITY.md](SECURITY.md)

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Keep changes focused — one feature or fix per PR
3. Test on your target platform (Windows / Linux)
4. Update locale files if you add or change any UI text
5. Open a PR against `main` with a clear description of what and why

## Build

```bash
npm run dist:win    # Windows (NSIS + ZIP)
npm run dist:linux  # Linux (AppImage + DEB + PACMAN)
npm run dist:mac    # macOS (DMG)
```

Builds output to `dist/`. A `GH_TOKEN` with `repo` scope is required only for `npm run release` (publishing to GitHub Releases).
