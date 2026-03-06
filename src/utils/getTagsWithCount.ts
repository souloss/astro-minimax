import type { CollectionEntry } from "astro:content";
import { slugifyStr } from "./slugify";
import postFilter from "./postFilter";

interface TagWithCount {
  tag: string;
  tagName: string;
  count: number;
}

const getTagsWithCount = (posts: CollectionEntry<"blog">[]) => {
  const tagMap = new Map<string, { tagName: string; count: number }>();

  posts
    .filter(postFilter)
    .flatMap(post => post.data.tags)
    .forEach(tag => {
      const slug = slugifyStr(tag);
      const existing = tagMap.get(slug);
      if (existing) {
        existing.count++;
      } else {
        tagMap.set(slug, { tagName: tag, count: 1 });
      }
    });

  const tags: TagWithCount[] = Array.from(tagMap.entries())
    .map(([tag, data]) => ({
      tag,
      tagName: data.tagName,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count);

  return tags;
};

export default getTagsWithCount;
