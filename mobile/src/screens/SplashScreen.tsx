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
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shutterRotateAnim = useRef(new Animated.Value(0)).current;
  const shutterScaleAnim = useRef(new Animated.Value(0.8)).current;

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

    // Start glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shutter rotation loop
    Animated.loop(
      Animated.timing(shutterRotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Shutter scale pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(shutterScaleAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shutterScaleAnim, {
          toValue: 0.95,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation sequence
    Animated.sequence([
      // Logo dramatic entrance - zoom from small with slight rotation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          tension: 40,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // Settle to normal size
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      // Sparkle effect
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Text fade in
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Hold for reading
      Animated.delay(2000),
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

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '0deg'],
  });

  const shutterSpin = shutterRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Camera shutter / iris aperture - positioned behind info box */}
      <Animated.View
        style={[
          styles.shutterContainer,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 0.9],
            }),
            transform: [{ scale: shutterScaleAnim }],
          },
        ]}
      >
        {/* Outer lens ring */}
        <View style={styles.shutterOuter}>
          {/* Rotating iris blades - overlapping like a real aperture */}
          <Animated.View
            style={[
              styles.shutterBladeGroup,
              { transform: [{ rotate: shutterSpin }] },
            ]}
          >
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
              <View
                key={i}
                style={[
                  styles.shutterBlade,
                  {
                    transform: [
                      { rotate: `${deg}deg` },
                      { translateY: -30 },
                      { skewY: '25deg' },
                    ],
                  },
                ]}
              />
            ))}
          </Animated.View>
          {/* Center aperture opening */}
          <View style={styles.shutterAperture}>
            <View style={styles.shutterApertureInner} />
          </View>
        </View>
        {/* Outer ring glow */}
        <View style={styles.shutterRingOuter} />
      </Animated.View>

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: scaleAnim }, { rotate: spin }],
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

      {/* Explanation - centered overlay */}
      <Animated.View style={[styles.explanationOverlay, { opacity: textFadeAnim }]}>
        <View style={styles.explanationContainer}>
          <Text style={styles.explanationTitle}>How to Play</Text>
        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>1</Text>
          <Text style={styles.stepText}>Choose your challenge level</Text>
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
          <Text style={styles.stepText}>Earn 2x your entry!</Text>
        </View>
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
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
  },
  shutterContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2.5,
    borderColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 240, 255, 0.03)',
  },
  shutterBladeGroup: {
    position: 'absolute',
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterBlade: {
    position: 'absolute',
    width: 48,
    height: 52,
    borderRadius: 6,
    backgroundColor: colors.cyan,
    opacity: 0.25,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
  },
  shutterAperture: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    ...shadows.glow(colors.cyan),
  },
  shutterApertureInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.cyan,
    opacity: 0.8,
    ...shadows.glow(colors.cyan),
  },
  shutterRingOuter: {
    position: 'absolute',
    width: 166,
    height: 166,
    borderRadius: 83,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  logoContainer: {
    position: 'relative',
  },
  logo: {
    fontSize: 72,
    fontWeight: '900',
    color: colors.cyan,
    letterSpacing: 12,
    ...shadows.glow(colors.cyan),
  },
  sparkle: {
    position: 'absolute',
    top: -10,
    right: -20,
  },
  sparkleIcon: {
    fontSize: 24,
    color: colors.cyanLight,
  },
  tagline: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    letterSpacing: 4,
  },
  explanationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explanationContainer: {
    backgroundColor: colors.darkAlt,
    borderRadius: 16,
    padding: spacing.lg,
    width: 300,
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
    backgroundColor: colors.cyan,
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
