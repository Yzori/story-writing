import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const FETCH_TIMEOUT = 10_000; // 10s

/**
 * GET /api/image-proxy?url=<encoded-url>
 * Proxies external images to prevent tracking pixels and strip referrer info.
 * Only allows HTTPS URLs to public hosts.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = applyRateLimit(request, session.user.id, "read", {
      max: 100,
      windowSeconds: 60,
    });
    if (limited) return limited;

    const url = request.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Protocol check
    if (parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Only HTTPS URLs allowed" }, { status: 400 });
    }

    // Block private/internal IPs
    const hostname = parsed.hostname.toLowerCase();
    const BLOCKED_HOSTS = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "::1",
      "metadata.google.internal",
      "169.254.169.254",
    ];
    if (
      BLOCKED_HOSTS.includes(hostname) ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.2") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.") ||
      hostname.startsWith("169.254.") ||
      hostname.startsWith("fe80:")
    ) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    }

    // URL length check
    if (url.length > 2000) {
      return NextResponse.json({ error: "URL too long" }, { status: 400 });
    }

    // Fetch the image
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "image/*",
          // Strip referrer
        },
        redirect: "follow",
      });
    } catch {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: 502 }
      );
    }

    // Validate content type
    const contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "Not an image" }, { status: 400 });
    }

    // Check content length
    const contentLength = parseInt(response.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image too large" }, { status: 400 });
    }

    // Stream the response
    const imageBuffer = await response.arrayBuffer();
    if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image too large" }, { status: 400 });
    }

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
