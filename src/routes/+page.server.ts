import { env } from "$env/dynamic/private";
import type { PageServerLoad } from "./$types";
import { defaultSettings, SettingsStore } from "$lib/server/settings";

export const load: PageServerLoad = async ({ locals }) => ({
  initialSettings: await new SettingsStore(env.DATA_DIR ?? "./data").get(locals.sessionId) ?? defaultSettings
});
