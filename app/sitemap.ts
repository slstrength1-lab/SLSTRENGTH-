import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/links";

/** Sitemap — only the public landing page is indexable. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
