import { error, text } from "@sveltejs/kit";
import { getMusicXml } from "$lib/server/score-cache";
import { getCatalogSnapshot, refreshCatalog } from "$lib/server/catalog-state";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  if (!getCatalogSnapshot().refreshedAt) await refreshCatalog();
  const score = getCatalogSnapshot().scores.find((item) => item.id === params.id);
  if (!score) throw error(404, "Score not found.");
  try {
    return text(await getMusicXml(score), { headers: { "content-type": "application/vnd.recordare.musicxml+xml" } });
  } catch (cause) {
    throw error(503, cause instanceof Error ? cause.message : "Score conversion is unavailable.");
  }
};
