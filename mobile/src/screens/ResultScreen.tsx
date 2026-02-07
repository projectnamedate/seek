import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { RootStackParamList } from '../types';
import walletService from '../services/wallet.service';
import { playWinSound, playLoseSound } from '../utils/sounds';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Result'>;
  route: RouteProp<RootStackParamList, 'Result'>;
};

export default function ResultScreen({ navigation, route }: Props) {
  const { bounty, validation } = route.params;
  const isWin = bounty.status === 'won';

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    [...Array(20)].map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    // Play sound effect
    if (isWin) {
      playWinSound();
      walletService.addWinnings(bounty.potentialWin);
    } else {
      playLoseSound();
    }

    // Main reveal animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 400,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Confetti for wins
    if (isWin) {
      confettiAnims.forEach((anim, i) => {
        const xTarget = (Math.random() - 0.5) * 400;
        const yTarget = Math.random() * 600 + 200;
        const delay = i * 50;

        Animated.parallel([
          Animated.timing(anim.x, {
            toValue: xTarget,
            duration: 2000,
            delay,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim.y, {
            toValue: yTarget,
            duration: 2000,
            delay,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: Math.random() * 10,
            duration: 2000,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 2000,
            delay,
            useNativeDriver: true,
          }),
        ]).start();
      });
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
      {/* Confetti (wins only) */}
      {isWin &&
        confettiAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.confetti,
              {
                backgroundColor: [colors.cyan, colors.cyanLight, colors.success, colors.textPrimary][
                  i % 4
                ],
                transform: [
                  { translateX: anim.x },
                  { translateY: anim.y },
                  {
                    rotate: anim.rotate.interpolate({
                      inputRange: [0, 10],
                      outputRange: ['0deg', '720deg'],
                    }),
                  },
                ],
                opacity: anim.opacity,
              },
            ]}
          />
        ))}

      {/* Result Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
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
        <Text style={[styles.resultTitle, { color: isWin ? colors.success : colors.error }]}>
          {isWin ? 'BOUNTY COMPLETE!' : 'BOUNTY FAILED'}
        </Text>

        <Text style={styles.targetText}>
          Target: {bounty.target}
        </Text>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>{isWin ? 'You Won' : 'You Lost'}</Text>
          <Text
            style={[
              styles.amountValue,
              { color: isWin ? colors.success : colors.error },
            ]}
          >
            {isWin ? '+' : '-'}{isWin ? bounty.potentialWin : bounty.betAmount} $SKR
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
              <Text style={styles.statLabel}>Jackpot?</Text>
              <Text style={styles.statValue}>Better luck next time!</Text>
            </View>
          </View>
        )}
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
  confetti: {
    position: 'absolute',
    top: 100,
    left: '50%',
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  iconContainer: {
    marginTop: spacing.xxl,
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
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  resultTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    letterSpacing: 2,
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
    marginTop: spacing.xl,
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
    marginTop: spacing.xl,
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
});
