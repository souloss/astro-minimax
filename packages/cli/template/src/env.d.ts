/// <reference types="astro/content" />
declare module "remark-github-alerts" {
  import type { Plugin } from "unified";
  const plugin: Plugin;
  export default plugin;
}
interface ThemeChangeDetail {
  isDark: boolean;
  theme: string;
}

interface Window {
  theme?: {
    themeValue: string;
    setPreference: () => void;
    reflectPreference: () => void;
    getTheme: () => string;
    setTheme: (val: string) => void;
  };
}

interface WindowEventMap {
  themechange: CustomEvent<ThemeChangeDetail>;
}
