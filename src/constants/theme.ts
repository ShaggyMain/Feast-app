/**
 * Colors, spacing, radii and fonts for FEAST Trainer (light + dark).
 * A calm, cockpit-inspired palette: deep navy backgrounds, a blue tint, and
 * clear success/danger signals for fast feedback.
 */
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1220',
    textSecondary: '#5A6473',
    background: '#F4F6FB',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF1F7',
    border: '#D9DEE9',
    tint: '#2E6BE6',
    tintText: '#FFFFFF',
    success: '#1F9D55',
    successText: '#FFFFFF',
    danger: '#D23F3F',
    dangerText: '#FFFFFF',
    warning: '#C77700',
  },
  dark: {
    text: '#F2F5FA',
    textSecondary: '#9AA4B2',
    background: '#0B1220',
    surface: '#151C2C',
    surfaceAlt: '#1E2740',
    border: '#2A3450',
    tint: '#4D8BFF',
    tintText: '#06122B',
    success: '#34C759',
    successText: '#06210F',
    danger: '#FF5A5A',
    dangerText: '#2A0606',
    warning: '#FFB020',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
/** Structural palette: same keys for light/dark, plain `string` color values. */
export type ThemePalette = { [K in keyof typeof Colors.light]: string };

/** Accent color per training module (used by Home tiles and module screens). */
export const ModuleColors: Record<'math' | 'spatial' | 'memory' | 'reaction', string> = {
  math: '#2E6BE6',
  spatial: '#7A5AF0',
  memory: '#1F9D55',
  reaction: '#E0663D',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Keeps content readable on tablets / large screens. */
export const MaxContentWidth = 720;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'system-ui',
    serif: 'serif',
    rounded: 'system-ui',
    mono: 'monospace',
  },
});
