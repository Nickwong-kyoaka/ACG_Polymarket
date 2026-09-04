import type { MetadataRoute } from "next";

function siteOrigin() {
  const configured = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  try { return new URL(configured).origin; } catch { return "http://localhost:3000"; }
}

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/en/me", "/zh-Hant/me", "/en/create", "/zh-Hant/create", "/en/onboarding", "/zh-Hant/onboarding"] }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
