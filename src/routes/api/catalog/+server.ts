import { json } from "@sveltejs/kit";
import { getCatalogSnapshot, refreshCatalog } from "$lib/server/catalog-state";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  if (!getCatalogSnapshot().refreshedAt) await refreshCatalog();
  return json(getCatalogSnapshot());
};
