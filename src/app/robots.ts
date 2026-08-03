import type { MetadataRoute } from "next";

const APP_URL =
  process.env.APP_URL || process.env.NEXTAUTH_URL || "https://quiloria.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/settings",
          "/dashboard",
          "/write",
          "/create",
          "/notifications",
          "/welcome",
          "/mockup",
          "/mockup-",
          "/demo-adventure-v2",
          "/landing-experience",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
