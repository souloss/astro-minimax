import type { CollectionEntry } from "astro:content";
import getSortedPosts from "./getSortedPosts";

const getPostsByCategory = (
  posts: CollectionEntry<"blog">[],
  category: string
) =>
  getSortedPosts(
    posts.filter(
      post =>
        post.data.category &&
        (post.data.category === category ||
          post.data.category.startsWith(category + "/"))
    )
  );

export default getPostsByCategory;
