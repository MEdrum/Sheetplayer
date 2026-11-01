import { describe, expect, it } from "vitest";
import { parseDavResponse, scoreFromDavEntry, sortScores, webDavUrl } from "../src/lib/server/catalog";

describe("catalog discovery", () => {
  it("recognizes supported score formats", () => {
    expect(scoreFromDavEntry("/choir/song.musicxml", null, 10)?.format).toBe("musicxml");
    expect(scoreFromDavEntry("/choir/readme.pdf", null, 10)).toBeNull();
  });

  it("sorts by modification time with deterministic fallback", () => {
    const old = scoreFromDavEntry("/old.mscz", "2024-01-01T00:00:00Z", 1)!;
    const newest = scoreFromDavEntry("/new.mxl", "2025-01-01T00:00:00Z", 1)!;
    const unknownA = scoreFromDavEntry("/b.musicxml", null, 1)!;
    const unknownB = scoreFromDavEntry("/a.musicxml", null, 1)!;
    expect(sortScores([old, unknownA, newest, unknownB]).map((score) => score.path))
      .toEqual(["/new.mxl", "/old.mscz", "/a.musicxml", "/b.musicxml"]);
  });

  it("parses recursive WebDAV metadata", () => {
    const xml = `<d:multistatus xmlns:d="DAV:"><d:response><d:href>/public/song%20one.musicxml</d:href><d:propstat><d:prop><d:getlastmodified>Wed, 01 Jan 2025 00:00:00 GMT</d:getlastmodified><d:getcontentlength>42</d:getcontentlength></d:prop></d:propstat></d:response></d:multistatus>`;
    const [score] = parseDavResponse(xml);
    expect(score.name).toBe("song one.musicxml");
    expect(score.size).toBe(42);
  });

  it("parses WebDAV XML with repeated entity declarations safely", () => {
    const entities = Array.from({ length: 1001 }, (_, index) => `<!ENTITY e${index} "value">`).join("");
    const xml = `<?xml version="1.0"?><!DOCTYPE multistatus [${entities}]><d:multistatus xmlns:d="DAV:"><d:response><d:href>/song.mscz</d:href></d:response></d:multistatus>`;
    expect(parseDavResponse(xml)[0].name).toBe("song.mscz");
  });

  it("maps a public share to its WebDAV endpoint", () => {
    expect(webDavUrl("https://cloud.example.test/s/share-token").pathname)
      .toBe("/public.php/dav/files/share-token");
    expect(() => webDavUrl("https://cloud.example.test/folder")).toThrow(/end in/);
  });
});
