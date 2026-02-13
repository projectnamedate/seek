import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { RootStackParamList, ValidationResult } from '../types';
import apiService from '../services/api.service';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Validating'>;
  route: RouteProp<RootStackParamList, 'Validating'>;
};

// Validation stages for visual feedback
const STAGES = [
  { key: 'upload', text: 'Uploading photo...', icon: '📤' },
  { key: 'meta', text: 'Checking metadata...', icon: '🔍' },
  { key: 'ai', text: 'AI analyzing image...', icon: '🤖' },
  { key: 'verify', text: 'Verifying target match...', icon: '✅' },
];

export default function ValidatingScreen({ navigation, route }: Props) {
  const { bounty, photoUri, attestation } = route.params;
  const [currentStage, setCurrentStage] = useState(0);
  const [validationText, setValidationText] = useState('');

  // Animations
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Start animations
  useEffect(() => {
    // Spinning loader
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulsing effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Progress through stages and call API
  useEffect(() => {
    let isMounted = true;

    const runValidation = async () => {
      // Stage 1: Upload
      await simulateStage(0, 1000);
      if (!isMounted) return;

      // Stage 2: Metadata
      await simulateStage(1, 800);
      if (!isMounted) return;

      // Stage 3: AI Analysis (this is where we actually call the API)
      setCurrentStage(2);
      Animated.timing(progressAnim, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: false,
      }).start();

      try {
        // Call the real API for validation
        const result = await apiService.submitPhoto(bounty.id, photoUri, attestation);

        if (!isMounted) return;

        // Stage 4: Verify
        await simulateStage(3, 500);
        if (!isMounted) return;

        // Show reasoning briefly
        if (result.validation) {
          setValidationText(result.validation.reasoning);
          await new Promise((r) => setTimeout(r, 1500));
        }

        // Navigate to result
        navigation.replace('Result', {
          bounty: {
            ...bounty,
            status: result.validation?.isValid ? 'won' : 'lost',
          },
          validation: result.validation || {
            isValid: false,
            confidence: 0,
            reasoning: 'Validation failed',
            timestamp: Date.now(),
          },
        });
      } catch (error) {
        console.error('[Validation] Error:', error);
        // Handle error - show failed result
        navigation.replace('Result', {
          bounty: { ...bounty, status: 'lost' },
          validation: {
            isValid: false,
            confidence: 0,
            reasoning: 'Validation error occurred',
            timestamp: Date.now(),
          },
        });
      }
    };

    const simulateStage = async (stage: number, duration: number) => {
      setCurrentStage(stage);
      Animated.timing(progressAnim, {
        toValue: (stage + 1) / STAGES.length,
        duration: 300,
        useNativeDriver: false,
      }).start();
      await new Promise((r) => setTimeout(r, duration));
    };

    runValidation();

    return () => {
      isMounted = false;
    };
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Photo Preview */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: photoUri }} style={styles.photo} />
          <View style={styles.photoOverlay}>
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: spinAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, 100],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>

        {/* Target being verified */}
        <View style={styles.targetInfo}>
          <Text style={styles.targetLabel}>Verifying:</Text>
          <Text style={styles.targetText}>{bounty.target}</Text>
        </View>

        {/* Spinner */}
        <View style={styles.spinnerContainer}>
          <Animated.View
            style={[
              styles.spinner,
              {
                transform: [{ rotate: spin }, { scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.spinnerInner} />
          </Animated.View>
        </View>

        {/* Stage Progress */}
        <View style={styles.stagesContainer}>
          {STAGES.map((stage, index) => (
            <View
              key={stage.key}
              style={[
                styles.stage,
                index <= currentStage && styles.stageActive,
                index < currentStage && styles.stageComplete,
              ]}
            >
              <Text style={styles.stageIcon}>
                {index < currentStage ? '✓' : stage.icon}
              </Text>
              <Text
                style={[
                  styles.stageText,
                  index === currentStage && styles.stageTextActive,
                ]}
              >
                {stage.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Validation Text */}
        {validationText && (
          <View style={styles.validationTextContainer}>
            <Text style={styles.validationText}>{validationText}</Text>
          </View>
        )}
      </Animated.View>
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
    paddingTop: spacing.xl,
  },
  photoContainer: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.cyan,
    opacity: 0.8,
  },
  targetInfo: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  targetLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  targetText: {
    color: colors.cyan,
    fontSize: fontSize.xl,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  spinnerContainer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: colors.cyan,
    borderTopColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.cyan,
    borderBottomColor: 'transparent',
  },
  stagesContainer: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    opacity: 0.4,
  },
  stageActive: {
    opacity: 1,
  },
  stageComplete: {
    opacity: 0.7,
  },
  stageIcon: {
    fontSize: 20,
    width: 30,
  },
  stageText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
  },
  stageTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  progressContainer: {
    width: '80%',
    height: 4,
    backgroundColor: colors.darkLight,
    borderRadius: 2,
    marginTop: spacing.xl,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.cyan,
    borderRadius: 2,
  },
  validationTextContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  validationText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
