# Sheetplayer

Sheetplayer is a self-hostable, anonymous score catalog and player shell for choirs. It has no accounts, payment features, tracking, or local upload flow.

## Table of contents

- [Getting started](#getting-started)
- [Overview](#overview)
- [Nextcloud catalog](#nextcloud-catalog)
- [Storage and privacy](#storage-and-privacy)
- [Development and tests](#development-and-tests)
- [Deployment](#deployment)
- [Design decisions and limitations](#design-decisions-and-limitations)

## Getting started

Requires Node.js 20 or newer.

```sh
npm install
cp .env.example .env
npm run build
npm start
```

Open `http://localhost:3000`. Set `NEXTCLOUD_SHARE_URL` to a public, read-only share URL to populate the catalog. The server uses the share's WebDAV `PROPFIND` endpoint recursively and never writes to the share.

## Overview

The HTTP server serves the accessible browser UI and these JSON endpoints:

- `GET /api/catalog` returns the cached flat catalog and any refresh error.
- `GET|PUT|DELETE /api/settings` reads, updates, or clears anonymous browser settings.

The browser receives a cryptographically random `sheetplayer_session` cookie on first settings access. It is an identifier only, not an authentication credential.

## Nextcloud catalog

Supported file extensions are `.musicxml`, `.xml`, `.mxl`, and `.mscz`. Entries are sorted by modification time, newest first; entries without timestamps use path order. Unsupported files are ignored. A failed refresh preserves the last successful catalog and reports an actionable error. Configure polling and request timeout with `NEXTCLOUD_POLL_MS` and `NEXTCLOUD_TIMEOUT_MS`.

## Storage and privacy

Settings are stored as one mode-0600 JSON file per anonymous session under `DATA_DIR` (default `./data`) and are retained until the user chooses **Clear data**. This implementation deliberately does not implement cross-device synchronization yet: the required options (revocable pairing code, server share token, and device transfer) need product approval for conflict and recovery behavior before introducing a share mechanism.

## Development and tests

```sh
npm run check
npm test
npm run build
```

## Deployment

Build the project with `npm ci && npm run build`, then run `NODE_ENV=production npm start` behind a TLS-terminating reverse proxy. Persist `DATA_DIR` and back it up according to the host's policy. Do not expose it as a static directory.

## Design decisions and limitations

- The backend intentionally uses Node's built-in HTTP and filesystem APIs to keep the first deployment small and auditable.
- Catalog discovery is complete for public WebDAV metadata, but score notation rendering and playback are not yet wired to a notation engine. The current player is an accessible integration shell and explicitly labels this limitation rather than claiming unsupported rendering.
- A parity checklist is maintained in [`PARITY.md`](./PARITY.md).
- No proprietary service dependency, payment flow, subscription language, or cloud conversion service is included.
