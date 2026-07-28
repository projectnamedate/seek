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
import { RootStackParamList, TIERS, Bounty } from '../types';
import apiService from '../services/api.service';
import {
  buildAcceptBountyTransaction,
  buildCancelBountyTransaction,
} from '../services/solana.mobile';
import { getOrCreateBountySession } from '../services/session.service';
import {
  pendingStartForWallet,
  toStartBountyOptions,
  type PendingBountyStart,
} from '../services/pending-bounty-start';
import { useApp } from '../context/AppContext';
import { formatTime } from '../utils/format';
import {
  clearPendingBountyStart,
  getPendingBountyStart,
  savePendingBountyStart,
} from '../utils/storage';
import { hasSeekPermissions, requestSeekPermissions } from '../services/permissions.service';
import { TOKEN } from '../config';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BountyReveal'>;
  route: RouteProp<RootStackParamList, 'BountyReveal'>;
};

function parseMissionDescription(description: string): { target: string; hint: string } {
  const [targetPart, hintPart] = description.split(': ');
  return {
    target: (targetPart || description).replace(/^Find\s+(a\s+|an\s+)?/i, ''),
    hint: hintPart || 'Capture all listed cues in one photo',
  };
}

function wholeSkrFromBaseUnits(baseUnits: number): number {
  return Number(BigInt(baseUnits) / (10n ** BigInt(TOKEN.DECIMALS)));
}

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
  const statusSpinAnim = useRef(new Animated.Value(0)).current;
  const startInFlight = useRef(false);
  const pendingReceiptRef = useRef<PendingBountyStart | null>(null);

  // Start the on-chain flow as soon as the screen mounts.
  useEffect(() => {
    startOnChainBounty();
  }, [tier]);

  useEffect(() => {
    const statusLoop = Animated.loop(
      Animated.timing(statusSpinAnim, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    statusLoop.start();
    return () => statusLoop.stop();
  }, []);

  /**
   * On-chain flow:
   * 1. Create/reuse an off-chain bounty session
   * 2. Call /prepare to get commitment + timestamp + bountyPda
   * 3. Build accept_bounty transaction
   * 4. Sign & send via Seeker Wallet (MWA)
   * 5. Call /start with bountyPda + tx signature
   * 6. Get mission details back
   */
  const recoverExpiredEntry = async (receipt: PendingBountyStart) => {
    const playerWallet = wallet.fullAddress;
    if (!playerWallet || !connection || playerWallet !== receipt.playerWallet) {
      Alert.alert('Recovery Error', 'Reconnect the wallet that paid for this hunt.');
      return;
    }

    try {
      setStatusText('Approve entry recovery in Seeker Wallet...');
      const transaction = await buildCancelBountyTransaction(
        connection,
        new PublicKey(playerWallet),
        new PublicKey(receipt.bountyPda),
      );
      const slot = await connection.getSlot('confirmed');
      const signature = await signAndSendTransaction(transaction, slot);
      if (typeof signature !== 'string') {
        throw new Error('Wallet did not return a recovery transaction signature');
      }
      await clearPendingBountyStart(receipt.bountyPda);
      pendingReceiptRef.current = null;
      Alert.alert(
        'Entry Recovery Submitted',
        'Your wallet submitted the on-chain entry recovery. No additional payment was sent.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert(
        'Recovery Not Submitted',
        `${error?.message || 'Wallet recovery failed'}\n\nThe paid receipt is still saved. No new entry payment was sent.`,
      );
    }
  };

  const startOnChainBounty = async () => {
    if (startInFlight.current) return;

    const playerWallet = wallet.fullAddress;
    if (!playerWallet || !connection) {
      Alert.alert('Error', 'Wallet not connected');
      navigation.goBack();
      return;
    }

    startInFlight.current = true;
    let paidReceipt: PendingBountyStart | null = null;

    try {
      const storedReceipt = pendingReceiptRef.current ?? await getPendingBountyStart();
      if (storedReceipt && storedReceipt.playerWallet !== playerWallet) {
        throw new Error(
          'A paid hunt is still waiting on the wallet that started it. Reconnect that wallet to recover its mission.',
        );
      }
      paidReceipt = pendingStartForWallet(storedReceipt, playerWallet);

      if (!paidReceipt) {
        setStatusText('Checking camera and location...');
        const permissionState = await requestSeekPermissions();
        if (!hasSeekPermissions(permissionState)) {
          Alert.alert(
            'Permissions Required',
            'Camera and location access are required before starting a paid hunt. No SKR has been moved.',
            [{ text: 'OK', onPress: () => navigation.goBack() }],
          );
          return;
        }

        setStatusText('Creating secure session...');
        const bountySession = await getOrCreateBountySession(playerWallet, signMessage);

        setStatusText('Preparing bounty...');
        const prepResult = await apiService.prepareBounty(playerWallet, tier, {
          permissionsConfirmed: true,
          sessionToken: bountySession.sessionToken,
        });
        if (!prepResult.success || !prepResult.data) {
          throw new Error(prepResult.error || 'Failed to prepare bounty');
        }

        const {
          commitment,
          prepareId,
          timestamp,
          bountyPda,
          entryAmount,
          entryAmountSkr,
          instructionVersion,
          returnAmountSkr,
        } = prepResult.data;
        if (__DEV__) {
          console.log('[BountyReveal] Prepared:', {
            bountyPda: bountyPda.slice(0, 8),
            timestamp,
            instructionVersion,
          });
        }

        setStatusText('Building transaction...');
        const transaction = await buildAcceptBountyTransaction(
          connection,
          new PublicKey(playerWallet),
          BigInt(entryAmount),
          BigInt(timestamp),
          commitment,
          new PublicKey(bountyPda),
          {
            instructionVersion: instructionVersion ?? 1,
            tier,
          },
        );

        if (!transaction.recentBlockhash || !transaction.lastValidBlockHeight) {
          throw new Error('Wallet transaction expiry metadata is unavailable');
        }
        paidReceipt = {
          playerWallet,
          tier,
          bountyPda,
          recentBlockhash: transaction.recentBlockhash,
          lastValidBlockHeight: transaction.lastValidBlockHeight,
          prepareId,
          sessionToken: bountySession.sessionToken,
          entryAmountSkr:
            entryAmountSkr ?? wholeSkrFromBaseUnits(entryAmount),
          returnAmountSkr:
            returnAmountSkr ??
            (entryAmountSkr ?? wholeSkrFromBaseUnits(entryAmount)) * 2,
          createdAt: Date.now(),
        };
        // Persist the expected PDA before opening MWA. If the app is killed
        // during the wallet deep link, /start can recover from the on-chain
        // account without needing the lost signature string.
        pendingReceiptRef.current = paidReceipt;
        await savePendingBountyStart(paidReceipt);

        setStatusText('Approve in Seeker Wallet...');
        let slot: number | undefined;
        try {
          slot = await Promise.race([
            connection.getSlot('confirmed'),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('slot timeout')), 5000)),
          ]);
        } catch {
          if (__DEV__) {
            console.warn('[BountyReveal] getSlot timed out, sending without minContextSlot');
          }
        }

        const txSignature = await signAndSendTransaction(
          transaction,
          ...(slot !== undefined ? [slot] : []) as [number],
        );
        if (typeof txSignature !== 'string') {
          throw new Error('Wallet did not return a transaction signature');
        }
        if (__DEV__) console.log('[BountyReveal] Tx sent:', txSignature);

        paidReceipt = {
          ...paidReceipt,
          transactionSignature: txSignature,
        };
        // Set the memory guard before touching storage. Even if AsyncStorage
        // fails, this mounted screen will never build a second payment.
        pendingReceiptRef.current = paidReceipt;
        await savePendingBountyStart(paidReceipt);

        // Brief delay after wallet return to let the deep link settle. Backend
        // transaction verification also polls RPC indexing.
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else {
        pendingReceiptRef.current = paidReceipt;
      }

      setStatusText('Recovering paid mission...');
      const startResult = await apiService.startBounty(
        playerWallet,
        paidReceipt.tier,
        toStartBountyOptions(paidReceipt),
      );

      if (!startResult.success) {
        if (startResult.data?.recoveryRequired) {
          const cancelAvailableAt = Number(startResult.data.cancelAvailableAt);
          const recoveryAvailable = Date.now() > cancelAvailableAt * 1000;
          const actions = recoveryAvailable
            ? [
                {
                  text: 'Recover Entry',
                  onPress: () => recoverExpiredEntry(paidReceipt!),
                },
                { text: 'Close', onPress: () => navigation.goBack() },
              ]
            : [{ text: 'Close', onPress: () => navigation.goBack() }];
          Alert.alert(
            'Mission Was Not Delivered',
            recoveryAvailable
              ? 'The mission timer expired before delivery. Your original entry is still in the contract and can now be recovered with one wallet approval.'
              : `The mission timer expired before delivery. Your entry remains in the contract and becomes recoverable after ${new Date(cancelAvailableAt * 1000).toLocaleString()}.`,
            actions,
          );
          return;
        }
        if (startResult.data?.safeToRetryPayment) {
          await clearPendingBountyStart(paidReceipt.bountyPda);
          pendingReceiptRef.current = null;
          paidReceipt = null;
        }
        throw new Error(startResult.error || 'Paid mission recovery is still pending');
      }

      const responseData = startResult.data;
      if (responseData?.paymentRecovered) {
        await clearPendingBountyStart(paidReceipt.bountyPda);
        pendingReceiptRef.current = null;
        Alert.alert(
          'Entry Recovered',
          'The contract confirms this undelivered mission was cancelled and the entry was recovered.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
        return;
      }
      if (!responseData?.bountyId || !responseData?.submitToken) {
        throw new Error('Mission recovery response was incomplete');
      }
      const ackResult = await apiService.acknowledgeMission(
        responseData.bountyId,
        responseData.submitToken,
      );
      if (!ackResult.success) {
        throw new Error(
          ackResult.error || 'Mission delivery acknowledgement is still pending',
        );
      }
      const now = Date.now();
      const description = responseData?.mission?.description || 'Find the target';
      const { target, hint } = parseMissionDescription(description);
      const recoveredTier = paidReceipt.tier;
      const recoveredTierData = TIERS[recoveredTier];
      const displayEntryAmount =
        responseData?.entryAmountSkr ?? paidReceipt.entryAmountSkr;
      const displayReturnAmount =
        responseData?.returnAmountSkr ?? paidReceipt.returnAmountSkr;

      const newBounty: Bounty = {
        id: responseData?.bountyId || `onchain-${now}`,
        tier: recoveredTier,
        target,
        targetHint: hint,
        startTime: now,
        endTime: responseData?.expiresAt
          ? new Date(responseData.expiresAt).getTime()
          : now + recoveredTierData.timeLimit * 1000,
        status: 'revealing',
        entryAmount: displayEntryAmount,
        potentialReward: displayReturnAmount,
        bountyPda: paidReceipt.bountyPda,
        submitToken: responseData?.submitToken,
        sessionToken: paidReceipt.sessionToken,
      };

      if (__DEV__) console.log('[BountyReveal] On-chain bounty started:', newBounty.id);
      await clearPendingBountyStart(paidReceipt.bountyPda);
      pendingReceiptRef.current = null;
      setBounty(newBounty);
    } catch (error: any) {
      if (__DEV__) console.error('[BountyReveal] On-chain flow error:', error);
      const message = error?.message || 'Transaction failed';

      // Wallet rejection text is not enough to prove the transaction did not
      // land: MWA can lose the signature during an interrupted deep-link
      // return. Preserve any pre-wallet receipt until /start proves the PDA is
      // absent and the prepared blockhash has expired.
      const walletRejected =
        message.includes('cancel') ||
        message.includes('rejected') ||
        message.includes('declined');
      if (!paidReceipt && walletRejected) {
        navigation.goBack();
        return;
      }

      if (paidReceipt) {
        Alert.alert(
          paidReceipt.transactionSignature
            ? 'Payment Confirmed — Recovering Mission'
            : 'Checking Payment Status',
          `${message}\n\nRetry will reuse the confirmed payment. It will not send another transaction.`,
          [
            { text: 'Retry Recovery', onPress: () => startOnChainBounty() },
            { text: 'Close', onPress: () => navigation.goBack() },
          ],
        );
      } else {
        Alert.alert('Transaction Failed', message, [
          { text: 'Try Again', onPress: () => startOnChainBounty() },
          { text: 'Cancel', onPress: () => navigation.goBack() },
        ]);
      }
    } finally {
      startInFlight.current = false;
    }
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

  const statusSpin = statusSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Show status while preparing on-chain tx
  if (!bounty && statusText) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusContainer}>
          <Animated.View style={[styles.statusRing, { transform: [{ rotate: statusSpin }] }]}>
            <View style={styles.statusRingInner} />
          </Animated.View>
          <Text style={styles.statusText}>{statusText}</Text>
          <Text style={styles.statusSubtext}>
            {statusText.toLowerCase().includes('wallet') ? 'Check Seeker Wallet' : 'Please wait...'}
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
              numberOfLines={4}
              adjustsFontSizeToFit
              minimumFontScale={0.58}
            >
              {bounty.target}
            </Text>
            <View style={styles.hintContainer}>
              <Text style={styles.hintLabel}>HINT</Text>
              <Text style={styles.hintText} numberOfLines={2} adjustsFontSizeToFit>{bounty.targetHint}</Text>
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeLabel}>TIME LIMIT</Text>
              <Text style={styles.timeValue}>
                {formatTime(tierData.timeLimit)}
              </Text>
            </View>
            <View style={styles.rewardContainer}>
              <Text style={styles.rewardLabel}>RETURN</Text>
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
  statusRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.aqua,
    borderTopColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  statusRingInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.frost,
    borderBottomColor: 'transparent',
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
    width: 320,
    maxWidth: '90%',
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
    fontSize: fontSize.md,
    lineHeight: 20,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0,
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
