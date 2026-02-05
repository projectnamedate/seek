import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';

interface TimerProps {
  endTime: number;
  onExpire?: () => void;
  size?: 'small' | 'medium' | 'large';
  showWarning?: boolean;
  warningThreshold?: number;
}

export default function Timer({
  endTime,
  onExpire,
  size = 'medium',
  showWarning = true,
  warningThreshold = 30,
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(
    Math.max(0, Math.floor((endTime - Date.now()) / 1000))
  );
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  // Pulse animation when warning
  useEffect(() => {
    if (showWarning && timeLeft <= warningThreshold && timeLeft > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [timeLeft <= warningThreshold]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isWarning = showWarning && timeLeft <= warningThreshold;
  const timerColor = isWarning ? colors.error : colors.cyan;

  return (
    <Animated.View
      style={[
        styles.container,
        styles[size],
        { borderColor: timerColor },
        isWarning && { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Text style={[styles.time, styles[`${size}Text`], { color: timerColor }]}>
        {formatTime(timeLeft)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  medium: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  large: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  time: {
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  smallText: {
    fontSize: fontSize.md,
  },
  mediumText: {
    fontSize: fontSize.xl,
  },
  largeText: {
    fontSize: fontSize.xxl,
  },
});
