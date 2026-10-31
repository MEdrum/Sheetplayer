import assert from "node:assert/strict";
import test from "node:test";
import { isSettings, newSettings, validSessionId } from "../src/settings.js";

test("validates anonymous session identifiers", () => {
  assert.equal(validSessionId("a".repeat(64)), true);
  assert.equal(validSessionId("not-a-session"), false);
});

test("accepts defaults and rejects invalid tempo", () => {
  const settings = newSettings();
  assert.equal(isSettings(settings), true);
  assert.equal(isSettings({ ...settings, tempo: 301 }), false);
  assert.equal(isSettings({ ...settings, mutedVoices: ["soprano", 2] }), false);
});
