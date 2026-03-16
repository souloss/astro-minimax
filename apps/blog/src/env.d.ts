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

// Cloudflare Workers AI Types
// The Ai type is provided by @cloudflare/workers-types
interface Env {
  souloss: Ai;
}
