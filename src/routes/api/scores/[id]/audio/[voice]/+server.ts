import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { webDavUrl } from "$lib/server/catalog";
import { getCatalogSnapshot, refreshCatalog } from "$lib/server/catalog-state";
import type { RequestHandler } from "./$types";

const voices = /^[a-z0-9-]+$/i;
const extensions = ["wav", "mp3", "ogg", "m4a"];

export const GET: RequestHandler = async ({ params, fetch }) => {
  if (!voices.test(params.voice)) throw error(400, "Invalid voice name.");
  if (!getCatalogSnapshot().refreshedAt) await refreshCatalog();
  const score = getCatalogSnapshot().scores.find((item) => item.id === params.id);
  if (!score || !env.NEXTCLOUD_SHARE_URL) throw error(404, "Score not found.");
  const slash = score.path.lastIndexOf("/");
  const directory = score.path.slice(0, slash + 1);
  const filename = score.path.slice(slash + 1).replace(/\.[^.]+$/, "");
  const candidates = extensions.map((extension) => `${directory}${filename}.${params.voice}.${extension}`);
  for (const candidate of candidates) {
    const response = await fetch(new URL(candidate, webDavUrl(env.NEXTCLOUD_SHARE_URL).origin));
    if (response.ok) {
      return new Response(response.body, {
        headers: {
          "content-type": response.headers.get("content-type") ?? "application/octet-stream",
          "cache-control": "public, max-age=3600"
        }
      });
    }
  }
  throw error(404, `No recorded ${params.voice} track exists for this score.`);
};
