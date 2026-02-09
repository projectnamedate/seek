import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PrivacyPolicy'>;
};

export default function PrivacyPolicyScreen({ navigation }: Props) {
  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last Updated: February 2025</Text>

        <Text style={styles.introText}>
          Seek is committed to protecting your privacy. This policy explains what
          data we collect, how we use it, and your rights regarding your information.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data We Collect</Text>

          <View style={styles.dataItem}>
            <Text style={styles.dataTitle}>GPS Coordinates</Text>
            <Text style={styles.dataDescription}>
              We collect your GPS location when you submit photos. This is logged with
              each submission to verify that photos were taken in real-world conditions
              and not pre-captured.
            </Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataTitle}>Photos</Text>
            <Text style={styles.dataDescription}>
              Photos you submit are processed by our AI validation system to determine
              if they contain the target object. Photos are analyzed in real-time and
              are not stored permanently after validation is complete.
            </Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataTitle}>Wallet Address</Text>
            <Text style={styles.dataDescription}>
              Your Solana wallet address is used to identify your account and process
              reward payouts. This is a public blockchain address and is necessary for
              the protocol to function.
            </Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataTitle}>Submission Timestamps</Text>
            <Text style={styles.dataDescription}>
              We record when submissions are made to verify they occurred within the
              challenge time limit.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Data</Text>

          <View style={styles.useCase}>
            <Text style={styles.useCaseTitle}>GPS Coordinates</Text>
            <Text style={styles.useCaseText}>
              Used exclusively for anti-fraud verification. We check that submissions
              show location movement consistent with real-world photo capture. Location
              data is not shared with third parties.
            </Text>
          </View>

          <View style={styles.useCase}>
            <Text style={styles.useCaseTitle}>Photos</Text>
            <Text style={styles.useCaseText}>
              Photos are sent to our AI validation system for analysis. Once validated,
              photos are deleted from our servers. We do not retain your photos for
              any other purpose.
            </Text>
          </View>

          <View style={styles.useCase}>
            <Text style={styles.useCaseTitle}>Wallet Address</Text>
            <Text style={styles.useCaseText}>
              Used to process entry fees and send rewards. Wallet addresses are also
              used to track your competition history and statistics within the app.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <View style={styles.highlightBox}>
            <Text style={styles.highlightText}>
              We do not sell your personal data to third parties.
            </Text>
          </View>
          <Text style={styles.sectionText}>
            Your data may be shared in limited circumstances:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              {'\u2022'} With AI providers for photo validation (photos only, deleted after use)
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} With blockchain networks for transaction processing (wallet addresses)
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} If required by law enforcement or legal process
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              {'\u2022'} Photos: Deleted immediately after AI validation
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} GPS data: Retained for 30 days for fraud prevention
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} Transaction data: Permanently on blockchain (public)
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} Account data: Until you disconnect your wallet
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.sectionText}>
            You have the right to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              {'\u2022'} Request access to your personal data
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} Request deletion of your data (except blockchain records)
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} Opt out by simply not using the service
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} Revoke camera and location permissions at any time
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Text style={styles.sectionText}>
            We implement industry-standard security measures to protect your data.
            However, no system is 100% secure. We recommend using a hardware wallet
            for significant $SKR holdings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.sectionText}>
            Seek is not intended for users under 18 years of age. We do not knowingly
            collect data from minors. If we learn we have collected data from a minor,
            we will delete it immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.sectionText}>
            We may update this privacy policy from time to time. Continued use of
            the app after changes constitutes acceptance of the updated policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.sectionText}>
            For privacy-related inquiries, please reach out through official
            Seek community channels or visit our website.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.darkLight,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  backText: {
    color: colors.cyan,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  lastUpdated: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
  },
  introText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.cyan,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
  dataItem: {
    backgroundColor: colors.darkAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dataTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dataDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  useCase: {
    marginBottom: spacing.md,
  },
  useCaseTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  useCaseText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  highlightBox: {
    backgroundColor: colors.teal,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.cyan,
  },
  highlightText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  bulletList: {
    marginTop: spacing.sm,
    paddingLeft: spacing.sm,
  },
  bulletItem: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 24,
  },
});
