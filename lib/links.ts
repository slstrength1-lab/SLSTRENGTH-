/**
 * Single source of truth for public links used across the marketing surface.
 */

/** Public lead application form (Google Form). Override with NEXT_PUBLIC_APPLICATION_FORM_URL. */
export const APPLICATION_FORM_URL =
  process.env.NEXT_PUBLIC_APPLICATION_FORM_URL ||
  "https://docs.google.com/forms/d/e/1FAIpQLSeYZML0pn7VL76YDYriiuuEosYS1dSX3Naz-rF9Zt5JGYAeYw/viewform";

/** Canonical site URL (for metadata / sitemap). Override with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://slstrength.netlify.app";
