import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

import { EXT_MIME, uploadDir } from "@/server/media";

/**
 * GET /api/media/[...path]
 *
 * Serves images written by `src/server/media.ts` from UPLOAD_DIR. Filenames
 * are content hashes, so the response is immutable: cache it forever.
 * No auth on purpose — see the access note in media.ts.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  // Traversal protection twice over: every segment must be a plain filename,
  // and the resolved path must stay inside UPLOAD_DIR.
  if (!segments?.length || segments.some((s) => !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s))) {
    return new NextResponse(null, { status: 404 });
  }
  const root = path.resolve(uploadDir());
  const abs = path.resolve(root, ...segments);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    return new NextResponse(null, { status: 404 });
  }

  const mime = EXT_MIME[path.extname(abs).slice(1).toLowerCase()];
  if (!mime) return new NextResponse(null, { status: 404 });

  try {
    const buf = await readFile(abs);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(buf.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
