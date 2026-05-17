import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { RootStackParamList } from '../types';
import { playWinSound, playLoseSound } from '../utils/sounds';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Result'>;
  route: RouteProp<RootStackParamList, 'Result'>;
};

export default function ResultScreen({ navigation, route }: Props) {
  const { bounty, validation } = route.params;
  const isWin = bounty.status === 'won';
  // Balance is on-chain. AppContext fetches it via fetchRealBalance after the
  // finalize tx confirms. We do NOT mutate UI balance here — that caused a
  // bug where players saw +2000 SKR pre-confirmation, then a flicker.

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const bgFlashAnim = useRef(new Animated.Value(0)).current;
  const settlementRings = useRef([...Array(3)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Play sound effect
    if (isWin) {
      playWinSound();
    } else {
      playLoseSound();
    }

    // Background flash
    Animated.sequence([
      Animated.timing(bgFlashAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(bgFlashAnim, {
        toValue: 0,
        duration: 520,
        useNativeDriver: true,
      }),
    ]).start();

    // Main reveal animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.04,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      delay: 260,
      useNativeDriver: true,
    }).start();

    // Completion: restrained settlement pulse, miss: short shake effect
    if (isWin) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.025,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      settlementRings.forEach((ring, i) => {
        ring.setValue(0);
        Animated.timing(ring, {
          toValue: 1,
          duration: 1250,
          delay: i * 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Shake animation for missed missions
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -3, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [isWin]);

  const handlePlayAgain = () => {
    navigation.popToTop();
  };

  const confidencePercent = Math.round(validation.confidence * 100);

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isWin ? colors.dark : colors.dark },
      ]}
    >
      {/* Background Flash */}
      <Animated.View
        style={[
          styles.bgFlash,
          {
            backgroundColor: isWin ? colors.success : colors.error,
            opacity: bgFlashAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.12],
            }),
          },
        ]}
      />

      {/* Result Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
              { translateX: shakeAnim },
            ],
          },
        ]}
      >
        {isWin &&
          settlementRings.map((ring, i) => (
            <Animated.View
              key={i}
              style={[
                styles.settlementRing,
                {
                  opacity: ring.interpolate({
                    inputRange: [0, 0.25, 1],
                    outputRange: [0, 0.42 - i * 0.08, 0],
                  }),
                  transform: [
                    {
                      scale: ring.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.82 + i * 0.04, 1.5 + i * 0.16],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: isWin ? colors.success : colors.error },
          ]}
        >
          <Text style={styles.iconText}>{isWin ? '✓' : '✗'}</Text>
        </View>
      </Animated.View>

      {/* Result Text */}
      <Animated.View style={[styles.resultContent, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.resultTitle, { color: isWin ? colors.success : colors.error }]}>
          {isWin ? 'BOUNTY COMPLETE' : 'MISSION MISSED'}
        </Text>

        <Text style={styles.targetText}>
          Target: {bounty.target}
        </Text>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>{isWin ? 'Return' : 'Entry'}</Text>
          <Text
            style={[
              styles.amountValue,
              { color: isWin ? colors.success : colors.error },
            ]}
          >
            {isWin ? '+' : '-'}{isWin ? bounty.potentialReward : bounty.entryAmount} $SKR
          </Text>
        </View>

        {/* AI Confidence */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>AI Confidence</Text>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${confidencePercent}%`,
                  backgroundColor: confidencePercent >= 70 ? colors.success : colors.error,
                },
              ]}
            />
          </View>
          <Text style={styles.confidenceValue}>{confidencePercent}%</Text>
        </View>

        {/* AI Reasoning */}
        <View style={styles.reasoningContainer}>
          <Text style={styles.reasoningLabel}>AI Analysis</Text>
          <Text style={styles.reasoningText}>{validation.reasoning}</Text>
        </View>

        {/* Stats */}
        {isWin && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Time Remaining</Text>
              <Text style={styles.statValue}>
                {formatTimeRemaining(bounty.endTime - Date.now())}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Bonus Pool</Text>
              <Text style={styles.statValue}>Keep hunting!</Text>
            </View>
          </View>
        )}
        </ScrollView>
      </Animated.View>

      {/* Play Again Button */}
      <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[
            styles.playAgainButton,
            { backgroundColor: colors.cyan },
          ]}
          onPress={handlePlayAgain}
          activeOpacity={0.8}
        >
          <Text style={styles.playAgainText}>
            {isWin ? 'HUNT AGAIN' : 'TRY AGAIN'}
          </Text>
        </TouchableOpacity>

        {/* Compliance Disclaimer */}
        {isWin && (
          <Text style={styles.disclaimerText}>
            Return based on successful completion of skill challenge
          </Text>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0:00';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  bgFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iconContainer: {
    marginTop: spacing.xxl,
    width: 148,
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementRing: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 2,
    borderColor: colors.frost,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  iconText: {
    fontSize: 60,
    color: colors.textPrimary,
    fontWeight: '900',
  },
  resultContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  resultScroll: {
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  targetText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
  amountContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  amountLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  amountValue: {
    fontSize: fontSize.xxxl,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  confidenceContainer: {
    marginTop: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  confidenceLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  confidenceBar: {
    width: '80%',
    height: 8,
    backgroundColor: colors.darkLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  reasoningContainer: {
    marginTop: spacing.lg,
    width: '100%',
    backgroundColor: colors.darkAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  reasoningLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  reasoningText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    backgroundColor: colors.darkAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.darkLight,
    marginHorizontal: spacing.md,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    padding: spacing.xl,
  },
  playAgainButton: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  playAgainText: {
    color: colors.dark,
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 2,
  },
  disclaimerText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
