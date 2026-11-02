import { error, text } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { getMusicXml } from "$lib/server/score-cache";
import type { RequestHandler } from "./$types";
import { fetchCatalog } from "$lib/server/catalog";

export const GET: RequestHandler = async ({ params }) => {
  const scores = await fetchCatalog(env.NEXTCLOUD_SHARE_URL ?? "", Number(env.NEXTCLOUD_TIMEOUT_MS ?? 15000));
  const score = scores.find((item) => item.id === params.id);
  if (!score) throw error(404, "Score not found.");
  try {
    return text(await getMusicXml(score), { headers: { "content-type": "application/vnd.recordare.musicxml+xml" } });
  } catch (cause) {
    throw error(503, cause instanceof Error ? cause.message : "Score conversion is unavailable.");
  }
};
