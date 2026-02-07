import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { RootStackParamList, TIERS, Bounty } from '../types';
import apiService from '../services/api.service';
import walletService from '../services/wallet.service';

// Sample targets for demo (these would come from backend in production)
const DEMO_TARGETS: Record<number, { target: string; hint: string }[]> = {
  1: [
    { target: 'Fire Hydrant', hint: 'Usually red or yellow, found on streets' },
    { target: 'Blue Car', hint: 'Any shade of blue will work' },
    { target: 'Dog', hint: 'Man\'s best friend, any breed' },
    { target: 'Coffee Cup', hint: 'Paper or reusable, with a lid' },
    { target: 'Tree', hint: 'Living, with visible leaves or branches' },
  ],
  2: [
    { target: 'Starbucks Cup', hint: 'The iconic green mermaid logo' },
    { target: 'Red Shoes', hint: 'Any style, must be clearly red' },
    { target: 'Bicycle', hint: 'Any type, must show wheels' },
    { target: 'Pizza Box', hint: 'Classic delivery box shape' },
    { target: 'Traffic Light', hint: 'Any color showing' },
  ],
  3: [
    { target: 'Person Running', hint: 'Capture the motion' },
    { target: 'Bird in Flight', hint: 'Wings spread in the air' },
    { target: 'Rainbow', hint: 'Natural or artificial' },
    { target: 'Skateboarder', hint: 'On the board, in action' },
    { target: 'Street Performer', hint: 'Any type of performance' },
  ],
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BountyReveal'>;
  route: RouteProp<RootStackParamList, 'BountyReveal'>;
};

export default function BountyRevealScreen({ navigation, route }: Props) {
  const { tier } = route.params;
  const tierData = TIERS[tier];

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [isRevealing, setIsRevealing] = useState(true);
  const [countdown, setCountdown] = useState(3);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Start bounty - try API first, fallback to local demo
  useEffect(() => {
    const startBounty = async () => {
      const wallet = walletService.getWalletState();

      // Try API first
      try {
        const result = await apiService.startBounty(
          wallet.address || 'demo-wallet',
          tier
        );

        if (result.success && result.bounty) {
          console.log('[BountyReveal] Got bounty from API:', result.bounty);
          setBounty(result.bounty);
          return;
        }
      } catch (error) {
        console.log('[BountyReveal] API unavailable, using local demo');
      }

      // Fallback to local demo data
      const targets = DEMO_TARGETS[tier];
      const randomTarget = targets[Math.floor(Math.random() * targets.length)];
      const now = Date.now();

      const demoBounty: Bounty = {
        id: `demo-${now}`,
        tier,
        target: randomTarget.target,
        targetHint: randomTarget.hint,
        startTime: now,
        endTime: now + tierData.timeLimit * 1000,
        status: 'revealing',
        betAmount: tierData.bet,
        potentialWin: tierData.bet * 2,
      };

      setBounty(demoBounty);
    };

    startBounty();
  }, [tier]);

  // Reveal animation sequence
  useEffect(() => {
    if (!bounty) return;

    // Smooth continuous spin animation - linear for constant speed
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Countdown
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          revealTarget();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [bounty]);

  const revealTarget = () => {
    setIsRevealing(false);

    // Stop spinning, reveal with bounce
    rotateAnim.stopAnimation();
    rotateAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // Navigate to camera after showing target
    setTimeout(() => {
      if (bounty) {
        navigation.replace('Camera', { bounty });
      }
    }, 3000);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!bounty) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Background glow effect */}
      <Animated.View
        style={[
          styles.backgroundGlow,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.6],
            }),
          },
        ]}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.tierLabel}>TIER {tier} BOUNTY</Text>
        <Text style={styles.stakeLabel}>
          {tierData.bet} $SKR at stake
        </Text>
      </View>

      {/* Card */}
      <View style={styles.cardContainer}>
        {isRevealing ? (
          // Spinning card (back)
          <Animated.View
            style={[
              styles.card,
              styles.cardBack,
              { transform: [{ rotateY: spin }] },
            ]}
          >
            <Text style={styles.questionMark}>?</Text>
            <Text style={styles.revealingText}>REVEALING IN</Text>
            <Text style={styles.countdownText}>{countdown}</Text>
          </Animated.View>
        ) : (
          // Revealed card (front)
          <Animated.View
            style={[
              styles.card,
              styles.cardFront,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={styles.findLabel}>FIND</Text>
            <Text
              style={styles.targetText}
              numberOfLines={2}
              adjustsFontSizeToFit
            >
              {bounty.target}
            </Text>
            <View style={styles.hintContainer}>
              <Text style={styles.hintLabel}>HINT</Text>
              <Text style={styles.hintText} numberOfLines={2}>{bounty.targetHint}</Text>
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeLabel}>TIME LIMIT</Text>
              <Text style={styles.timeValue}>
                {formatTime(tierData.timeLimit)}
              </Text>
            </View>
            <View style={styles.rewardContainer}>
              <Text style={styles.rewardLabel}>REWARD</Text>
              <Text style={styles.rewardValue}>
                {bounty.potentialWin} $SKR
              </Text>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Bottom instruction */}
      {!isRevealing && (
        <Animated.View style={[styles.instruction, { opacity: fadeAnim }]}>
          <Text style={styles.instructionText}>
            Camera opening in 3 seconds...
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}:00`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundGlow: {
    position: 'absolute',
    top: '30%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.gold,
    ...shadows.glow(colors.gold),
  },
  header: {
    position: 'absolute',
    top: 60,
    alignItems: 'center',
  },
  tierLabel: {
    color: colors.gold,
    fontSize: fontSize.lg,
    fontWeight: '700',
    letterSpacing: 4,
  },
  stakeLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  cardContainer: {
    width: 300,
    minHeight: 380,
  },
  card: {
    width: '100%',
    minHeight: 380,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  cardBack: {
    backgroundColor: colors.darkAlt,
    borderWidth: 3,
    borderColor: colors.gold,
  },
  cardFront: {
    backgroundColor: colors.darkAlt,
    borderWidth: 3,
    borderColor: colors.gold,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  questionMark: {
    fontSize: 120,
    color: colors.gold,
    fontWeight: '900',
  },
  revealingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.lg,
    letterSpacing: 2,
  },
  countdownText: {
    color: colors.textPrimary,
    fontSize: fontSize.xxxl,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  findLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 4,
    marginBottom: spacing.xs,
  },
  targetText: {
    color: colors.gold,
    fontSize: fontSize.lg,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.sm,
  },
  hintContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  hintLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timeContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  timeLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 2,
  },
  timeValue: {
    color: colors.cyan,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  rewardContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  rewardLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 2,
  },
  rewardValue: {
    color: colors.success,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  instruction: {
    position: 'absolute',
    bottom: 60,
  },
  instructionText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
