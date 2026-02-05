import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { RootStackParamList, TierNumber, TIERS, WalletState } from '../types';
import walletService from '../services/wallet.service';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const [wallet, setWallet] = useState<WalletState>(walletService.getWalletState());
  const [selectedTier, setSelectedTier] = useState<TierNumber>(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Subscribe to wallet changes
  useEffect(() => {
    return walletService.subscribeToWallet(setWallet);
  }, []);

  // Pulse animation for selected tier
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    await walletService.connectWallet();
    setIsConnecting(false);
  };

  const handleStartHunt = async () => {
    const tier = TIERS[selectedTier];

    // Check balance
    if (!walletService.hasSufficientBalance(tier.bet)) {
      // TODO: Show insufficient balance modal
      return;
    }

    // Deduct bet
    const success = await walletService.deductBet(tier.bet);
    if (success) {
      navigation.navigate('BountyReveal', { tier: selectedTier });
    }
  };

  const renderTierCard = (tierNum: TierNumber) => {
    const tier = TIERS[tierNum];
    const isSelected = selectedTier === tierNum;
    const canAfford = wallet.connected && wallet.balance >= tier.bet;

    return (
      <TouchableOpacity
        key={tierNum}
        onPress={() => setSelectedTier(tierNum)}
        disabled={!wallet.connected}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.tierCard,
            isSelected && styles.tierCardSelected,
            !canAfford && wallet.connected && styles.tierCardDisabled,
            isSelected && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View style={styles.tierHeader}>
            <Text style={styles.tierNumber}>TIER {tierNum}</Text>
            <View style={[styles.difficultyBadge, getDifficultyStyle(tier.difficulty)]}>
              <Text style={styles.difficultyText}>{tier.difficulty}</Text>
            </View>
          </View>

          <Text style={styles.tierBet}>{tier.bet} $SKR</Text>

          <View style={styles.tierInfo}>
            <Text style={styles.tierInfoLabel}>Time Limit</Text>
            <Text style={styles.tierInfoValue}>{formatTime(tier.timeLimit)}</Text>
          </View>

          <View style={styles.tierInfo}>
            <Text style={styles.tierInfoLabel}>Win</Text>
            <Text style={[styles.tierInfoValue, styles.winAmount]}>
              {tier.bet * 2} $SKR
            </Text>
          </View>

          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Text style={styles.selectedText}>SELECTED</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>SEEK</Text>
        <Text style={styles.tagline}>Hunt. Capture. Win.</Text>
      </View>

      {/* Wallet Section */}
      <View style={styles.walletSection}>
        {wallet.connected ? (
          <View style={styles.walletConnected}>
            <View style={styles.walletInfo}>
              <View style={styles.walletDot} />
              <Text style={styles.walletAddress}>{wallet.address}</Text>
            </View>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={styles.balanceValue}>
                {walletService.formatBalance(wallet.balance)}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.connectButton}
            onPress={handleConnect}
            disabled={isConnecting}
          >
            <Text style={styles.connectButtonText}>
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tier Selection */}
      <View style={styles.tiersSection}>
        <Text style={styles.sectionTitle}>Select Your Risk</Text>
        <View style={styles.tiersGrid}>
          {([1, 2, 3] as TierNumber[]).map(renderTierCard)}
        </View>
      </View>

      {/* Start Button */}
      <View style={styles.startSection}>
        <TouchableOpacity
          style={[
            styles.startButton,
            !wallet.connected && styles.startButtonDisabled,
          ]}
          onPress={handleStartHunt}
          disabled={!wallet.connected}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>
            {wallet.connected ? 'START HUNT' : 'Connect Wallet to Play'}
          </Text>
          {wallet.connected && (
            <Text style={styles.startButtonSubtext}>
              Bet {TIERS[selectedTier].bet} $SKR to win {TIERS[selectedTier].bet * 2}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Demo Badge */}
      {wallet.isDemo && wallet.connected && (
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>DEMO MODE</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function getDifficultyStyle(difficulty: string) {
  switch (difficulty) {
    case 'Easy':
      return { backgroundColor: colors.success };
    case 'Medium':
      return { backgroundColor: colors.warning };
    case 'Hard':
      return { backgroundColor: colors.error };
    default:
      return {};
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  logo: {
    fontSize: fontSize.xxxl,
    fontWeight: '900',
    color: colors.gold,
    letterSpacing: 8,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    letterSpacing: 2,
  },
  walletSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  walletConnected: {
    backgroundColor: colors.darkAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  walletAddress: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  balanceValue: {
    color: colors.gold,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  connectButton: {
    backgroundColor: colors.purple,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  connectButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  tiersSection: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  tiersGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tierCard: {
    flex: 1,
    backgroundColor: colors.darkAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 100,
  },
  tierCardSelected: {
    borderColor: colors.gold,
    ...shadows.glow(colors.gold),
  },
  tierCardDisabled: {
    opacity: 0.5,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tierNumber: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  difficultyText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  tierBet: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  tierInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  tierInfoLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  tierInfoValue: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  winAmount: {
    color: colors.success,
  },
  selectedIndicator: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderTopRightRadius: borderRadius.lg - 2,
    borderBottomLeftRadius: borderRadius.sm,
  },
  selectedText: {
    color: colors.dark,
    fontSize: 8,
    fontWeight: '700',
  },
  startSection: {
    padding: spacing.lg,
  },
  startButton: {
    backgroundColor: colors.gold,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.lg,
  },
  startButtonDisabled: {
    backgroundColor: colors.darkLight,
  },
  startButtonText: {
    color: colors.dark,
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 2,
  },
  startButtonSubtext: {
    color: colors.dark,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  demoBadge: {
    position: 'absolute',
    top: spacing.xl + 8,
    right: spacing.lg,
    backgroundColor: colors.purple,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  demoBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
});
