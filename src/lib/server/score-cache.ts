import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { unzipSync, strFromU8 } from "fflate";
import { env } from "$env/dynamic/private";
import { fetchCatalog, webDavUrl } from "./catalog";
import type { Score } from "$lib/types";

const execFileAsync = promisify(execFile);
const threeMonths = 1000 * 60 * 60 * 24 * 92;

interface CacheEntry {
  path: string;
  size: number | null;
  modifiedAt: string | null;
  hash: string;
  musicXmlFile: string;
  lastAccessedAt: number;
}

interface CacheIndex {
  entries: CacheEntry[];
}

function cacheRoot(): string {
  return join(env.DATA_DIR ?? "./data", "scores");
}

function indexPath(): string {
  return join(cacheRoot(), "index.json");
}

async function loadIndex(): Promise<CacheIndex> {
  try {
    return JSON.parse(await readFile(indexPath(), "utf8")) as CacheIndex;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { entries: [] };
    throw error;
  }
}

async function saveIndex(index: CacheIndex): Promise<void> {
  await mkdir(cacheRoot(), { recursive: true });
  await writeFile(indexPath(), `${JSON.stringify(index, null, 2)}\n`, { mode: 0o600 });
}

function sourceUrl(shareUrl: string, scorePath: string): URL {
  const davRoot = webDavUrl(shareUrl);
  return new URL(scorePath, davRoot.origin);
}

async function downloadSource(shareUrl: string, scorePath: string): Promise<Buffer> {
  const response = await fetch(sourceUrl(shareUrl, scorePath), {
    signal: AbortSignal.timeout(Number(env.NEXTCLOUD_TIMEOUT_MS ?? 15000))
  });
  if (!response.ok) throw new Error(`Nextcloud returned HTTP ${response.status} while reading ${scorePath}.`);
  return Buffer.from(await response.arrayBuffer());
}

async function convertMscz(source: Buffer, hash: string): Promise<string> {
  const root = cacheRoot();
  const input = join(root, `${hash}.mscz`);
  const output = join(root, `${hash}.musicxml`);
  await mkdir(root, { recursive: true });
  await writeFile(input, source, { flag: "wx", mode: 0o600 }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
  });
  const command = env.MUSESCORE_BIN ?? "musescore";
  try {
    await execFileAsync(command, ["-o", output, input], { timeout: 120000, maxBuffer: 1024 * 1024 });
  } catch (error) {
    throw new Error(`MSCZ conversion failed using ${command}. Install MuseScore Studio or set MUSESCORE_BIN.`);
  }
  return output;
}

async function ensureEntry(score: Score, eager: boolean): Promise<CacheEntry | null> {
  const index = await loadIndex();
  const existing = index.entries.find((entry) => entry.path === score.path && entry.modifiedAt === score.modifiedAt);
  if (existing) {
    existing.lastAccessedAt = Date.now();
    await saveIndex(index);
    return existing;
  }
  if (score.format !== "mscz") return null;
  if (!eager && score.modifiedAt && Date.now() - Date.parse(score.modifiedAt) > threeMonths) return null;
  const source = await downloadSource(env.NEXTCLOUD_SHARE_URL!, score.path);
  const hash = createHash("sha256").update(source).digest("hex");
  const byHash = index.entries.find((entry) => entry.hash === hash);
  const musicXmlFile = byHash?.musicXmlFile ?? await convertMscz(source, hash);
  const entry: CacheEntry = { path: score.path, size: score.size, modifiedAt: score.modifiedAt, hash, musicXmlFile, lastAccessedAt: Date.now() };
  index.entries = index.entries.filter((item) => item.path !== score.path);
  index.entries.push(entry);
  await saveIndex(index);
  return entry;
}

export async function cacheCatalog(scores: Score[]): Promise<Score[]> {
  const index = await loadIndex();
  const cutoff = Date.now() - threeMonths;
  const activePaths = new Set(scores.map((score) => score.path));
  index.entries = index.entries.filter((entry) => activePaths.has(entry.path) && entry.lastAccessedAt >= cutoff);
  for (const score of scores) {
    if (score.format !== "mscz") continue;
    try {
      await ensureEntry(score, Boolean(score.modifiedAt && Date.now() - Date.parse(score.modifiedAt) <= threeMonths));
    } catch (error) {
      console.error("Score conversion failed", { path: score.path, error });
    }
  }
  await saveIndex(index);
  const finalIndex = await loadIndex();
  return scores.map((score) => ({ ...score, ready: score.format !== "mscz" || finalIndex.entries.some((entry) => entry.path === score.path && entry.modifiedAt === score.modifiedAt) }));
}

export async function getMusicXml(score: Score): Promise<string> {
  if (score.format === "musicxml") {
    const source = await downloadSource(env.NEXTCLOUD_SHARE_URL!, score.path);
    return source.toString("utf8");
  }
  if (score.format === "mxl") {
    const source = await downloadSource(env.NEXTCLOUD_SHARE_URL!, score.path);
    const archive = unzipSync(source);
    const container = archive["META-INF/container.xml"];
    const rootFile = container ? /full-path="([^"]+)"/.exec(strFromU8(container))?.[1] : undefined;
    const musicXml = rootFile ? archive[rootFile] : Object.entries(archive).find(([name]) => /\.(musicxml|xml)$/i.test(name))?.[1];
    if (!musicXml) throw new Error("The MXL archive does not contain a MusicXML document.");
    return strFromU8(musicXml);
  }
  const entry = await ensureEntry(score, true);
  if (!entry) throw new Error(`Unsupported score format: ${score.format}`);
  const xml = await readFile(entry.musicXmlFile, "utf8");
  return xml;
}

export async function cleanupScoreCache(): Promise<void> {
  const index = await loadIndex();
  const cutoff = Date.now() - threeMonths;
  const keep = index.entries.filter((entry) => entry.lastAccessedAt >= cutoff);
  for (const entry of index.entries) {
    if (!keep.includes(entry)) await rm(entry.musicXmlFile, { force: true });
  }
  await saveIndex({ entries: keep });
  const files = await readdir(cacheRoot()).catch(() => []);
  const known = new Set(keep.flatMap((entry) => [entry.musicXmlFile, join(cacheRoot(), `${entry.hash}.mscz`), indexPath()]));
  for (const file of files) {
    const path = join(cacheRoot(), file);
    if (!known.has(path) && (await stat(path)).isFile()) await rm(path, { force: true });
  }
}
