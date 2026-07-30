/**
 * Forge India — Design System Tokens
 * Single source of truth for runtime token values (mirrors tailwind.config.js & index.css).
 * Use these in Chart.js configs, inline styles, or dynamic class construction.
 */

// ─── Brand Colors ────────────────────────────────────────────────────────────
export const COLOR = {
  primary:        '#f9d453',
  primaryHover:   '#cca927',
  primaryLight:   '#fef9df',

  secondary:      '#1E5AA8',
  secondaryHover: '#174786',
  secondaryLight: '#EAF0F7',

  accent:         '#F28C00',
  accentHover:    '#D67B00',
  accentLight:    '#FFF3E0',

  // Gray scale
  gray50:  '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Semantic states
  success:  '#10B981',
  warning:  '#F59E0B',
  danger:   '#EF4444',
  info:     '#3B82F6',

  // Surfaces
  bgLight:      '#F8F9FA',
  bgDark:       '#0B0F19',
  cardLight:    '#FFFFFF',
  cardDark:     '#161F30',
} as const;

export type ColorToken = keyof typeof COLOR;

// ─── Opacity-safe chart palette ───────────────────────────────────────────────
export const CHART_COLORS = {
  primary:   `${COLOR.primary}CC`,
  secondary: `${COLOR.secondary}CC`,
  accent:    `${COLOR.accent}CC`,
  success:   `${COLOR.success}CC`,
  danger:    `${COLOR.danger}CC`,
  info:      `${COLOR.info}CC`,
};

// Full opacity solid equivalents for borders / lines
export const CHART_BORDERS = {
  primary:   COLOR.primary,
  secondary: COLOR.secondary,
  accent:    COLOR.accent,
  success:   COLOR.success,
  danger:    COLOR.danger,
  info:      COLOR.info,
};

// ─── Typography ───────────────────────────────────────────────────────────────
export const FONT = {
  sans:  "'Outfit', 'Inter', sans-serif",
  mono:  "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const FONT_SIZE = {
  '2xs': '0.625rem',   // 10px
  xs:    '0.75rem',    // 12px
  sm:    '0.875rem',   // 14px
  base:  '1rem',       // 16px
  lg:    '1.125rem',   // 18px
  xl:    '1.25rem',    // 20px
  '2xl': '1.5rem',     // 24px
  '3xl': '1.875rem',   // 30px
  '4xl': '2.25rem',    // 36px
  '5xl': '3rem',       // 48px
} as const;

export const FONT_WEIGHT = {
  light:     300,
  regular:   400,
  medium:    500,
  semibold:  600,
  bold:      700,
  extrabold: 800,
  black:     900,
} as const;

export const LINE_HEIGHT = {
  tight:   1.25,
  snug:    1.375,
  normal:  1.5,
  relaxed: 1.625,
  loose:   2,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const SPACING = {
  0:    '0px',
  0.5:  '2px',
  1:    '4px',
  1.5:  '6px',
  2:    '8px',
  2.5:  '10px',
  3:    '12px',
  3.5:  '14px',
  4:    '16px',
  5:    '20px',
  6:    '24px',
  7:    '28px',
  8:    '32px',
  9:    '36px',
  10:   '40px',
  12:   '48px',
  14:   '56px',
  16:   '64px',
  20:   '80px',
  24:   '96px',
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:    '8px',
  md:    '12px',
  lg:    '16px',
  xl:    '20px',   // --border-radius-forge
  '2xl': '24px',
  full:  '9999px',
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const SHADOW = {
  sm:      '0 1px 3px rgba(15,23,42,0.08)',
  md:      '0 10px 24px -18px rgba(15,23,42,0.22)',
  lg:      '0 20px 45px -24px rgba(15,23,42,0.2)',
  glass:   '0 8px 32px 0 rgba(31,38,135,0.08)',
  card:    '0 20px 45px -24px rgba(15,23,42,0.18)',
  button:  '0 14px 30px -16px rgba(15,23,42,0.35)',
} as const;

// ─── Animation Durations ──────────────────────────────────────────────────────
export const DURATION = {
  fast:    150,
  base:    200,
  medium:  300,
  slow:    500,
  slower:  700,
} as const;

// ─── Z-index Scale ────────────────────────────────────────────────────────────
export const Z = {
  base:    0,
  raised:  10,
  sticky:  40,
  overlay: 50,
  modal:   60,
  toast:   70,
} as const;

// ─── Breakpoints ─────────────────────────────────────────────────────────────
export const BREAKPOINT = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
} as const;

// ─── Status Colors (maps to StatusChip) ──────────────────────────────────────
export const STATUS_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  pending:    { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  preparing:  { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  'on-the-way': { bg: COLOR.primaryLight, text: COLOR.primaryHover, border: `${COLOR.primary}33` },
  delivered:  { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  active:     { bg: '#CFFAFE', text: '#164E63', border: '#A5F3FC' },
  completed:  { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  cancelled:  { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  online:     { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  busy:       { bg: '#FFE4E6', text: '#9F1239', border: '#FECDD3' },
  break:      { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  offline:    { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
};
