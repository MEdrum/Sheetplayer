import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { fetchCatalog } from "$lib/server/catalog";
import type { RequestHandler } from "./$types";

let cached = { scores: [] as Awaited<ReturnType<typeof fetchCatalog>>, error: null as string | null, refreshedAt: null as number | null };

export const GET: RequestHandler = async () => {
  const share = env.NEXTCLOUD_SHARE_URL;
  if (!share) return json({ ...cached, error: "NEXTCLOUD_SHARE_URL is not configured." });
  if (!cached.refreshedAt || Date.now() - cached.refreshedAt > Number(env.NEXTCLOUD_POLL_MS ?? 300000)) {
    try {
      cached = { scores: await fetchCatalog(share, Number(env.NEXTCLOUD_TIMEOUT_MS ?? 15000)), error: null, refreshedAt: Date.now() };
    } catch (error) {
      cached = { ...cached, error: error instanceof Error ? error.message : "The score catalog could not be refreshed." };
    }
  }
  return json(cached);
};
