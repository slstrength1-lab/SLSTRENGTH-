/**
 * Content analytics — powers the live Content Calendar card in the Business-OS
 * grid from the existing Content database. Pure.
 */

import type { ContentItem } from "../types";
import type { OwnerData } from "./context";

/** Upcoming content items, soonest publish date first. */
export function upcomingContent(data: OwnerData, limit = 5): ContentItem[] {
  return [...data.content]
    .filter((c) => c.status !== "Published")
    .sort((a, b) => (a.publishDate < b.publishDate ? -1 : 1))
    .slice(0, limit);
}

/** Count of content not yet published (in the pipeline). */
export function pipelineCount(data: OwnerData): number {
  return data.content.filter((c) => c.status !== "Published").length;
}
