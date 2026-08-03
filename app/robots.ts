import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/links";

/**
 * Let search engines index the public landing page, but keep the private app
 * (coach dashboard + client portal + APIs) out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/coach", "/dashboard", "/training", "/nutrition", "/checkins", "/progress", "/messages", "/api", "/login", "/portal-login"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
