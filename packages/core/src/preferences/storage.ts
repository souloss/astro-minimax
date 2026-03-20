/**
 * Preferences Storage
 * Handles localStorage persistence with version migration
 */

import type { Preferences, DeepPartial } from './types';
import { defaultPreferences, PREFERENCES_VERSION } from './defaults';

/** Storage key for preferences */
const STORAGE_KEY = 'astro-minimax-settings';

/** Old storage key (for migration) */
const OLD_STORAGE_KEY = 'astro-minimax-settings';

/**
 * Deep merge utility
 */
function deepMerge<T extends Record<string, any>>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue as DeepPartial<typeof targetValue>);
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Migrate old preferences format to new format
 */
function migratePreferences(oldPrefs: any): Preferences {
  // Version 1 (old format from SettingsPanel.astro)
  if (!oldPrefs.version) {
    const migrated: Preferences = {
      theme: {
        colorScheme: oldPrefs.colorScheme || defaultPreferences.theme.colorScheme,
        mode: 'system',
        radius: oldPrefs.radius || defaultPreferences.theme.radius,
      },
      appearance: {
        fontSize: oldPrefs.fontSize || defaultPreferences.appearance.fontSize,
      },
      layout: {
        postsLayout: oldPrefs.layoutMode || defaultPreferences.layout.postsLayout,
      },
      reading: {
        ...defaultPreferences.reading,
      },
      widgets: {
        themeToggle: oldPrefs.widgets?.themeToggle ?? true,
        backToTop: oldPrefs.widgets?.backToTop ?? true,
        readingTime: oldPrefs.widgets?.readingTime ?? true,
        stickyBackToTop: oldPrefs.widgets?.stickyBackToTop ?? true,
      },
      animations: {
        enabled: oldPrefs.animations ?? true,
        cardHover: oldPrefs.cardHover ?? true,
        smoothScroll: oldPrefs.smoothScroll ?? true,
      },
      version: PREFERENCES_VERSION,
    };
    return migrated;
  }

  // Already new format, just ensure version is current
  return {
    ...defaultPreferences,
    ...oldPrefs,
    version: PREFERENCES_VERSION,
  };
}

/**
 * Load preferences from localStorage
 */
export function loadPreferences(): Preferences {
  if (typeof window === 'undefined') {
    return { ...defaultPreferences };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...defaultPreferences };
    }

    const parsed = JSON.parse(stored);
    const migrated = migratePreferences(parsed);

    // If migration happened, save the migrated version
    if (parsed.version !== PREFERENCES_VERSION) {
      savePreferences(migrated);
    }

    return migrated;
  } catch (error) {
    console.warn('Failed to load preferences:', error);
    return { ...defaultPreferences };
  }
}

/**
 * Save preferences to localStorage
 */
export function savePreferences(preferences: Preferences): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const toSave: Preferences = {
      ...preferences,
      version: PREFERENCES_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.warn('Failed to save preferences:', error);
  }
}

/**
 * Update partial preferences
 */
export function updatePreferences(updates: DeepPartial<Preferences>): Preferences {
  const current = loadPreferences();
  const updated = deepMerge(current, updates);
  savePreferences(updated);
  return updated;
}

/**
 * Reset preferences to defaults
 */
export function resetPreferences(): Preferences {
  savePreferences({ ...defaultPreferences });
  return { ...defaultPreferences };
}

/**
 * Clear all preferences from localStorage
 */
export function clearPreferences(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(OLD_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear preferences:', error);
  }
}

/**
 * Get a specific preference value by path
 */
export function getPreference<K extends keyof Preferences>(
  key: K
): Preferences[K] {
  const prefs = loadPreferences();
  return prefs[key];
}

/**
 * Set a specific preference value
 */
export function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K]
): void {
  updatePreferences({ [key]: value } as DeepPartial<Preferences>);
}