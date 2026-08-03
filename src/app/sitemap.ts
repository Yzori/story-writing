import type { MetadataRoute } from "next";

const APP_URL =
  process.env.APP_URL || process.env.NEXTAUTH_URL || "https://quiloria.app";

/*
 * Static surfaces only — story pages are numerous and access-gated in
 * ways the DB decides, so they're deliberately left to discovery via
 * /browse rather than enumerated here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/browse", priority: 0.9 },
    { path: "/pricing", priority: 0.7 },
    { path: "/about", priority: 0.6 },
    { path: "/help", priority: 0.5 },
    { path: "/register", priority: 0.5 },
    { path: "/terms", priority: 0.2 },
    { path: "/privacy", priority: 0.2 },
  ];

  return pages.map((p) => ({
    url: `${APP_URL}${p.path}`,
    changeFrequency: "weekly",
    priority: p.priority,
  }));
}
