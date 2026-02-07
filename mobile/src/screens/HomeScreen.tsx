import React, { useState, useEffect, useRef } from 'react';
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
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { RootStackParamList, TierNumber, TIERS, WalletState } from '../types';
import walletService from '../services/wallet.service';

// Tier colors - Solana Mobile inspired
const TIER_COLORS = {
  1: '#cfe6e4', // Light teal (Easy)
  2: '#95d2e6', // Sky blue (Medium)
  3: '#61afbd', // Bright cyan (Hard)
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const [wallet, setWallet] = useState<WalletState>(walletService.getWalletState());
  const [selectedTier, setSelectedTier] = useState<TierNumber>(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [jackpot, setJackpot] = useState(128470); // Starting jackpot amount
  const jackpotAnim = useRef(new Animated.Value(1)).current;

  // Individual pulse animations for each tier button
  const tierAnims = useRef({
    1: new Animated.Value(1),
    2: new Animated.Value(1),
    3: new Animated.Value(1),
  }).current;

  // Trigger single pulse animation on tier select
  const handleTierSelect = (tierNum: TierNumber) => {
    setSelectedTier(tierNum);

    // Reset and play single pulse
    tierAnims[tierNum].setValue(1);
    Animated.sequence([
      Animated.timing(tierAnims[tierNum], {
        toValue: 1.08,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(tierAnims[tierNum], {
        toValue: 1,
        duration: 150,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Subscribe to wallet changes
  useEffect(() => {
    return walletService.subscribeToWallet(setWallet);
  }, []);

  // Jackpot animation and random updates
  useEffect(() => {
    // Pulse animation for jackpot
    const jackpotPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(jackpotAnim, {
          toValue: 1.02,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(jackpotAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    jackpotPulse.start();

    // Random jackpot increases
    const interval = setInterval(() => {
      setJackpot(prev => prev + Math.floor(Math.random() * 500) + 100);
    }, 3000);

    return () => {
      jackpotPulse.stop();
      clearInterval(interval);
    };
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

  const renderTierButton = (tierNum: TierNumber) => {
    const tier = TIERS[tierNum];
    const isSelected = selectedTier === tierNum;
    const canAfford = wallet.connected && wallet.balance >= tier.bet;
    const tierColor = TIER_COLORS[tierNum];

    return (
      <TouchableOpacity
        key={tierNum}
        onPress={() => handleTierSelect(tierNum)}
        disabled={!wallet.connected}
        activeOpacity={0.8}
        style={styles.tierButtonWrapper}
      >
        <Animated.View
          style={[
            styles.tierButton,
            { backgroundColor: tierColor },
            isSelected && styles.tierButtonSelected,
            !canAfford && wallet.connected && styles.tierButtonDisabled,
            { transform: [{ scale: tierAnims[tierNum] }] },
          ]}
        >
          <View style={styles.tierButtonContent}>
            <View style={styles.tierButtonLeft}>
              <Text style={styles.tierButtonLabel}>{tier.difficulty.toUpperCase()}</Text>
              <Text style={styles.tierButtonTime}>{formatTime(tier.timeLimit)}</Text>
            </View>
            <View style={styles.tierButtonRight}>
              <Text style={styles.tierButtonBet}>{tier.bet} $SKR</Text>
              <Text style={styles.tierButtonWin}>Win {tier.bet * 2}</Text>
            </View>
          </View>
          {isSelected && (
            <View style={styles.tierSelectedBadge}>
              <Text style={styles.tierSelectedText}>SELECTED</Text>
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
              <Text style={styles.walletAddress}>
                {wallet.skrName || wallet.address}
              </Text>
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
        <View style={styles.tiersStack}>
          {([1, 2, 3] as TierNumber[]).map(renderTierButton)}
        </View>
      </View>

      {/* Jackpot Monitor */}
      <View style={styles.jackpotSection}>
        <View style={styles.jackpotContainer}>
          <Text style={styles.jackpotLabel}>JACKPOT</Text>
          <Animated.View style={{ transform: [{ scale: jackpotAnim }] }}>
            <Text style={styles.jackpotAmount}>
              {jackpot.toLocaleString()} $SKR
            </Text>
          </Animated.View>
          <Text style={styles.jackpotSubtext}>1 in 500 chance to win it all</Text>
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
    color: colors.cyan,
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
    color: colors.cyanLight,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  connectButton: {
    backgroundColor: colors.cyan,
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
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  tiersStack: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
  },
  tierButtonWrapper: {
    width: '100%',
    maxWidth: 320,
  },
  tierButton: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 3,
    borderColor: 'transparent',
    ...shadows.md,
  },
  tierButtonSelected: {
    borderColor: colors.textPrimary,
    ...shadows.lg,
  },
  tierButtonDisabled: {
    opacity: 0.5,
  },
  tierButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierButtonLeft: {
    flex: 1,
  },
  tierButtonRight: {
    alignItems: 'flex-end',
  },
  tierButtonLabel: {
    color: colors.dark,
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tierButtonTime: {
    color: 'rgba(0,0,0,0.7)',
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  tierButtonBet: {
    color: colors.dark,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  tierButtonWin: {
    color: 'rgba(0,0,0,0.7)',
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  tierSelectedBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderTopRightRadius: borderRadius.lg - 2,
    borderBottomLeftRadius: borderRadius.sm,
  },
  tierSelectedText: {
    color: colors.dark,
    fontSize: 10,
    fontWeight: '800',
  },
  jackpotSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  jackpotContainer: {
    backgroundColor: colors.darkAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cyan,
    ...shadows.glow(colors.cyan),
  },
  jackpotLabel: {
    color: colors.cyan,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  jackpotAmount: {
    color: colors.cyanLight,
    fontSize: fontSize.xxl,
    fontWeight: '900',
  },
  jackpotSubtext: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  startSection: {
    padding: spacing.lg,
  },
  startButton: {
    backgroundColor: colors.cyan,
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
    backgroundColor: colors.teal,
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
