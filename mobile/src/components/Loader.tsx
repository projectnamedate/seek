import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';

interface LoaderProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export default function Loader({
  text,
  size = 'medium',
  color = colors.purple,
}: LoaderProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Spin animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sizes = {
    small: 24,
    medium: 40,
    large: 60,
  };

  const loaderSize = sizes[size];

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: loaderSize,
            height: loaderSize,
            borderRadius: loaderSize / 2,
            borderColor: color,
            transform: [{ rotate: spin }, { scale: pulseAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.innerSpinner,
            {
              width: loaderSize * 0.7,
              height: loaderSize * 0.7,
              borderRadius: (loaderSize * 0.7) / 2,
              borderColor: colors.cyan,
            },
          ]}
        />
      </Animated.View>
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    borderWidth: 3,
    borderTopColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerSpinner: {
    borderWidth: 2,
    borderBottomColor: 'transparent',
  },
  text: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
});
