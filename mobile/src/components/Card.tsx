import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glow';
  glowColor?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export default function Card({
  children,
  variant = 'default',
  glowColor = colors.gold,
  padding = 'medium',
  style,
}: CardProps) {
  const cardStyles = [
    styles.base,
    styles[variant],
    styles[`${padding}Padding`],
    variant === 'glow' && shadows.glow(glowColor),
    style,
  ];

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.darkAlt,
    borderRadius: borderRadius.lg,
  },
  default: {},
  elevated: {
    ...shadows.md,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.darkLight,
  },
  glow: {
    borderWidth: 2,
    borderColor: colors.gold,
  },
  nonePadding: {
    padding: 0,
  },
  smallPadding: {
    padding: spacing.sm,
  },
  mediumPadding: {
    padding: spacing.md,
  },
  largePadding: {
    padding: spacing.lg,
  },
});
