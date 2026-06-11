import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  Modal,
  Alert,
  Linking,
  AppState,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { RootStackParamList, TierNumber, TIERS } from '../types';
import walletService from '../services/wallet.service';
import apiService from '../services/api.service';
import { useApp } from '../context/AppContext';
import { formatTimeHuman as formatTime } from '../utils/format';
import {
  formatMissingPermissions,
  getSeekPermissions,
  hasSeekPermissions,
  requestSeekPermissions,
  SeekPermissionState,
} from '../services/permissions.service';

const APP_VERSION = '1.0.5';

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
  const {
    wallet,
    connectWallet,
    disconnectWallet,
    refreshWalletBalance,
  } = useApp();
  const [selectedTier, setSelectedTier] = useState<TierNumber>(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [singularityPool, setSingularityPool] = useState<string | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [permissionState, setPermissionState] = useState<SeekPermissionState | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const singularityAnim = useRef(new Animated.Value(1)).current;

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
        toValue: 1.025,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tierAnims[tierNum], {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Wallet state is now managed by AppContext — no subscription needed

  useFocusEffect(
    useCallback(() => {
      if (wallet.connected) {
        void refreshWalletBalance();
      }
    }, [wallet.connected, refreshWalletBalance])
  );

  // Singularity pool pulse and live stats refresh.
  useEffect(() => {
    const poolPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(singularityAnim, {
          toValue: 1.008,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(singularityAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    poolPulse.start();

    const refreshPool = async () => {
      const result = await apiService.getProtocolStats();
      if (result.success && result.stats) {
        setSingularityPool(result.stats.vaults.singularity);
      }
    };

    refreshPool();
    const interval = setInterval(refreshPool, 30000);

    return () => {
      poolPulse.stop();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const requestOnLaunch = async () => {
      setIsCheckingPermissions(true);
      try {
        setPermissionState(await requestSeekPermissions());
      } finally {
        setIsCheckingPermissions(false);
      }
    };

    requestOnLaunch();

    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        setPermissionState(await getSeekPermissions());
      }
    });

    return () => subscription.remove();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    await connectWallet();
    setIsConnecting(false);
  };

  const handleStartHunt = async () => {
    const tier = TIERS[selectedTier];
    const latestPermissionState: SeekPermissionState = hasSeekPermissions(permissionState)
      ? permissionState!
      : await requestSeekPermissions();
    setPermissionState(latestPermissionState);

    if (!hasSeekPermissions(latestPermissionState)) {
      const missing = formatMissingPermissions(latestPermissionState);
      Alert.alert(
        'Permissions Required',
        `${missing} access must be enabled before starting a paid hunt. No SKR will move until permissions are granted.`,
        latestPermissionState.canAskAgain
          ? [{ text: 'OK' }]
          : [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
      );
      return;
    }

    // Check balance using AppContext wallet state.
    if (wallet.balance < tier.entry) {
      // TODO: Show insufficient balance modal
      return;
    }

    navigation.navigate('BountyReveal', { tier: selectedTier });
  };

  const renderTierButton = (tierNum: TierNumber) => {
    const tier = TIERS[tierNum];
    const isSelected = selectedTier === tierNum;
    const canAfford = wallet.connected && wallet.balance >= tier.entry;
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
              <Text style={styles.tierButtonEntry}>{tier.entry} $SKR</Text>
              <Text style={styles.tierButtonReward}>Return {tier.entry * 2}</Text>
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
      {/* Settings Button */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setSettingsVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.settingsIcon}>...</Text>
      </TouchableOpacity>

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
            <View style={styles.walletActions}>
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceLabel}>Balance</Text>
                <Text style={styles.balanceValue}>
                  {walletService.formatBalance(wallet.balance)}
                </Text>
              </View>
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
      <View style={[styles.tiersSection, !wallet.connected && styles.dimmed]} pointerEvents={wallet.connected ? 'auto' : 'none'}>
        <Text style={styles.sectionTitle}>Select Your Challenge</Text>
        <View style={styles.tiersStack}>
          {([1, 2, 3] as TierNumber[]).map(renderTierButton)}
        </View>
      </View>

      {/* Singularity Pool */}
      <View style={styles.singularitySection}>
        <View style={styles.singularityContainer}>
          <Text style={styles.singularityLabel}>SINGULARITY POOL</Text>
          <Animated.View style={{ transform: [{ scale: singularityAnim }] }}>
            <Text style={styles.singularityAmount}>
              {singularityPool || '-- $SKR'}
            </Text>
          </Animated.View>
          <Text style={styles.singularitySubtext}>Eligible completions can receive it</Text>
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
          <Text style={[styles.startButtonText, !wallet.connected && styles.startButtonTextDisabled]}>
            {!wallet.connected
              ? 'Connect Wallet to Play'
              : isCheckingPermissions
                ? 'Checking Permissions...'
                : hasSeekPermissions(permissionState)
                  ? 'START HUNT'
                  : 'Enable Camera + Location'}
          </Text>
          {wallet.connected && (
            <Text style={styles.startButtonSubtext}>
              Entry {TIERS[selectedTier].entry} $SKR to Return {TIERS[selectedTier].entry * 2}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Compliance Disclaimer */}
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          18+ only. Skill-based competition.
        </Text>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSettingsVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>

            {wallet.connected && (
              <TouchableOpacity
                style={[styles.modalItem, styles.disconnectItem]}
                onPress={async () => {
                  setSettingsVisible(false);
                  await disconnectWallet();
                }}
              >
                <Text style={[styles.modalItemText, styles.disconnectText]}>Disconnect Wallet</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setSettingsVisible(false);
                navigation.navigate('TermsOfService');
              }}
            >
              <Text style={styles.modalItemText}>Terms of Service</Text>
              <Text style={styles.modalItemArrow}>{'>'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setSettingsVisible(false);
                navigation.navigate('PrivacyPolicy');
              }}
            >
              <Text style={styles.modalItemText}>Privacy Policy</Text>
              <Text style={styles.modalItemArrow}>{'>'}</Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <View style={styles.modalAbout}>
              <Text style={styles.modalAboutTitle}>About Seek</Text>
              <Text style={styles.modalAboutText}>
                Skill-based scavenger hunt protocol on Solana
              </Text>
            </View>

            <View style={styles.modalVersion}>
              <Text style={styles.modalVersionText}>Version {APP_VERSION}</Text>
            </View>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSettingsVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
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
    gap: spacing.md,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
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
  walletActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
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
    borderColor: colors.frost,
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
  tierButtonEntry: {
    color: colors.dark,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  tierButtonReward: {
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
  singularitySection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  singularityContainer: {
    backgroundColor: colors.darkAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.teal,
    ...shadows.glow(colors.aqua),
  },
  singularityLabel: {
    color: colors.cyan,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  singularityAmount: {
    color: colors.cyanLight,
    fontSize: fontSize.xxl,
    fontWeight: '900',
  },
  singularitySubtext: {
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
    backgroundColor: colors.darkAlt,
    borderWidth: 1,
    borderColor: colors.darkLight,
  },
  startButtonText: {
    color: colors.dark,
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 2,
  },
  startButtonTextDisabled: {
    color: colors.textSecondary,
  },
  startButtonSubtext: {
    color: colors.dark,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  dimmed: {
    opacity: 0.42,
  },
  settingsButton: {
    position: 'absolute',
    top: spacing.xl + 8,
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },
  settingsIcon: {
    color: colors.textSecondary,
    fontSize: fontSize.xl,
    fontWeight: '900',
    letterSpacing: 2,
  },
  disclaimerContainer: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  disclaimerText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.darkAlt,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.darkLight,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.darkLight,
  },
  modalItemText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  modalItemArrow: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  disconnectItem: {
    borderBottomColor: colors.error,
  },
  disconnectText: {
    color: colors.error,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.darkLight,
    marginVertical: spacing.md,
  },
  modalAbout: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalAboutTitle: {
    color: colors.cyan,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  modalAboutText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  modalVersion: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalVersionText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  modalClose: {
    backgroundColor: colors.darkLight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
