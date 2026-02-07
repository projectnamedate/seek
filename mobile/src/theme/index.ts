// Seek Protocol Design System
// Colors based on Solana Mobile design scheme

export const colors = {
  // Primary palette - Solana Mobile
  gold: '#cfe6e4',      // Rewards, wins (cyan glow)
  cyan: '#61afbd',      // Primary accent (bright cyan)
  cyanLight: '#95d2e6', // Secondary accent (sky blue)
  teal: '#10282c',      // Deep teal accent

  // Backgrounds - Solana Mobile
  dark: '#010101',      // Primary background (near black)
  darkAlt: '#101618',   // Cards, elevated surfaces (dark navy)
  darkLight: '#373c3e', // Borders, subtle elements

  // Status colors
  success: '#61afbd',   // Win, verified (cyan)
  error: '#EF4444',     // Loss, error
  warning: '#95d2e6',   // Pending, caution (sky blue)

  // Text - Solana Mobile
  textPrimary: '#f6f6f5',   // Off-white
  textSecondary: '#99b3be', // Medium gray
  textMuted: '#373c3e',     // Light gray

  // Legacy support
  purple: '#61afbd',    // Map to cyan for compatibility

  // Gradients (as arrays for LinearGradient)
  gradientGold: ['#cfe6e4', '#95d2e6'],
  gradientPurple: ['#61afbd', '#95d2e6'],
  gradientCyan: ['#61afbd', '#cfe6e4'],
  gradientSuccess: ['#61afbd', '#95d2e6'],
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
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
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
