/**
 * Preferences Share
 * URL Hash based configuration sharing (no backend required)
 */

import type { Preferences, DeepPartial } from './types';
import { defaultPreferences } from './defaults';

/** Share URL hash key */
const SHARE_KEY = 'prefs';

/**
 * Compress preferences by removing default values
 * This reduces the URL size significantly
 */
function compressPreferences(prefs: Preferences): DeepPartial<Preferences> {
  const compressed: Record<string, any> = {};

  const compareAndCompress = (key: keyof Preferences, value: any, defaultValue: any) => {
    if (value === undefined || value === null) return;

    if (typeof value === 'object' && !Array.isArray(value)) {
      const nested: Record<string, any> = {};
      let hasDiff = false;

      for (const subKey in value) {
        if (JSON.stringify(value[subKey]) !== JSON.stringify(defaultValue?.[subKey])) {
          nested[subKey] = value[subKey];
          hasDiff = true;
        }
      }

      if (hasDiff) {
        compressed[key] = nested;
      }
    } else if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
      compressed[key] = value;
    }
  };

  const prefKeys: (keyof Preferences)[] = [
    'theme', 'appearance', 'layout', 'reading', 'widgets', 'animations'
  ];

  for (const key of prefKeys) {
    compareAndCompress(key, prefs[key], defaultPreferences[key]);
  }

  return compressed;
}

/**
 * Export preferences to a shareable URL
 */
export function exportShareURL(prefs: Preferences): string {
  const compressed = compressPreferences(prefs);

  // If no custom preferences, return base URL
  if (Object.keys(compressed).length === 0) {
    return window.location.origin + window.location.pathname;
  }

  try {
    const encoded = btoa(encodeURIComponent(JSON.stringify(compressed)));
    const url = new URL(window.location.href);
    url.hash = `#${SHARE_KEY}=${encoded}`;
    // Remove any existing query params for cleaner URL
    url.search = '';
    return url.toString();
  } catch (error) {
    console.warn('Failed to export share URL:', error);
    return window.location.href;
  }
}

/**
 * Import preferences from URL hash
 */
export function importFromURL(): DeepPartial<Preferences> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const hash = window.location.hash.slice(1); // Remove #

  // Check for our share key
  const match = hash.match(new RegExp(`${SHARE_KEY}=(.+)`));
  if (!match) {
    return null;
  }

  try {
    const encoded = match[1];
    const decoded = decodeURIComponent(atob(encoded));
    const prefs = JSON.parse(decoded);

    return prefs as DeepPartial<Preferences>;
  } catch (error) {
    console.warn('Failed to parse shared preferences from URL:', error);
    return null;
  }
}

/**
 * Check if URL contains shared preferences
 */
export function hasSharedPreferences(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hash = window.location.hash;
  return hash.includes(`${SHARE_KEY}=`);
}

/**
 * Clear share parameters from URL
 */
export function clearShareURL(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.hash = '';
  history.replaceState(null, '', url.toString());
}

/**
 * Copy share URL to clipboard
 */
export async function copyShareURL(prefs: Preferences): Promise<boolean> {
  const url = exportShareURL(prefs);

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      console.warn('Failed to copy share URL:', error);
      return false;
    }
  }
}

/**
 * Merge shared preferences with current preferences
 */
export function mergeSharedPreferences(
  current: Preferences,
  shared: DeepPartial<Preferences>
): Preferences {
  const merged = { ...current };

  const keys: (keyof Preferences)[] = [
    'theme', 'appearance', 'layout', 'reading', 'widgets', 'animations'
  ];

  for (const key of keys) {
    if (shared[key] !== undefined) {
      const sharedValue = shared[key];
      const currentValue = current[key];

      if (
        sharedValue &&
        typeof sharedValue === 'object' &&
        !Array.isArray(sharedValue) &&
        currentValue &&
        typeof currentValue === 'object' &&
        !Array.isArray(currentValue)
      ) {
        merged[key] = {
          ...currentValue,
          ...sharedValue,
        } as any;
      } else {
        merged[key] = sharedValue as any;
      }
    }
  }

  return merged;
}