import { describe, expect, it } from "vitest";
import { defaultSettings, isSettings } from "../src/lib/server/settings";

describe("settings validation", () => {
  it("accepts defaults", () => {
    expect(isSettings(defaultSettings)).toBe(true);
  });

  it("rejects invalid tempo and voice values", () => {
    expect(isSettings({ ...defaultSettings, tempo: 301 })).toBe(false);
    expect(isSettings({ ...defaultSettings, mutedVoices: ["soprano", 2] })).toBe(false);
    expect(isSettings({ ...defaultSettings, voiceVolumes: { soprano: 2 } })).toBe(false);
  });
});
