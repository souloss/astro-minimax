import type { CollectionEntry } from "astro:content";
import { SITE } from "virtual:astro-minimax/config";

const postFilter = ({ data }: CollectionEntry<"blog">) => {
  const margin = SITE.scheduledPostMargin ?? 0;
  const isPublishTimePassed =
    Date.now() > new Date(data.pubDatetime).getTime() - margin;
  return !data.draft && (import.meta.env.DEV || isPublishTimePassed);
};

export default postFilter;
