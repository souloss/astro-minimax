/**
 * Build category URL path segments for routing.
 * "教程/Rust" → ["教程", "Rust"] for page 1, ["教程", "Rust", "2"] for page 2
 */
export function getCategoryPathSegments(category: string, page = 1): string[] {
  const parts = category.split("/");
  if (page <= 1) return parts;
  return [...parts, String(page)];
}

/**
 * Build full category URL for links (each segment encoded).
 * "教程/Rust" → "/zh/categories/教程/Rust/" or "/zh/categories/教程/Rust/2/"
 */
export function getCategoryUrl(
  lang: string,
  category: string,
  page = 1
): string {
  const segments = getCategoryPathSegments(category, page);
  const encoded = segments.map((p) => encodeURIComponent(p)).join("/");
  return `/${lang}/categories/${encoded}/`;
}
