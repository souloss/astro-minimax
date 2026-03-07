import { SITE } from "@/config";

type TranslationKey =
  | "nav.home"
  | "nav.posts"
  | "nav.tags"
  | "nav.categories"
  | "nav.about"
  | "nav.friends"
  | "nav.archives"
  | "nav.search"
  | "post.featured"
  | "post.recentPosts"
  | "post.allPosts"
  | "post.prev"
  | "post.next"
  | "post.share"
  | "post.like"
  | "post.bookmark"
  | "post.series"
  | "post.editPage"
  | "post.readingMode"
  | "search.title"
  | "search.placeholder"
  | "search.filters"
  | "search.resetFilters"
  | "search.category"
  | "search.language"
  | "search.sortBy"
  | "search.tags"
  | "search.allCategories"
  | "search.allLanguages"
  | "pagination.prev"
  | "pagination.next"
  | "footer.running"
  | "footer.days"
  | "common.backToTop"
  | "common.goBack"
  | "common.notFound";

const translations: Record<string, Record<TranslationKey, string>> = {
  en: {
    "nav.home": "Home",
    "nav.posts": "Posts",
    "nav.tags": "Tags",
    "nav.categories": "Categories",
    "nav.about": "About",
    "nav.friends": "Friends",
    "nav.archives": "Archives",
    "nav.search": "Search",
    "post.featured": "Featured",
    "post.recentPosts": "Recent Posts",
    "post.allPosts": "All Posts",
    "post.prev": "Previous Post",
    "post.next": "Next Post",
    "post.share": "Share this post on:",
    "post.like": "Like",
    "post.bookmark": "Bookmark",
    "post.series": "Series",
    "post.editPage": "Edit page",
    "post.readingMode": "Reading Mode",
    "search.title": "Search",
    "search.placeholder": "Search any article...",
    "search.filters": "Advanced Filters",
    "search.resetFilters": "Reset Filters",
    "search.category": "Category",
    "search.language": "Language",
    "search.sortBy": "Sort By",
    "search.tags": "Tags",
    "search.allCategories": "All Categories",
    "search.allLanguages": "All Languages",
    "pagination.prev": "Prev",
    "pagination.next": "Next",
    "footer.running": "Running for",
    "footer.days": "days",
    "common.backToTop": "Back to Top",
    "common.goBack": "Go back",
    "common.notFound": "Page Not Found",
  },
  zh: {
    "nav.home": "首页",
    "nav.posts": "文章",
    "nav.tags": "标签",
    "nav.categories": "分类",
    "nav.about": "关于",
    "nav.friends": "友链",
    "nav.archives": "归档",
    "nav.search": "搜索",
    "post.featured": "精选文章",
    "post.recentPosts": "最近文章",
    "post.allPosts": "全部文章",
    "post.prev": "上一篇",
    "post.next": "下一篇",
    "post.share": "分享到：",
    "post.like": "喜欢",
    "post.bookmark": "收藏",
    "post.series": "系列",
    "post.editPage": "编辑此页",
    "post.readingMode": "沉浸式阅读",
    "search.title": "搜索",
    "search.placeholder": "搜索文章...",
    "search.filters": "高级筛选",
    "search.resetFilters": "重置筛选",
    "search.category": "分类",
    "search.language": "语言",
    "search.sortBy": "排序方式",
    "search.tags": "标签",
    "search.allCategories": "全部分类",
    "search.allLanguages": "全部语言",
    "pagination.prev": "上一页",
    "pagination.next": "下一页",
    "footer.running": "已运行",
    "footer.days": "天",
    "common.backToTop": "回到顶部",
    "common.goBack": "返回",
    "common.notFound": "页面未找到",
  },
};

export function t(key: TranslationKey): string {
  const lang = SITE.lang === "zh" ? "zh" : "en";
  return translations[lang]?.[key] ?? translations["en"][key] ?? key;
}

export function getLang(): string {
  return SITE.lang === "zh" ? "zh" : "en";
}
