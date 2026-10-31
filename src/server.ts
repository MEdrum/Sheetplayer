import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDavResponse, sortScores, webDavUrl } from "./catalog.js";
import { isSettings, SettingsStore, validSessionId } from "./settings.js";
import type { Settings } from "./types.js";

const port = Number(process.env.PORT ?? 3000);
const publicDir = join(process.cwd(), "public");
const store = new SettingsStore(process.env.DATA_DIR ?? "./data");
let catalog: ReturnType<typeof sortScores> = [];
let catalogError: string | null = null;
let lastCatalogRefresh = 0;

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

function sessionId(request: IncomingMessage, response: ServerResponse): string {
  const cookie = request.headers.cookie?.match(/(?:^|;\s*)sheetplayer_session=([a-f0-9]{64})/)?.[1];
  if (validSessionId(cookie)) return cookie;
  const id = randomBytes(32).toString("hex");
  response.setHeader("set-cookie", `sheetplayer_session=${id}; Path=/; Max-Age=31536000; SameSite=Lax`);
  return id;
}

async function refreshCatalog(): Promise<void> {
  const share = process.env.NEXTCLOUD_SHARE_URL;
  if (!share) {
    catalog = [];
    catalogError = "NEXTCLOUD_SHARE_URL is not configured.";
    return;
  }
  try {
    const url = webDavUrl(share);
    const result = await fetch(url, {
      method: "PROPFIND",
      headers: { depth: "infinity", "content-type": "application/xml" },
      signal: AbortSignal.timeout(Number(process.env.NEXTCLOUD_TIMEOUT_MS ?? 15000))
    });
    if (!result.ok) throw new Error(`Nextcloud returned HTTP ${result.status}`);
    catalog = parseDavResponse(await result.text());
    catalogError = null;
    lastCatalogRefresh = Date.now();
  } catch (error) {
    catalogError = error instanceof Error ? error.message : "The score catalog could not be refreshed.";
  }
}

async function body(request: IncomingMessage): Promise<string> {
  let value = "";
  for await (const chunk of request) value += chunk;
  return value;
}

async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/api/catalog" && request.method === "GET") {
    if (Date.now() - lastCatalogRefresh > Number(process.env.NEXTCLOUD_POLL_MS ?? 300000)) await refreshCatalog();
    json(response, 200, { scores: catalog, error: catalogError, refreshedAt: lastCatalogRefresh || null });
    return;
  }
  if (url.pathname === "/api/settings" && request.method === "GET") {
    json(response, 200, await store.get(sessionId(request, response)));
    return;
  }
  if (url.pathname === "/api/settings" && request.method === "PUT") {
    let value: unknown;
    try {
      value = JSON.parse(await body(request));
    } catch {
      json(response, 400, { error: "Settings must be valid JSON." });
      return;
    }
    if (!isSettings(value)) {
      json(response, 400, { error: "Settings must include valid voice arrays and a tempo between 20 and 300." });
      return;
    }
    await store.save(sessionId(request, response), value as Settings);
    json(response, 200, value);
    return;
  }
  if (url.pathname === "/api/settings" && request.method === "DELETE") {
    const id = sessionId(request, response);
    await store.clear(id);
    response.setHeader("set-cookie", "sheetplayer_session=; Path=/; Max-Age=0; SameSite=Lax");
    json(response, 200, { cleared: true });
    return;
  }
  if (request.method !== "GET") {
    json(response, 405, { error: "Method not allowed." });
    return;
  }
  const file = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  try {
    const content = await readFile(join(publicDir, file));
    const type = file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "text/javascript" : "text/html";
    response.writeHead(200, { "content-type": `${type}; charset=utf-8` });
    response.end(content);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

createServer((request, response) => void handler(request, response).catch((error: unknown) => {
  console.error("Request failed", error);
  json(response, 500, { error: "The server could not complete the request." });
})).listen(port, () => console.log(`Sheetplayer listening on http://localhost:${port}`));
