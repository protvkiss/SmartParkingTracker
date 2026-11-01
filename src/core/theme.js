export const Palette = {
  // Brand & Accents
  brand: "#2563EB",         // Electric Royal Blue
  brandDark: "#1D4ED8",     // Deep Blue
  brandLight: "#EFF6FF",    // Soft Ice Blue
  brandSoft: "#60A5FA",     // Sky Accent
  brandGlow: "rgba(37, 99, 235, 0.25)",

  accent: "#6366F1",        // Indigo Purple
  accentLight: "#EEF2FF",
  accentSoft: "#818CF8",

  positive: "#10B981",      // Emerald Green
  positiveLight: "#ECFDF5",
  positiveSoft: "#34D399",
  positiveGlow: "rgba(16, 185, 129, 0.25)",

  alert: "#F59E0B",         // Amber Warning
  alertLight: "#FFFBEB",
  alertSoft: "#FBBF24",

  danger: "#EF4444",        // Crimson Rose
  dangerLight: "#FEF2F2",
  dangerSoft: "#F87171",

  // Radar HUD (High-contrast Dark)
  hudBg: "#0B1120",         // Deep Space Navy
  hudCard: "#131E36",       // Radar Card
  hudBorder: "#1E293B",     // Subtle Cyber Grid
  hudText: "#F8FAFC",
  hudMuted: "#94A3B8",
  hudGlow: "#38BDF8",

  // Surfaces & Backgrounds
  canvas: "#F8FAFC",        // App Background
  card: "#FFFFFF",          // Card Background
  cardElevated: "#FFFFFF",
  cardSubtle: "#F1F5F9",
  overlay: "rgba(15, 23, 42, 0.6)",

  // Typography
  inkHeading: "#0F172A",    // Slate 900
  inkBody: "#334155",       // Slate 700
  inkMuted: "#64748B",      // Slate 500
  inkSubtle: "#94A3B8",     // Slate 400

  // Borders & Dividers
  outline: "#E2E8F0",
  outlineLight: "#F1F5F9",
  separator: "#F1F5F9",
};

export const Metrics = {
  radiusXs: 6,
  radiusSm: 10,
  radiusMd: 16,
  radiusLg: 22,
  radiusXl: 32,
  radiusPill: 999,

  gapXs: 4,
  gapSm: 8,
  gapMd: 16,
  gapLg: 24,
  gapXl: 32,

  fontXs: 11,
  fontSm: 13,
  fontBase: 15,
  fontLg: 17,
  fontXl: 20,
  font2Xl: 26,
  font3Xl: 34,
};

export const Elevation = {
  flat: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  raised: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  floating: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  popover: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 10,
  },
};
