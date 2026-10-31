# Behavior and implementation matrix

This matrix records the first implementation boundary. “Not reproducible” means it is intentionally not claimed as complete.

| Area | Status | Notes |
| --- | --- | --- |
| Dark responsive player layout | Implemented | Catalog and player adapt to narrow viewports. |
| Searchable flat score catalog | Implemented | Recursive WebDAV metadata, supported extensions, newest-first ordering. |
| Loading and catalog error messaging | Implemented | Last successful catalog is preserved on refresh failure. |
| Anonymous browser settings | Implemented | Random cookie, server-side JSON settings, clear-data action. |
| Score notation rendering | Not reproducible in this increment | A proper MusicXML/MuseScore renderer still needs to be selected and integrated. |
| Audio playback, cursor, looping, metronome, parts, transpose | Not reproducible in this increment | Requires the renderer/audio model and representative fixtures. |
| Cross-device synchronization | Intentionally deferred | Requires approval of pairing/share/recovery/conflict behavior. |
| Local uploads and conversion | Intentionally excluded | Initial choir deployment is read-only Nextcloud. |
