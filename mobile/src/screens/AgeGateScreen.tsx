import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { RootStackParamList } from '../types';

const AGE_VERIFIED_KEY = '@seek_age_verified';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AgeGate'>;
};

export default function AgeGateScreen({ navigation }: Props) {
  const [denied, setDenied] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAgeVerification();
  }, []);

  const checkAgeVerification = async () => {
    try {
      const verified = await AsyncStorage.getItem(AGE_VERIFIED_KEY);
      if (verified === 'true') {
        navigation.replace('Home');
      } else {
        setChecking(false);
      }
    } catch (error) {
      console.error('Error checking age verification:', error);
      setChecking(false);
    }
  };

  const handleYes = async () => {
    try {
      await AsyncStorage.setItem(AGE_VERIFIED_KEY, 'true');
      navigation.replace('Home');
    } catch (error) {
      console.error('Error saving age verification:', error);
      navigation.replace('Home');
    }
  };

  const handleNo = () => {
    setDenied(true);
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.logo}>SEEK</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (denied) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.logo}>SEEK</Text>
          <View style={styles.deniedContainer}>
            <Text style={styles.deniedIcon}>!</Text>
            <Text style={styles.deniedTitle}>Access Restricted</Text>
            <Text style={styles.deniedText}>
              You must be 18 years or older to use Seek.
            </Text>
            <Text style={styles.deniedSubtext}>
              This app contains skill-based competitions that are intended for adults only.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>SEEK</Text>
        <Text style={styles.tagline}>Hunt. Capture. Win.</Text>

        <View style={styles.ageCard}>
          <Text style={styles.ageIcon}>18+</Text>
          <Text style={styles.questionText}>
            Are you 18 years or older?
          </Text>
          <Text style={styles.infoText}>
            Seek is a skill-based competition platform intended for adults only.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.yesButton]}
              onPress={handleYes}
              activeOpacity={0.8}
            >
              <Text style={styles.yesButtonText}>Yes, I'm 18+</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.noButton]}
              onPress={handleNo}
              activeOpacity={0.8}
            >
              <Text style={styles.noButtonText}>No</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          By confirming, you agree that you are of legal age to participate in skill-based competitions in your jurisdiction.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
  ageCard: {
    backgroundColor: colors.darkAlt,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginTop: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.darkLight,
    ...shadows.lg,
  },
  ageIcon: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.cyan,
    marginBottom: spacing.md,
  },
  questionText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  yesButton: {
    backgroundColor: colors.cyan,
    ...shadows.md,
  },
  yesButtonText: {
    color: colors.dark,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  noButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.darkLight,
  },
  noButtonText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 16,
  },
  deniedContainer: {
    backgroundColor: colors.darkAlt,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginTop: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.error,
  },
  deniedIcon: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.error,
    marginBottom: spacing.md,
  },
  deniedTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.error,
    marginBottom: spacing.md,
  },
  deniedText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  deniedSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
