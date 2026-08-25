import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * File storage behind an adapter.
 *
 * Production uses Vercel Blob: serverless has no writable filesystem that
 * survives a request, so anything written locally would vanish. A local-disk
 * adapter exists ONLY so uploads are usable in development before a Blob token
 * is configured — it refuses to run in production rather than silently
 * "working" and losing files.
 */
export type StoredFile = {
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type StorageAdapter = {
  readonly name: string;
  put(file: File, keyPrefix: string): Promise<StoredFile>;
  remove(url: string): Promise<void>;
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ["application/pdf"] as const;

export class UploadError extends Error {}

/** Shared validation, so every adapter enforces the same rules. */
export function assertUploadable(file: File) {
  if (file.size === 0) throw new UploadError("That file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 8MB.`,
    );
  }
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    throw new UploadError("Chord charts must be PDF files.");
  }
}

const LOCAL_DIR = path.join(process.cwd(), ".uploads");

const localStorage: StorageAdapter = {
  name: "local-dev-disk",
  async put(file, keyPrefix) {
    assertUploadable(file);
    const id = randomUUID();
    // Separators are stripped, dot runs collapsed and leading dots removed, so
    // the stored name can never be a traversal fragment. The serving route
    // independently re-checks that the resolved path stays under the root.
    const safe =
      file.name
        .replace(/[^\w.\-]+/g, "_")
        .replace(/\.{2,}/g, ".")
        .slice(-80)
        .replace(/^[.\-]+/, "") || "chart.pdf";
    const dir = path.join(LOCAL_DIR, keyPrefix);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, `${id}-${safe}`),
      Buffer.from(await file.arrayBuffer()),
    );
    return {
      url: `/api/uploads/${keyPrefix}/${id}-${safe}`,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    };
  },
  async remove(url) {
    const rel = url.replace(/^\/api\/uploads\//, "");
    await unlink(path.join(LOCAL_DIR, rel)).catch(() => {});
  },
};

const blobStorage: StorageAdapter = {
  name: "vercel-blob",
  async put(file, keyPrefix) {
    assertUploadable(file);
    const { put } = await import("@vercel/blob");
    const result = await put(`${keyPrefix}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return {
      url: result.url,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    };
  },
  async remove(url) {
    const { del } = await import("@vercel/blob");
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
  },
};

export function storageStatus() {
  const hasToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const isProd = process.env.NODE_ENV === "production";
  return {
    available: hasToken || !isProd,
    usingLocalFallback: !hasToken && !isProd,
    reason: hasToken
      ? null
      : isProd
        ? "File uploads need BLOB_READ_WRITE_TOKEN to be set."
        : null,
  };
}

export function getStorage(): StorageAdapter {
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobStorage;
  if (process.env.NODE_ENV === "production") {
    throw new UploadError(
      "File uploads are not configured. Set BLOB_READ_WRITE_TOKEN.",
    );
  }
  return localStorage;
}
