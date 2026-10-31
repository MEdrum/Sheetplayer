import { error, json } from "@sveltejs/kit";
import { isSettings, SettingsStore } from "$lib/server/settings";
import type { RequestHandler } from "./$types";

const store = new SettingsStore();

export const GET: RequestHandler = async ({ locals }) => json(await store.get(locals.sessionId));

export const PUT: RequestHandler = async ({ request, locals }) => {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw error(400, "Settings must be valid JSON.");
  }
  if (!isSettings(value)) throw error(400, "Settings must include valid values and a tempo between 20 and 300.");
  await store.save(locals.sessionId, value);
  return json(value);
};

export const DELETE: RequestHandler = async ({ cookies, locals }) => {
  await store.clear(locals.sessionId);
  cookies.delete("sheetplayer_session", { path: "/" });
  return json({ cleared: true });
};
