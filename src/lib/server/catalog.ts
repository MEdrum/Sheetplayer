import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import type { Score, ScoreFormat } from "$lib/types";

const formats: Record<string, ScoreFormat> = {
  ".musicxml": "musicxml",
  ".xml": "musicxml",
  ".mxl": "mxl",
  ".mscz": "mscz"
};

export function scoreFromDavEntry(path: string, modifiedAt: string | null, size: number | null): Score | null {
  const name = path.split("/").filter(Boolean).at(-1) ?? "";
  const format = formats[name.slice(name.lastIndexOf(".")).toLowerCase()];
  if (!format) return null;
  return {
    id: createHash("sha256").update(path).digest("hex").slice(0, 20),
    name,
    path,
    format,
    modifiedAt,
    size
  };
}

export function sortScores(scores: Score[]): Score[] {
  return [...scores].sort((a, b) => {
    if (a.modifiedAt && b.modifiedAt) {
      const difference = Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt);
      if (Number.isFinite(difference) && difference !== 0) return difference;
    } else if (a.modifiedAt) return -1;
    else if (b.modifiedAt) return 1;
    return a.path.localeCompare(b.path);
  });
}

export function webDavUrl(shareUrl: string): URL {
  const url = new URL(shareUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("The share URL must use HTTP or HTTPS.");
  const match = url.pathname.match(/^(.*\/s\/)([^/]+)\/?$/i);
  if (!match) throw new Error("The share URL must end in /s/<token>.");
  url.pathname = `/public.php/dav/files/${match[2]}`;
  url.search = "";
  return url;
}

export function parseDavResponse(xml: string): Score[] {
  const parsed = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    processEntities: false
  }).parse(xml);
  const responses = parsed.multistatus?.response ?? [];
  const entries = Array.isArray(responses) ? responses : [responses];
  return sortScores(entries.flatMap((entry) => {
    const href = typeof entry.href === "string" ? decodeURIComponent(entry.href) : null;
    if (!href) return [];
    const prop = Array.isArray(entry.propstat) ? entry.propstat[0]?.prop : entry.propstat?.prop;
    const score = scoreFromDavEntry(
      href.replace(/^https?:\/\/[^/]+/i, ""),
      prop?.getlastmodified ?? null,
      Number.isFinite(Number(prop?.getcontentlength)) ? Number(prop.getcontentlength) : null
    );
    return score ? [score] : [];
  }));
}

export async function fetchCatalog(shareUrl: string, timeoutMs: number): Promise<Score[]> {
  const response = await fetch(webDavUrl(shareUrl), {
    method: "PROPFIND",
    headers: { depth: "infinity", "content-type": "application/xml" },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`Nextcloud returned HTTP ${response.status}.`);
  return parseDavResponse(await response.text());
}
