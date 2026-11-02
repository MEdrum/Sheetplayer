import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Settings } from "$lib/types";

export const defaultSettings: Settings = {
  voiceVolumes: {},
  emphasizedVoices: [],
  mutedVoices: [],
  tempo: 100,
  globalAudioSource: "virtual",
  voiceMixes: {}
};

export function isSettings(value: unknown): value is Settings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Partial<Settings>;
  return typeof settings.tempo === "number"
    && settings.tempo >= 20
    && settings.tempo <= 300
    && (settings.globalAudioSource === "virtual" || settings.globalAudioSource === "recorded")
    && !!settings.voiceVolumes
    && typeof settings.voiceVolumes === "object"
    && Object.values(settings.voiceVolumes).every((volume) => typeof volume === "number" && volume >= 0 && volume <= 1)
    && Array.isArray(settings.emphasizedVoices)
    && settings.emphasizedVoices.every((voice) => typeof voice === "string")
    && Array.isArray(settings.mutedVoices)
    && settings.mutedVoices.every((voice) => typeof voice === "string");
}

export class SettingsStore {
  constructor(private readonly directory = "./data") {}

  async get(sessionId: string): Promise<Settings> {
    try {
      return { ...defaultSettings, ...JSON.parse(await readFile(join(this.directory, `${sessionId}.json`), "utf8")) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(defaultSettings);
      throw error;
    }
  }

  async save(sessionId: string, settings: Settings): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, `${sessionId}.json`), `${JSON.stringify(settings)}\n`, { mode: 0o600 });
  }

  async clear(sessionId: string): Promise<void> {
    try {
      await unlink(join(this.directory, `${sessionId}.json`));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
