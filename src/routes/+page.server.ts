import type { PageServerLoad } from "./$types";
import { defaultSettings, SettingsStore } from "$lib/server/settings";

export const load: PageServerLoad = async ({ locals }) => ({
  initialSettings: await new SettingsStore().get(locals.sessionId) ?? defaultSettings
});
