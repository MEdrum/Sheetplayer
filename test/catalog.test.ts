import assert from "node:assert/strict";
import test from "node:test";
import { parseDavResponse, scoreFromDavEntry, sortScores, webDavUrl } from "../src/catalog.js";

test("discovers supported score formats and ignores unrelated files", () => {
  assert.equal(scoreFromDavEntry("/choir/song.musicxml", null, 10)?.format, "musicxml");
  assert.equal(scoreFromDavEntry("/choir/readme.pdf", null, 10), null);
});

test("sorts newest first and uses deterministic paths without timestamps", () => {
  const old = scoreFromDavEntry("/old.mscz", "2024-01-01T00:00:00Z", 1)!;
  const newest = scoreFromDavEntry("/new.mxl", "2025-01-01T00:00:00Z", 1)!;
  const unknownA = scoreFromDavEntry("/b.musicxml", null, 1)!;
  const unknownB = scoreFromDavEntry("/a.musicxml", null, 1)!;
  assert.deepEqual(sortScores([old, unknownA, newest, unknownB]).map((score) => score.path), ["/new.mxl", "/old.mscz", "/a.musicxml", "/b.musicxml"]);
});

test("parses recursive WebDAV responses", () => {
  const xml = `<d:multistatus xmlns:d="DAV:"><d:response><d:href>/public/dir/song%20one.musicxml</d:href><d:propstat><d:prop><d:getlastmodified>Wed, 01 Jan 2025 00:00:00 GMT</d:getlastmodified><d:getcontentlength>42</d:getcontentlength></d:prop></d:propstat></d:response></d:multistatus>`;
  assert.equal(parseDavResponse(xml)[0].name, "song one.musicxml");
  assert.equal(parseDavResponse(xml)[0].size, 42);
});

test("maps a public share URL to its read-only WebDAV endpoint", () => {
  assert.equal(webDavUrl("https://cloud.example.test/s/share-token").pathname, "/public.php/dav/files/share-token");
  assert.throws(() => webDavUrl("https://cloud.example.test/folder"), /public share URL/);
});
