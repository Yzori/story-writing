import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { validateCsrf } from "@/server/csrf";

const protectedPaths = ["/write", "/dashboard", "/create", "/admin", "/settings", "/roster/setup", "/campaign", "/creator"];
const protectedPatterns = [/\/profile\/[^/]+\/edit/];
const authPages = ["/login", "/register"];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CSRF protection for API routes with mutating methods
  // Skip CSRF for webhook routes (they use their own signature verification)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks/")) {
    const csrfResult = validateCsrf(req);
    if (csrfResult) return csrfResult;
  }

  // Check if the path requires authentication
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
    || protectedPatterns.some((pattern) => pattern.test(pathname));
  const isAuthPage = authPages.some((path) => pathname.startsWith(path));
  const needsAuthState = isProtected || isAuthPage;
  const token = needsAuthState
    ? await getToken({
        req,
        secret: process.env.AUTH_SECRET,
        secureCookie: process.env.NODE_ENV === "production",
      })
    : null;
  const isLoggedIn = !!token && token.invalid !== true;

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login/register
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
