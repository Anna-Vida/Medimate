import { ColorSchemeName, useColorScheme } from "react-native";
import { Colors as ThemeColors } from "./theme";

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
  primary: "#123458",
  primaryDark: "#0C223A",
  primaryLight: "#4A7CA7",
  secondary: "#2F8A69",
  primaryBg: "#EAF1F7",
  background: "#F7F9FC",
  surface: "#FFFFFF",
  surfaceHighlight: "#F2F5F9",
  border: "#D7E0EA",

  textPrimary: "#10243A",
  textSecondary: "#4D6073",
  textTertiary: "#7A8B9B",
  white: "#FFFFFF",

  error: "#C84B5A",
  errorBg: "#FBECEF",
  errorBgLight: "#FDF2F4",
  errorBorder: "#F2C7CE",
  errorText: "#A33342",

  warning: "#B9892E",
  warningBg: "#F8F1E3",
  warningBorder: "#EAD8B3",

  success: "#2F8A69",
  successBg: "#EAF7F1",
  successBorder: "#BFE8D8",

  // extras imported by various components
  accent: "#C6A96A",
  tint: "#123458",
  icon: "#5F7285",
  tabIconDefault: "#8A9AAD",
  tabIconSelected: "#123458",
};

// optional shadows used by a couple of components when the code does
// `const Colors: any = (AppTheme as any).Colors ?? (AppTheme as any);`
export const Shadows: any = {
  small: {
    shadowColor: "#0E243B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: "#0E243B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

// helper hook; not used by many components but exported in case someone wants
// to read the current colour scheme and pick values dynamically.
export function useColors() {
  const scheme: ColorSchemeName = useColorScheme() ?? "light";
  if (scheme === "dark") {
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
