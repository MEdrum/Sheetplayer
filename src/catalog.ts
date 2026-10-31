import { createHash } from "node:crypto";
import { URL } from "node:url";
import type { Score, ScoreFormat } from "./types.js";

const formats: Record<string, ScoreFormat> = {
  ".musicxml": "musicxml",
  ".xml": "musicxml",
  ".mxl": "mxl",
  ".mscz": "mscz"
};

export function scoreFromDavEntry(path: string, modifiedAt: string | null, size: number | null): Score | null {
  const name = path.split("/").filter(Boolean).at(-1) ?? "";
  const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
  const format = formats[extension];
  if (!format) return null;
  const id = createHash("sha256").update(path).digest("hex").slice(0, 20);
  return { id, name, path, format, modifiedAt, size };
}

export function sortScores(scores: Score[]): Score[] {
  return [...scores].sort((a, b) => {
    if (a.modifiedAt && b.modifiedAt) {
      const difference = Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt);
      if (difference !== 0 && Number.isFinite(difference)) return difference;
    } else if (a.modifiedAt) return -1;
    else if (b.modifiedAt) return 1;
    return a.path.localeCompare(b.path);
  });
}

export function webDavUrl(shareUrl: string): URL {
  const url = new URL(shareUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("NEXTCLOUD_SHARE_URL must use HTTP or HTTPS");
  }
  const sharePath = url.pathname.match(/^(.*\/s\/)([^/]+)\/?$/i);
  if (!sharePath) throw new Error("NEXTCLOUD_SHARE_URL must be a Nextcloud public share URL ending in /s/<token>");
  url.pathname = `${sharePath[1].replace(/\/$/, "")}/../public.php/dav/files/${sharePath[2]}`;
  url.pathname = new URL(url.pathname, `${url.origin}/`).pathname;
  return url;
}

export function parseDavResponse(xml: string): Score[] {
  const scores: Score[] = [];
  for (const response of xml.matchAll(/<d:response\b[\s\S]*?<\/d:response>/gi)) {
    const block = response[0];
    const href = /<d:href>([\s\S]*?)<\/d:href>/i.exec(block)?.[1];
    if (!href) continue;
    const path = decodeURIComponent(href.replace(/^https?:\/\/[^/]+/i, ""));
    const modifiedAt = /<d:getlastmodified>([\s\S]*?)<\/d:getlastmodified>/i.exec(block)?.[1] ?? null;
    const size = Number(/<d:getcontentlength>([\s\S]*?)<\/d:getcontentlength>/i.exec(block)?.[1] ?? NaN);
    const score = scoreFromDavEntry(path, modifiedAt, Number.isFinite(size) ? size : null);
    if (score) scores.push(score);
  }
  return sortScores(scores);
}
