import { randomBytes } from "node:crypto";
import type { Handle } from "@sveltejs/kit";
import { startCatalogPolling } from "$lib/server/catalog-state";

startCatalogPolling();

export const handle: Handle = async ({ event, resolve }) => {
  const existing = event.cookies.get("sheetplayer_session");
  const sessionId = existing && /^[a-f0-9]{64}$/.test(existing) ? existing : randomBytes(32).toString("hex");
  event.locals.sessionId = sessionId;
  if (!existing) {
    event.cookies.set("sheetplayer_session", sessionId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true
    });
  }
  return resolve(event);
};
