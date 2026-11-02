import { env } from "$env/dynamic/private";
import { fetchCatalog } from "./catalog";
import { cacheCatalog, cleanupScoreCache } from "./score-cache";
import type { Score } from "$lib/types";

let snapshot: { scores: Score[]; error: string | null; refreshedAt: number | null } = {
  scores: [],
  error: null,
  refreshedAt: null
};
let refreshing: Promise<void> | null = null;

export async function refreshCatalog(): Promise<void> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const share = env.NEXTCLOUD_SHARE_URL;
    if (!share) {
      snapshot = { ...snapshot, error: "NEXTCLOUD_SHARE_URL is not configured." };
      return;
    }
    try {
      const scores = await fetchCatalog(share, Number(env.NEXTCLOUD_TIMEOUT_MS ?? 15000));
      snapshot = { scores: await cacheCatalog(scores), error: null, refreshedAt: Date.now() };
      await cleanupScoreCache();
    } catch (error) {
      snapshot = { ...snapshot, error: error instanceof Error ? error.message : "The score catalog could not be refreshed." };
      console.error("Catalog refresh failed", error);
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export function getCatalogSnapshot() {
  return snapshot;
}

export function startCatalogPolling(): void {
  void refreshCatalog();
  setInterval(() => void refreshCatalog(), Number(env.NEXTCLOUD_POLL_MS ?? 300000)).unref?.();
}
