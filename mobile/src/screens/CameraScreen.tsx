import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Animated,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme';
import { RootStackParamList, Bounty } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Camera'>;
  route: RouteProp<RootStackParamList, 'Camera'>;
};

export default function CameraScreen({ navigation, route }: Props) {
  const { bounty } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [timeLeft, setTimeLeft] = useState(
    Math.floor((bounty.endTime - Date.now()) / 1000)
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Timer animation
  const timerPulse = useRef(new Animated.Value(1)).current;
  const captureScale = useRef(new Animated.Value(1)).current;

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Pulse animation when time is low
  useEffect(() => {
    if (timeLeft <= 30 && timeLeft > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(timerPulse, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(timerPulse, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [timeLeft <= 30]);

  const handleTimeExpired = () => {
    Alert.alert(
      'Time Expired!',
      'You ran out of time. Your entry has been forfeited.',
      [
        {
          text: 'OK',
          onPress: () => navigation.popToTop(),
        },
      ]
    );
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);

    // Capture animation
    Animated.sequence([
      Animated.timing(captureScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(captureScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: true,
      });

      if (photo?.uri) {
        // Navigate to validation screen
        navigation.replace('Validating', {
          bounty,
          photoUri: photo.uri,
        });
      }
    } catch (error) {
      console.error('[Camera] Capture error:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      setIsCapturing(false);
    }
  };

  // Request permission
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to let you capture your bounty targets.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isUrgent = timeLeft <= 30;
  const timerColor = isUrgent ? colors.error : colors.cyan;

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Overlay */}
        <SafeAreaView style={styles.overlay}>
          {/* Timer */}
          <View style={styles.timerContainer}>
            <Animated.View
              style={[
                styles.timerBox,
                { borderColor: timerColor },
                isUrgent && { transform: [{ scale: timerPulse }] },
              ]}
            >
              <Text style={[styles.timerText, { color: timerColor }]}>
                {formatTime(timeLeft)}
              </Text>
            </Animated.View>
          </View>

          {/* Target Info */}
          <View style={styles.targetContainer}>
            <View style={styles.targetBox}>
              <Text style={styles.targetLabel}>FIND</Text>
              <Text style={styles.targetText}>{bounty.target}</Text>
            </View>
          </View>

          {/* Hint */}
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>{bounty.targetHint}</Text>
          </View>

          {/* Bottom Controls */}
          <View style={styles.controls}>
            {/* Flip Camera */}
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() =>
                setFacing((prev) => (prev === 'back' ? 'front' : 'back'))
              }
            >
              <Text style={styles.flipButtonText}>FLIP</Text>
            </TouchableOpacity>

            {/* Capture Button */}
            <TouchableOpacity
              style={styles.captureButtonOuter}
              onPress={handleCapture}
              disabled={isCapturing}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.captureButton,
                  isCapturing && styles.captureButtonCapturing,
                  { transform: [{ scale: captureScale }] },
                ]}
              >
                {isCapturing && (
                  <Text style={styles.capturingText}>...</Text>
                )}
              </Animated.View>
            </TouchableOpacity>

            {/* Placeholder for symmetry */}
            <View style={styles.flipButton} />
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  timerContainer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  timerBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  timerText: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  targetContainer: {
    alignItems: 'center',
  },
  targetBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.cyan,
    alignItems: 'center',
  },
  targetLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 2,
  },
  targetText: {
    color: colors.cyan,
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  flipButton: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonCapturing: {
    backgroundColor: colors.cyan,
  },
  capturingText: {
    color: colors.dark,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  hintContainer: {
    alignItems: 'center',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  permissionText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.cyan,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  permissionButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
