# Behavior and implementation matrix

This matrix distinguishes implemented behavior from work that remains before the application can claim complete score-player parity.

| Area | Status | Notes |
| --- | --- | --- |
| Dark responsive player layout | Implemented | Catalog and player adapt to desktop and narrow mobile viewports. |
| Searchable flat score catalog | Implemented | Recursive public WebDAV metadata, supported extensions, newest-first ordering. |
| Loading, empty, and catalog error states | Implemented | Last successful catalog is preserved when a refresh fails. |
| Anonymous browser settings | Implemented | Random cookie, server-side JSON settings, and clear-data action. |
| Installable PWA shell | Implemented | Manifest, icon, service worker, and browser checks. |
| Standard notation rendering | Implemented | AlphaTab renders MusicXML staff notation in the browser. |
| Lyrics under notes | Implemented by renderer | MusicXML lyrics are passed through to AlphaTab; representative choir fixture coverage remains. |
| Virtual-instrument playback and cursor | Partially implemented | AlphaTab supplies the browser synth/player and cursor; dedicated UI synchronization tests remain. |
| Recorded voice tracks | Partially implemented | Optional sibling voice stems are discovered through the score API and scheduled on one Web Audio clock; actual tracks and alignment metadata must exist in the share. |
| Metronome, looping, rehearsal, parts, transpose, zoom, layout, and display controls | Partial | AlphaTab supports several primitives, but dedicated application controls and regression coverage remain. |
| Keyboard, touch, fullscreen, focus, and accessibility states | Partial | Fullscreen, responsive layout, focusable controls, and mobile overflow are covered; score-specific interactions remain. |
| Cross-device settings synchronization | Intentionally deferred | Requires approval of pairing, recovery, revocation, conflict, and offline behavior. |
| Local uploads and conversion | Intentionally excluded | Initial deployment is read-only Nextcloud; upload architecture remains extensible. |
| Docker Compose deployment | Implemented | `docker compose up -d --build` builds the production image and persists settings. |
| Server-side five-minute polling and score conversion cache | Implemented | Persistent hash/path/mtime cache, eager recent conversion, lazy historical conversion, and three-month cleanup. |
