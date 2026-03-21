import { auth } from "@/server/auth";
import { NextResponse } from "next/server";
import { validateCsrf } from "@/server/csrf";

const protectedPaths = ["/write", "/dashboard", "/create"];
const protectedPatterns = [/\/profile\/[^/]+\/edit/];
const authPages = ["/login", "/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // CSRF protection for API routes with mutating methods
  if (pathname.startsWith("/api/")) {
    const csrfResult = validateCsrf(req);
    if (csrfResult) return csrfResult;
  }

  // Check if the path requires authentication
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
    || protectedPatterns.some((pattern) => pattern.test(pathname));
  const isAuthPage = authPages.some((path) => pathname.startsWith(path));

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
});

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
