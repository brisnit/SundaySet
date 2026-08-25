import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { Readable } from "node:stream";

import { requireChurchContext } from "@/lib/auth/session";

/**
 * Serves files written by the development-only disk adapter.
 *
 * Never used in production — there BLOB_READ_WRITE_TOKEN is set and files are
 * served straight from Vercel Blob's own CDN URLs.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/uploads/[...path]">,
) {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  // Attachments belong to a church, so viewing one requires being signed in.
  await requireChurchContext();

  const { path: segments } = await params;
  const root = path.join(process.cwd(), ".uploads");
  const target = path.join(root, ...segments);

  // Reject anything that escapes the upload root.
  if (!path.resolve(target).startsWith(path.resolve(root) + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const info = await stat(target).catch(() => null);
  if (!info?.isFile()) return new NextResponse("Not found", { status: 404 });

  const stream = Readable.toWeb(
    createReadStream(target),
  ) as WebReadableStream<Uint8Array>;

  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(info.size),
      "Content-Disposition": "inline",
    },
  });
}
