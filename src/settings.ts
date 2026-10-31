import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Settings } from "./types.js";

export const defaultSettings: Settings = {
  voiceVolumes: {},
  emphasizedVoices: [],
  mutedVoices: [],
  tempo: 100
};

export function validSessionId(value: string | undefined): value is string {
  return Boolean(value && /^[a-f0-9]{64}$/.test(value));
}

export function newSettings(): Settings {
  return structuredClone(defaultSettings);
}

export function isSettings(value: unknown): value is Settings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Partial<Settings>;
  return typeof settings.tempo === "number"
    && settings.tempo >= 20
    && settings.tempo <= 300
    && typeof settings.voiceVolumes === "object"
    && settings.voiceVolumes !== null
    && Object.entries(settings.voiceVolumes).every(([voice, volume]) => voice.length > 0 && typeof volume === "number" && volume >= 0 && volume <= 1)
    && Array.isArray(settings.emphasizedVoices)
    && settings.emphasizedVoices.every((voice) => typeof voice === "string")
    && Array.isArray(settings.mutedVoices)
    && settings.mutedVoices.every((voice) => typeof voice === "string");
}

export class SettingsStore {
  public constructor(private readonly directory: string) {}

  private file(sessionId: string): string {
    return join(this.directory, `${sessionId}.json`);
  }

  public async get(sessionId: string): Promise<Settings> {
    try {
      return { ...newSettings(), ...JSON.parse(await readFile(this.file(sessionId), "utf8")) } as Settings;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return newSettings();
      throw error;
    }
  }

  public async save(sessionId: string, settings: Settings): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.file(sessionId), `${JSON.stringify(settings)}\n`, { mode: 0o600 });
  }

  public async clear(sessionId: string): Promise<void> {
    const { unlink } = await import("node:fs/promises");
    try {
      await unlink(this.file(sessionId));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
