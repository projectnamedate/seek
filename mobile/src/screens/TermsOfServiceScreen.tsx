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
  navigation: NativeStackNavigationProp<RootStackParamList, 'TermsOfService'>;
};

export default function TermsOfServiceScreen({ navigation }: Props) {
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
        <Text style={styles.title}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last Updated: February 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Service Description</Text>
          <Text style={styles.sectionText}>
            Seek is a skill-based competition protocol built on the Solana blockchain.
            Users participate in real-world scavenger hunts where success depends entirely
            on the player's ability to locate and photograph specified objects within a time limit.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Age Requirement</Text>
          <Text style={styles.sectionText}>
            You must be at least 18 years of age to use Seek. By using this application,
            you confirm that you meet this age requirement and are legally permitted to
            participate in skill-based competitions in your jurisdiction.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Skill-Based Competition</Text>
          <Text style={styles.sectionText}>
            Seek is a skill-based competition platform. Outcomes are determined entirely
            by the player's real-world abilities, including:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              {'\u2022'} Physical skill in navigating to find objects
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} Observation skills to identify targets
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} Photography skills to capture clear images
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} Time management within the challenge period
            </Text>
          </View>
          <Text style={styles.sectionText}>
            There is no element of chance involved in determining outcomes. Success
            depends solely on your ability to complete the assigned challenge.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. AI Validation</Text>
          <Text style={styles.sectionText}>
            All photo submissions are validated by artificial intelligence. The AI analyzes
            your submitted photo to determine if it contains the specified target object.
            The AI's determination is final and based on objective image analysis.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Smart Contract Operations</Text>
          <Text style={styles.sectionText}>
            Seek operates via smart contracts on the Solana blockchain. Users compete
            peer-to-peer through these contracts. All entry fees and rewards are handled
            automatically by the smart contract, ensuring transparent and trustless operations.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Entry Fees and Rewards</Text>
          <Text style={styles.sectionText}>
            Participation requires an entry fee in $SKR tokens. Successful completion of
            a challenge results in a reward. Failed challenges result in loss of the entry
            fee. Entry fees are distributed as follows:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              {'\u2022'} 70% to the protocol treasury
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} 20% to the jackpot pool
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} 10% to community development
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. No Refunds</Text>
          <Text style={styles.sectionText}>
            Once a challenge is started and the target is revealed, entry fees are
            non-refundable. This policy exists because the target information has
            been disclosed to you at that point.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. User Responsibilities</Text>
          <Text style={styles.sectionText}>
            You are responsible for ensuring your safety while participating. Do not
            trespass, violate traffic laws, or engage in any dangerous behavior while
            hunting for objects. Seek is not responsible for any injuries or legal issues
            arising from your participation.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Prohibited Conduct</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              {'\u2022'} Using pre-captured photos or stock images
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} Manipulating or editing submitted photos
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} Using automated tools or bots
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} Colluding with other users
            </Text>
            <Text style={styles.bulletItem}>
              {'\u2022'} Attempting to exploit the AI validation system
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Disclaimer</Text>
          <Text style={styles.sectionText}>
            Seek is provided "as is" without warranties of any kind. We do not guarantee
            continuous, uninterrupted access to the service. Blockchain transactions are
            irreversible and you are solely responsible for your wallet security.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.sectionText}>
            For questions about these terms, please visit our website or reach out
            through official Seek community channels.
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
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.cyan,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
  bulletList: {
    marginVertical: spacing.sm,
    paddingLeft: spacing.sm,
  },
  bulletItem: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 24,
  },
});
