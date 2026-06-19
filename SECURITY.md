# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately by opening a [GitHub Security Advisory](https://github.com/Valt1-0/drathos/security/advisories/new) with:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept if possible)
- Affected version(s)

You will receive an acknowledgement within 48 hours. We aim to release a fix within 14 days for critical issues.

Once a fix is released, the vulnerability will be disclosed publicly in the CHANGELOG and via a GitHub Security Advisory.

## Scope

The following are in scope:

- Electron main process / IPC handler vulnerabilities
- Path traversal or arbitrary file write via the renderer
- Token/credential exposure
- CSP bypass in the renderer

The following are out of scope:

- Vulnerabilities in the self-hosted backend (report those in the [drathos-backend](https://github.com/Valt1-0/drathos-backend) repo)
- Issues requiring physical access to the machine
- Denial of service against a personal self-hosted instance

## Security Design

Key security properties of the client:

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` on all windows
- All IPC handlers validate the sender origin via `secureHandle()`
- All file paths received from the renderer are validated and restricted to the configured download directory
- Credentials are stored via Electron `safeStorage` (Windows DPAPI / macOS Keychain / Linux secret-service)
- Self-signed TLS certificates are accepted only for the configured self-hosted backend hostname
- JWT access tokens expire after 4 hours; refresh tokens rotate every 7 days
