import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Audio } from 'expo-av';
import { colors, spacing, fontSize, shadows } from '../theme';

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Play sparkle sound
    const playSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/sparkle.mp3')
        );
        await sound.playAsync();
      } catch (error) {
        console.log('[Splash] Sound error:', error);
      }
    };
    playSound();

    // Animation sequence
    Animated.sequence([
      // Logo fade in and scale
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Sparkle effect
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Text fade in
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Hold for reading
      Animated.delay(2500),
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.logo}>SEEK</Text>
        <Animated.View
          style={[
            styles.sparkle,
            {
              opacity: sparkleAnim,
              transform: [
                {
                  scale: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.sparkleIcon}>✦</Text>
        </Animated.View>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: textFadeAnim }]}>
        Hunt. Capture. Win.
      </Animated.Text>

      {/* Explanation */}
      <Animated.View style={[styles.explanationContainer, { opacity: textFadeAnim }]}>
        <Text style={styles.explanationTitle}>How to Play</Text>
        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>1</Text>
          <Text style={styles.stepText}>Choose your bet level</Text>
        </View>
        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>2</Text>
          <Text style={styles.stepText}>Find the target in real life</Text>
        </View>
        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>3</Text>
          <Text style={styles.stepText}>Snap a photo to prove it</Text>
        </View>
        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>4</Text>
          <Text style={styles.stepText}>Win 2x your bet!</Text>
        </View>
      </Animated.View>

      {/* Credits */}
      <Animated.View style={[styles.creditsContainer, { opacity: textFadeAnim }]}>
        <Text style={styles.createdBy}>Created by Projectname_date</Text>
        <Text style={styles.poweredBy}>Powered by Solana</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    position: 'relative',
  },
  logo: {
    fontSize: 72,
    fontWeight: '900',
    color: colors.gold,
    letterSpacing: 12,
    ...shadows.glow(colors.gold),
  },
  sparkle: {
    position: 'absolute',
    top: -10,
    right: -20,
  },
  sparkleIcon: {
    fontSize: 24,
    color: colors.gold,
  },
  tagline: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
    letterSpacing: 4,
  },
  explanationContainer: {
    marginTop: spacing.xxl,
    backgroundColor: colors.darkAlt,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 300,
  },
  explanationTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gold,
    color: colors.dark,
    fontSize: fontSize.sm,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: spacing.md,
  },
  stepText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  creditsContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  createdBy: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  poweredBy: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 2,
  },
});
