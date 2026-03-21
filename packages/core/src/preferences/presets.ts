/**
 * Theme Presets Metadata
 * Color definitions are centralized in styles/themes.css
 * This file only contains display metadata for the UI
 */

import type { ColorSchemeType } from './types';

export interface ThemePresetMeta {
  id: ColorSchemeType;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
}

export const themePresetMeta: ThemePresetMeta[] = [
  {
    id: 'teal',
    name: 'Teal',
    nameZh: '青绿',
    description: 'Fresh and natural, great for tech blogs',
    descriptionZh: '清新自然，适合技术博客',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    nameZh: '深海',
    description: 'Professional and calm, great for serious content',
    descriptionZh: '沉稳专业，适合严肃内容',
  },
  {
    id: 'rose',
    name: 'Rose',
    nameZh: '玫瑰',
    description: 'Warm and romantic, great for personal blogs',
    descriptionZh: '温暖浪漫，适合个人博客',
  },
  {
    id: 'forest',
    name: 'Forest',
    nameZh: '森林',
    description: 'Natural and eye-friendly, great for long reading',
    descriptionZh: '自然护眼，适合长时间阅读',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    nameZh: '午夜',
    description: 'Deep purple-blue, great for night reading',
    descriptionZh: '深紫蓝色系，适合夜间阅读',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    nameZh: '日落',
    description: 'Warm orange tones, great for lifestyle blogs',
    descriptionZh: '暖橙色调，适合生活方式博客',
  },
  {
    id: 'mono',
    name: 'Mono',
    nameZh: '极简',
    description: 'Black and white, focused on content',
    descriptionZh: '黑白灰，专注内容',
  },
  {
    id: 'github',
    name: 'GitHub',
    nameZh: 'GitHub',
    description: 'Developer-friendly colors',
    descriptionZh: '开发者熟悉的配色',
  },
];

export const getThemePresetMeta = (id: ColorSchemeType): ThemePresetMeta | undefined => {
  return themePresetMeta.find((preset) => preset.id === id);
};

export const getPresetIds = (): ColorSchemeType[] => {
  return themePresetMeta.map((preset) => preset.id);
};

// Deprecated: kept for backward compatibility
// Color definitions are now in styles/themes.css
export const themePresets = themePresetMeta;
export const getThemePreset = getThemePresetMeta;