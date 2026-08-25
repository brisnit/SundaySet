import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  UploadError,
  assertUploadable,
  getStorage,
  storageStatus,
} from "@/lib/storage";

const pdf = (name: string, bytes: Buffer | number = Buffer.from("%PDF-1.4\n%%EOF")) =>
  new File(
    [new Uint8Array(typeof bytes === "number" ? Buffer.alloc(bytes) : bytes)],
    name,
    { type: "application/pdf" },
  );

afterAll(async () => {
  await rm(path.join(process.cwd(), ".uploads", "charts", "vitest"), {
    recursive: true,
    force: true,
  });
});

describe("upload validation", () => {
  it("accepts a reasonable PDF", () => {
    expect(() => assertUploadable(pdf("chart.pdf"))).not.toThrow();
  });

  it("rejects a non-PDF, whatever the extension says", () => {
    const txt = new File([Buffer.from("x")], "chart.pdf", { type: "text/plain" });
    expect(() => assertUploadable(txt)).toThrowError(UploadError);
  });

  it("rejects an empty file", () => {
    expect(() => assertUploadable(pdf("empty.pdf", Buffer.alloc(0)))).toThrowError(
      UploadError,
    );
  });

  it("rejects a file over the size limit and says how big it was", () => {
    try {
      assertUploadable(pdf("big.pdf", MAX_UPLOAD_BYTES + 1024));
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(UploadError);
      expect((e as UploadError).message).toMatch(/8MB/);
    }
  });

  it("only allows PDFs for now", () => {
    expect([...ALLOWED_UPLOAD_TYPES]).toEqual(["application/pdf"]);
  });
});

describe("storage adapter", () => {
  it("reports itself available in development without a Blob token", () => {
    const status = storageStatus();
    expect(status.available).toBe(true);
    expect(status.usingLocalFallback).toBe(true);
  });

  it("stores and removes a file, round-tripping the contents", async () => {
    const storage = getStorage();
    const body = Buffer.from("%PDF-1.4\nround trip\n%%EOF");
    const stored = await storage.put(pdf("my chart.pdf", body), "charts/vitest");

    expect(stored.filename).toBe("my chart.pdf");
    expect(stored.sizeBytes).toBe(body.byteLength);
    expect(stored.url.startsWith("/api/uploads/charts/vitest/")).toBe(true);

    const onDisk = path.join(
      process.cwd(),
      ".uploads",
      stored.url.replace("/api/uploads/", ""),
    );
    expect(new Uint8Array(await readFile(onDisk))).toEqual(new Uint8Array(body));

    await storage.remove(stored.url);
    await expect(readFile(onDisk)).rejects.toThrow();
  });

  it("sanitises the stored filename", async () => {
    // A filename must never be able to steer the write out of its directory.
    const stored = await getStorage().put(
      pdf("../../escape me!.pdf"),
      "charts/vitest",
    );
    expect(stored.url).not.toContain("..");
    expect(stored.url.startsWith("/api/uploads/charts/vitest/")).toBe(true);
    await getStorage().remove(stored.url);
  });

  it("refuses to fall back to local disk in production", async () => {
    // Serverless has no durable filesystem; failing loudly beats losing files.
    const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.BLOB_READ_WRITE_TOKEN;
    try {
      expect(() => getStorage()).toThrowError(UploadError);
      expect(storageStatus().available).toBe(false);
      expect(storageStatus().reason).toMatch(/BLOB_READ_WRITE_TOKEN/);
    } finally {
      vi.unstubAllEnvs();
      if (originalToken) process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    }
  });

  it("uses Vercel Blob whenever a token is present", () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test");
    try {
      expect(getStorage().name).toBe("vercel-blob");
      expect(storageStatus().usingLocalFallback).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
