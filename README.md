# Sheetplayer

Sheetplayer is a self-hostable SvelteKit score catalog and player shell for choirs. It has no accounts, payment features, tracking, or local upload flow.

## Getting started

Requires Node.js 20 or newer.

```sh
npm install
cp .env.example .env
npm run dev
```

Set `NEXTCLOUD_SHARE_URL` to a public, read-only Nextcloud share ending in `/s/<token>`. The server uses the share's recursive WebDAV `PROPFIND` endpoint and never writes to the share.

## Docker deployment

Copy `.env.example` to `.env`, set `NEXTCLOUD_SHARE_URL`, and start the production container:

```sh
docker compose up -d --build
```

The application is available at `http://localhost:3000` by default. Settings persist in the named `sheetplayer-data` volume. Stop it with `docker compose down`; use `docker compose down -v` only when intentionally deleting stored settings.

## Architecture

- SvelteKit server routes provide `GET /api/catalog` and `GET|PUT|DELETE /api/settings`.
- `hooks.server.ts` creates a cryptographically random anonymous browser cookie.
- Settings are stored as mode-0600 JSON files under `DATA_DIR` and retained until the user chooses **Clear data**.
- The browser owns score selection and player state; the server only provides metadata and settings.
- The app includes a web manifest, installable icon, and service worker shell cache for PWA installation.

## Commands

```sh
npm run check
npm test
npm run test:e2e
npm run build
npm run preview
```

## Deployment

Build with `npm ci && npm run build`, then run `node build` behind a TLS-terminating reverse proxy. Alternatively use `docker compose up -d --build`. Persist `DATA_DIR`; do not expose it as a static directory.

Browser tests cover both a 1440px desktop viewport and an iPhone 13 viewport. They verify that primary controls remain visible and that the responsive layout does not introduce horizontal overflow.

## Current limitations

Catalog discovery supports `.musicxml`, `.xml`, `.mxl`, and `.mscz`, with newest-first ordering and deterministic path fallback when timestamps are unavailable. A notation engine and audio playback engine still need to be selected and integrated; the UI labels this boundary instead of claiming unsupported rendering. Cross-device synchronization is intentionally deferred pending approval of pairing, recovery, conflict, and revocation behavior.

The implementation status is tracked in [`PARITY.md`](./PARITY.md). It is not yet a complete score player: notation rendering, audio playback, and score-specific controls remain follow-up work. The initial scope intentionally excludes local uploads and paid or hosted conversion services.
