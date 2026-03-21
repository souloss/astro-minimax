import type { Preferences, DeepPartial } from './types';
import { defaultPreferences, PREFERENCES_VERSION } from './defaults';

const STORAGE_KEY = 'astro-minimax-settings';
const OLD_STORAGE_KEY = 'astro-minimax-settings';

let _userDefaults: DeepPartial<Preferences> | undefined;

function getUserDefaults(): DeepPartial<Preferences> {
  if (_userDefaults === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const module = require('virtual:astro-minimax/preferences-defaults');
      _userDefaults = module?.userDefaults ?? {};
    } catch {
      _userDefaults = {};
    }
  }
  return _userDefaults!;
}

export function getEffectiveDefaults(): Preferences {
  const userDefaults = typeof window !== 'undefined' ? getUserDefaults() : {};
  return deepMerge({ ...defaultPreferences }, userDefaults);
}

function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target } as T;

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
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as object,
          sourceValue as DeepPartial<object>
        );
      } else {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return result;
}

function migratePreferences(oldPrefs: unknown): Preferences {
  const prefs = oldPrefs as Record<string, unknown>;

  if (!prefs?.version) {
    return {
      theme: {
        colorScheme: (prefs?.colorScheme as Preferences['theme']['colorScheme']) || defaultPreferences.theme.colorScheme,
        mode: 'system',
        radius: (prefs?.radius as Preferences['theme']['radius']) || defaultPreferences.theme.radius,
      },
      appearance: {
        fontSize: (prefs?.fontSize as number) || defaultPreferences.appearance.fontSize,
      },
      layout: {
        postsLayout: (prefs?.layoutMode as Preferences['layout']['postsLayout']) || defaultPreferences.layout.postsLayout,
      },
      reading: {
        ...defaultPreferences.reading,
      },
      widgets: {
        themeToggle: (prefs?.widgets as Record<string, boolean>)?.themeToggle ?? true,
        backToTop: (prefs?.widgets as Record<string, boolean>)?.backToTop ?? true,
        readingTime: (prefs?.widgets as Record<string, boolean>)?.readingTime ?? true,
        stickyBackToTop: (prefs?.widgets as Record<string, boolean>)?.stickyBackToTop ?? true,
      },
      animations: {
        enabled: (prefs?.animations as boolean) ?? true,
        cardHover: (prefs?.cardHover as boolean) ?? true,
        smoothScroll: (prefs?.smoothScroll as boolean) ?? true,
      },
      version: PREFERENCES_VERSION,
    };
  }

  return {
    ...defaultPreferences,
    ...(prefs as unknown as Preferences),
    version: PREFERENCES_VERSION,
  };
}

export function loadPreferences(): Preferences {
  if (typeof window === 'undefined') {
    return { ...defaultPreferences };
  }

  const effectiveDefaults = getEffectiveDefaults();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return effectiveDefaults;
    }

    const parsed = JSON.parse(stored);
    const migrated = migratePreferences(parsed);

    if ((parsed as { version?: number })?.version !== PREFERENCES_VERSION) {
      savePreferences(migrated);
    }

    return migrated;
  } catch (error) {
    console.warn('Failed to load preferences:', error);
    return effectiveDefaults;
  }
}

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

export function updatePreferences(updates: DeepPartial<Preferences>): Preferences {
  const current = loadPreferences();
  const updated = deepMerge(current, updates);
  savePreferences(updated);
  return updated;
}

export function resetPreferences(): Preferences {
  const effectiveDefaults = getEffectiveDefaults();
  savePreferences(effectiveDefaults);
  return effectiveDefaults;
}

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

export function getPreference<K extends keyof Preferences>(key: K): Preferences[K] {
  const prefs = loadPreferences();
  return prefs[key];
}

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
  updatePreferences({ [key]: value } as DeepPartial<Preferences>);
}