import { ColorSchemeName, useColorScheme } from 'react-native';
import { Colors as ThemeColors } from './theme';

// This module provides a flat color palette that many components throughout the
// app reference.  The original code used to import from
// "../constants/Colors" which no longer existed after the theme refactor.
// To keep the rest of the app unchanged we expose a simple object with the
// properties the UI relies on.  For convenience we also export `Shadows` so
// places that read the theme as an "AppTheme" continue to work.

// NOTE: most of the colours here are derived from the light theme that lives
// in `theme.ts`.  Dark mode support is very limited in this helper; calling
// `getColors()` will return a variant suited for the current colour scheme.
// Components that require full light/dark support should instead use the
// `useThemeColor` hook already provided in `hooks/use-theme-color.ts`.

// list of keys which appear in the source code (see workspace grep results)
// and that are required by TypeScript.  We keep the type loose (any) because
// the object is large and we don't want to constantly update it.
export const Colors: any = {
  // base from the light theme
  ...ThemeColors.light,

  // convenience variants
  primaryDark: '#1E293B',
  primaryLight: '#60A5FA',
  primaryBg: '#E0F2FE',
  surface: '#FFFFFF',
  surfaceHighlight: '#F8FAFC',

  textPrimary: ThemeColors.light.text,
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  white: '#FFFFFF',

  error: ThemeColors.light.danger,
  errorBg: '#FEE2E2',
  errorBgLight: '#FEE2E2',
  errorBorder: '#FCA5A5',
  errorText: '#B91C1C',

  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  warningBorder: '#FDE68A',

  success: ThemeColors.light.success,
  successBg: '#DCFCE7',
  successBorder: '#A7F3D0',

  // extras imported by various components
  accent: ThemeColors.light.accent,
  tint: ThemeColors.light.tint,
  icon: ThemeColors.light.icon,
  tabIconDefault: ThemeColors.light.tabIconDefault,
  tabIconSelected: ThemeColors.light.tabIconSelected,
};

// optional shadows used by a couple of components when the code does
// `const Colors: any = (AppTheme as any).Colors ?? (AppTheme as any);`
export const Shadows: any = {
  small: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
};

// helper hook; not used by many components but exported in case someone wants
// to read the current colour scheme and pick values dynamically.
export function useColors() {
  const scheme: ColorSchemeName = useColorScheme() ?? 'light';
  if (scheme === 'dark') {
    // very basic dark adjustments – most UI will still appear with the light
    // palette.  For full dark support components should call useThemeColor.
    return {
      ...Colors,
      background: ThemeColors.dark.background,
      textPrimary: ThemeColors.dark.text,
    };
  }
  return Colors;
}
