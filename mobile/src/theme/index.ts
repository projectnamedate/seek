// Seek Protocol Design System
// Colors inspired by Solana, treasure hunting, and gaming

export const colors = {
  // Primary palette
  gold: '#FFB800',      // Rewards, wins, treasure
  purple: '#8B5CF6',    // Solana brand, premium
  cyan: '#06B6D4',      // Active states, info

  // Backgrounds
  dark: '#0F172A',      // Primary background
  darkAlt: '#1E293B',   // Cards, elevated surfaces
  darkLight: '#334155', // Borders, subtle elements

  // Status colors
  success: '#10B981',   // Win, verified
  error: '#EF4444',     // Loss, error
  warning: '#F59E0B',   // Pending, caution

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Gradients (as arrays for LinearGradient)
  gradientGold: ['#FFB800', '#FF8C00'],
  gradientPurple: ['#8B5CF6', '#6366F1'],
  gradientCyan: ['#06B6D4', '#0EA5E9'],
  gradientSuccess: ['#10B981', '#059669'],
  gradientError: ['#EF4444', '#DC2626'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  }),
};

export const theme = {
  colors,
  spacing,
  fontSize,
  borderRadius,
  shadows,
};

export default theme;
