import type { CollectionEntry } from "astro:content";
import postFilter from "./postFilter";
import { slugifyStr } from "./slugify";

export interface SeriesInfo {
  name: string;
  slug: string;
  posts: CollectionEntry<"blog">[];
  description?: string;
  totalPosts: number;
  latestDate: Date;
}

function slugifySeries(name: string): string {
  return slugifyStr(name);
}

export function getSeriesFromPosts(
  posts: CollectionEntry<"blog">[]
): SeriesInfo[] {
  const seriesMap = new Map<string, CollectionEntry<"blog">[]>();

  posts.filter(postFilter).forEach(post => {
    const series = post.data.series;
    if (!series) return;
    const existing = seriesMap.get(series.name) ?? [];
    existing.push(post);
    seriesMap.set(series.name, existing);
  });

  return Array.from(seriesMap.entries())
    .map(([name, seriesPosts]) => {
      const sorted = seriesPosts.sort(
        (a, b) => (a.data.series?.order ?? 0) - (b.data.series?.order ?? 0)
      );
      const latestDate = sorted.reduce((latest, p) => {
        const d = new Date(p.data.modDatetime ?? p.data.pubDatetime);
        return d > latest ? d : latest;
      }, new Date(0));

      return {
        name,
        slug: slugifySeries(name),
        posts: sorted,
        totalPosts: sorted.length,
        latestDate,
      };
    })
    .sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());
}

export function getSeriesByName(
  posts: CollectionEntry<"blog">[],
  name: string
): SeriesInfo | undefined {
  return getSeriesFromPosts(posts).find(s => s.name === name);
}
