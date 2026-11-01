# Behavior and implementation matrix

This matrix distinguishes implemented behavior from work that remains before the application can claim complete score-player parity.

| Area | Status | Notes |
| --- | --- | --- |
| Dark responsive player layout | Implemented | Catalog and player adapt to desktop and narrow mobile viewports. |
| Searchable flat score catalog | Implemented | Recursive public WebDAV metadata, supported extensions, newest-first ordering. |
| Loading, empty, and catalog error states | Implemented | Last successful catalog is preserved when a refresh fails. |
| Anonymous browser settings | Implemented | Random cookie, server-side JSON settings, and clear-data action. |
| Installable PWA shell | Implemented | Manifest, icon, service worker, and browser checks. |
| Score notation rendering | Not implemented | A notation engine and representative licensed fixtures still need to be selected and integrated. |
| Audio playback and cursor | Not implemented | Requires notation rendering and an audio/timing model. |
| Metronome, looping, rehearsal, parts, transpose, zoom, layout, and display controls | Not implemented | These controls need a complete score-player model and browser regression coverage. |
| Keyboard, touch, fullscreen, focus, and accessibility states | Partial | Fullscreen, responsive layout, focusable controls, and mobile overflow are covered; score-specific interactions remain. |
| Cross-device settings synchronization | Intentionally deferred | Requires approval of pairing, recovery, revocation, conflict, and offline behavior. |
| Local uploads and conversion | Intentionally excluded | Initial deployment is read-only Nextcloud; upload architecture remains extensible. |
| Docker Compose deployment | Implemented | `docker compose up -d --build` builds the production image and persists settings. |
