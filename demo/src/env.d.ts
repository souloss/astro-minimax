/// <reference path="../.astro/types.d.ts" />

interface ThemeChangeDetail {
  theme: "light" | "dark";
}

interface Window {
  theme: "light" | "dark";
}

interface WindowEventMap {
  themechange: CustomEvent<ThemeChangeDetail>;
}
