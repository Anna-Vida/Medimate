export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const HeaderMetrics = {
  horizontal: 16,
  compactTop: 8,
  regularVertical: 12,
  heroTop: 24,
  heroBottom: 18,
  contentGap: 12,
  titleSize: 18,
  subtitleSize: 12,
  actionSize: 42,
  actionRadius: 14,
} as const;

export const Elevation = {
  card: {
    shadowColor: "#0E243B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  raised: {
    shadowColor: "#0E243B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;
