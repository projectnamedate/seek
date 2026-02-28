import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PublicKey } from '@solana/web3.js';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { RootStackParamList, TIERS, Bounty, TierNumber } from '../types';
import apiService from '../services/api.service';
import { buildAcceptBountyTransaction } from '../services/solana.mobile';
import { useApp } from '../context/AppContext';
import { DEMO_MODE } from '../config';

// Sample targets for demo fallback
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
  const { wallet, signAndSendTransaction, signMessage, connection } = useApp();

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [isRevealing, setIsRevealing] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [statusText, setStatusText] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Start bounty flow
  useEffect(() => {
    if (DEMO_MODE.USE_DEMO_ENDPOINTS) {
      startDemoBounty();
    } else {
      startOnChainBounty();
    }
  }, [tier]);

  /**
   * Demo mode flow: just call API
   */
  const startDemoBounty = async () => {
    try {
      const result = await apiService.startBounty(
        wallet.fullAddress || wallet.address || 'demo-wallet',
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
    useFallbackDemoBounty();
  };

  /**
   * On-chain flow:
   * 1. Call /prepare to get commitment + timestamp + bountyPda
   * 2. Build accept_bounty transaction
   * 3. Sign & send via Phantom (MWA)
   * 4. Call /start with bountyPda + tx signature
   * 5. Get mission details back
   */
  const startOnChainBounty = async () => {
    const playerWallet = wallet.fullAddress;
    if (!playerWallet || !connection) {
      Alert.alert('Error', 'Wallet not connected');
      navigation.goBack();
      return;
    }

    try {
      // Step 1: Prepare bounty (get commitment from backend)
      setStatusText('Preparing bounty...');
      const prepResult = await apiService.prepareBounty(playerWallet, tier);
      if (!prepResult.success || !prepResult.data) {
        throw new Error(prepResult.error || 'Failed to prepare bounty');
      }

      const { commitment, timestamp, bountyPda, entryAmount } = prepResult.data;
      console.log('[BountyReveal] Prepared:', { bountyPda: bountyPda.slice(0, 8), timestamp });

      // Step 2: Build the accept_bounty transaction
      setStatusText('Building transaction...');
      const playerPubkey = new PublicKey(playerWallet);
      const bountyPdaPubkey = new PublicKey(bountyPda);
      const transaction = await buildAcceptBountyTransaction(
        connection,
        playerPubkey,
        BigInt(entryAmount),
        BigInt(timestamp),
        commitment,
        bountyPdaPubkey
      );

      // Step 3: Sign & send via Phantom (single wallet prompt)
      setStatusText('Approve in wallet...');
      let slot: number | undefined;
      try {
        slot = await Promise.race([
          connection.getSlot('confirmed'),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('slot timeout')), 5000)),
        ]);
      } catch {
        console.warn('[BountyReveal] getSlot timed out, sending without minContextSlot');
      }
      const txSignature = await signAndSendTransaction(transaction, ...(slot !== undefined ? [slot] : []) as [number]);
      console.log('[BountyReveal] Tx sent:', txSignature);

      // Brief delay after Phantom deep-link return to let network stabilize
      await new Promise(r => setTimeout(r, 1500));

      // Step 4: Call /start (no auth needed — on-chain tx proves wallet ownership)
      setStatusText('Starting mission...');
      console.log('[BountyReveal] Calling /start...');
      const startResult = await apiService.startBounty(
        playerWallet,
        tier,
        {
          bountyPda,
          transactionSignature: typeof txSignature === 'string' ? txSignature : undefined,
        }
      );

      if (!startResult.success) {
        throw new Error(startResult.error || 'Failed to start bounty');
      }

      // Step 5: Build bounty object from response
      const responseData = startResult.data;
      const now = Date.now();
      const description = responseData?.mission?.description || 'Find the target';
      const parts = description.split(': ');
      const target = (parts[0] || description).replace('Find ', '').replace('Find a ', '').replace('Find an ', '');
      const hint = parts[1] || 'Look around you';

      const newBounty: Bounty = {
        id: responseData?.bountyId || `onchain-${now}`,
        tier,
        target,
        targetHint: hint,
        startTime: now,
        endTime: responseData?.expiresAt
          ? new Date(responseData.expiresAt).getTime()
          : now + tierData.timeLimit * 1000,
        status: 'revealing',
        entryAmount: tierData.entry,
        potentialReward: tierData.entry * 3,
      };

      console.log('[BountyReveal] On-chain bounty started:', newBounty.id);
      setBounty(newBounty);
    } catch (error: any) {
      console.error('[BountyReveal] On-chain flow error:', error);
      const message = error?.message || 'Transaction failed';

      // User cancelled in wallet
      if (message.includes('cancel') || message.includes('rejected') || message.includes('declined')) {
        navigation.goBack();
        return;
      }

      Alert.alert('Transaction Failed', message, [
        { text: 'Try Again', onPress: () => startOnChainBounty() },
        { text: 'Cancel', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const useFallbackDemoBounty = () => {
    const targets = DEMO_TARGETS[tier];
    const randomTarget = targets[Math.floor(Math.random() * targets.length)];
    const now = Date.now();

    setBounty({
      id: `demo-${now}`,
      tier,
      target: randomTarget.target,
      targetHint: randomTarget.hint,
      startTime: now,
      endTime: now + tierData.timeLimit * 1000,
      status: 'revealing',
      entryAmount: tierData.entry,
      potentialReward: tierData.entry * 3,
    });
  };

  // Reveal animation sequence
  useEffect(() => {
    if (!bounty) return;

    // Smooth continuous spin animation
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

  // Show status while preparing on-chain tx
  if (!bounty && !DEMO_MODE.USE_DEMO_ENDPOINTS && statusText) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusContainer}>
          <Animated.View style={styles.spinner}>
            <Text style={styles.spinnerEmoji}>⏳</Text>
          </Animated.View>
          <Text style={styles.statusText}>{statusText}</Text>
          <Text style={styles.statusSubtext}>
            {statusText.includes('wallet') ? 'Check your Phantom wallet' : 'Please wait...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          Entry: {tierData.entry} $SKR
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
                {bounty.potentialReward} $SKR
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

      {/* Compliance Disclaimer */}
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          Success depends on your ability to find and photograph objects
        </Text>
      </View>
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
  statusContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  spinner: {
    marginBottom: spacing.lg,
  },
  spinnerEmoji: {
    fontSize: 48,
  },
  statusText: {
    color: colors.cyan,
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusSubtext: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  backgroundGlow: {
    position: 'absolute',
    top: '30%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.cyan,
    ...shadows.glow(colors.cyan),
  },
  header: {
    position: 'absolute',
    top: 60,
    alignItems: 'center',
  },
  tierLabel: {
    color: colors.cyan,
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
    borderColor: colors.cyan,
  },
  cardFront: {
    backgroundColor: colors.darkAlt,
    borderWidth: 3,
    borderColor: colors.cyan,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  questionMark: {
    fontSize: 120,
    color: colors.cyan,
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
    color: colors.cyan,
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
  disclaimerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  disclaimerText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});
