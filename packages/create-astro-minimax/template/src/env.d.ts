/// <reference types="astro/content" />
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
