import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  MediaError,
  externalizeFramesJson,
  externalizeImage,
  saveDataUrlImage,
} from "@/server/media";

// 1×1 transparent PNG
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const PNG_DATA_URL = `data:image/png;base64,${PNG_B64}`;

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "quiloria-media-"));
  process.env.UPLOAD_DIR = dir;
});

afterAll(() => {
  delete process.env.UPLOAD_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe("saveDataUrlImage", () => {
  it("writes the decoded bytes to a sharded content-addressed path", async () => {
    const url = await saveDataUrlImage(PNG_DATA_URL);
    expect(url).toMatch(/^\/api\/media\/img\/[0-9a-f]{2}\/[0-9a-f]{32}\.png$/);
    const rel = url.replace("/api/media/", "");
    const bytes = readFileSync(path.join(dir, rel));
    expect(bytes.equals(Buffer.from(PNG_B64, "base64"))).toBe(true);
  });

  it("is idempotent — same bytes, same URL", async () => {
    const a = await saveDataUrlImage(PNG_DATA_URL);
    const b = await saveDataUrlImage(PNG_DATA_URL);
    expect(a).toBe(b);
  });

  it("rejects non-image and malformed data URLs", async () => {
    await expect(saveDataUrlImage("data:text/html;base64,PGI+aGk8L2I+")).rejects.toThrow(MediaError);
    await expect(saveDataUrlImage("not a data url")).rejects.toThrow(MediaError);
  });
});

describe("externalizeImage", () => {
  it("passes through empty values and existing URLs", async () => {
    expect(await externalizeImage("")).toBe("");
    expect(await externalizeImage(null)).toBe(null);
    expect(await externalizeImage("/api/media/img/ab/cd.png")).toBe("/api/media/img/ab/cd.png");
  });

  it("converts a data URL", async () => {
    const url = await externalizeImage(PNG_DATA_URL);
    expect(url).toMatch(/^\/api\/media\//);
  });
});

describe("externalizeFramesJson", () => {
  it("converts data-URL frames and leaves URL frames alone", async () => {
    const frames = JSON.stringify([
      { id: "frame-1", imageData: PNG_DATA_URL },
      { id: "frame-2", imageData: "/api/media/img/aa/bb.png" },
      { id: "frame-3", imageData: "" },
    ]);
    const out = JSON.parse((await externalizeFramesJson(frames))!);
    expect(out[0].imageData).toMatch(/^\/api\/media\/img\//);
    expect(out[1].imageData).toBe("/api/media/img/aa/bb.png");
    expect(out[2].imageData).toBe("");
    expect(out[0].id).toBe("frame-1");
  });

  it("leaves payloads without data URLs untouched (no re-serialize)", async () => {
    const frames = JSON.stringify([{ id: "frame-1", imageData: "/api/media/img/aa/bb.png" }]);
    expect(await externalizeFramesJson(frames)).toBe(frames);
    expect(await externalizeFramesJson("")).toBe("");
    expect(await externalizeFramesJson(null)).toBe(null);
  });

  it("returns malformed JSON unchanged for the validation layer to reject", async () => {
    expect(await externalizeFramesJson("data: not json {")).toBe("data: not json {");
  });
});
