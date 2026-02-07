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

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Camera scope icon - positioned behind info box */}
      <Animated.View
        style={[
          styles.scopeContainer,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1],
            }),
            transform: [
              {
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1.05],
                }),
              },
            ],
          },
        ]}
      >
        {/* Outer ring */}
        <View style={styles.scopeOuter}>
          {/* Crosshairs */}
          <View style={styles.scopeCrosshairH} />
          <View style={styles.scopeCrosshairV} />
          {/* Inner circle */}
          <View style={styles.scopeInner}>
            <View style={styles.scopeCenter} />
          </View>
          {/* Corner brackets */}
          <View style={[styles.scopeBracket, styles.scopeBracketTL]} />
          <View style={[styles.scopeBracket, styles.scopeBracketTR]} />
          <View style={[styles.scopeBracket, styles.scopeBracketBL]} />
          <View style={[styles.scopeBracket, styles.scopeBracketBR]} />
        </View>
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
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
  },
  scopeContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -60,
    marginTop: -60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow(colors.cyan),
  },
  scopeCrosshairH: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: colors.cyan,
  },
  scopeCrosshairV: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: colors.cyan,
  },
  scopeInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cyan,
  },
  scopeBracket: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: colors.cyan,
    borderWidth: 3,
  },
  scopeBracketTL: {
    top: -8,
    left: -8,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  scopeBracketTR: {
    top: -8,
    right: -8,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  scopeBracketBL: {
    bottom: -8,
    left: -8,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  scopeBracketBR: {
    bottom: -8,
    right: -8,
    borderLeftWidth: 0,
    borderTopWidth: 0,
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
  explanationContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -150,
    marginTop: -120,
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
