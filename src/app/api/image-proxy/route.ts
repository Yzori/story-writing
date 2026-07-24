import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { auth } from "@/server/auth";
import { applyRateLimit } from "@/server/api-utils";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const FETCH_TIMEOUT = 10_000; // 10s
const MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.aws.internal",
]);

const blockedAddresses = new BlockList();

[
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
].forEach(([address, prefix]) => {
  blockedAddresses.addSubnet(address as string, prefix as number, "ipv4");
});

[
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
].forEach(([address, prefix]) => {
  blockedAddresses.addSubnet(address as string, prefix as number, "ipv6");
});

function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true;
  return blockedAddresses.check(address, family === 4 ? "ipv4" : "ipv6");
}

async function validateTarget(url: URL): Promise<void> {
  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS URLs allowed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed");
  }
  if (url.toString().length > 2000) {
    throw new Error("URL too long");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("URL not allowed");
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });

  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isBlockedAddress(address))
  ) {
    throw new Error("URL not allowed");
  }
}

async function fetchImage(url: URL, signal: AbortSignal): Promise<Response> {
  let currentUrl = url;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    await validateTarget(currentUrl);

    const response = await fetch(currentUrl, {
      signal,
      headers: { Accept: "image/*" },
      redirect: "manual",
    });

    if (!REDIRECT_STATUSES.has(response.status)) return response;

    const location = response.headers.get("location");
    if (!location || redirects === MAX_REDIRECTS) {
      await response.body?.cancel();
      throw new Error("Too many redirects");
    }

    await response.body?.cancel();
    currentUrl = new URL(location, currentUrl);
  }

  throw new Error("Too many redirects");
}

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

    try {
      await validateTarget(parsed);
    } catch {
      return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    let response: Response;
    try {
      response = await fetchImage(parsed, controller.signal);
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
    const contentType =
      response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "Not an image" }, { status: 400 });
    }

    // Check content length
    const contentLength = parseInt(response.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image too large" }, { status: 400 });
    }

    const imageBuffer = await response.arrayBuffer();
    if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image too large" }, { status: 400 });
    }

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Security-Policy": "default-src 'none'; sandbox",
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
