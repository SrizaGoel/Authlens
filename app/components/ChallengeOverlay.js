import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ChallengeOverlay({ challenge, timer, attempts }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(1)).current;

  // Pulse animation for instruction text/icon
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [challenge]);

  // Sync progress bar with the 30-second timer
  useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: timer / 30,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [timer]);

  const getChallengeDetails = () => {
    switch (challenge) {
      case 'BLINK':
        return {
          title: 'Blink Your Eyes',
          desc: 'Look directly at the camera and blink clearly.',
          icon: 'eye-outline',
          color: '#00D4FF',
        };
      case 'LEFT':
        return {
          title: 'Turn Head Left',
          desc: 'Slowly turn your head to your left side.',
          icon: 'arrow-back-outline',
          color: '#A78BFA',
        };
      case 'RIGHT':
        return {
          title: 'Turn Head Right',
          desc: 'Slowly turn your head to your right side.',
          icon: 'arrow-forward-outline',
          color: '#FB923C',
        };
      default:
        return {
          title: 'Liveness Check',
          desc: 'Follow the on-screen prompt.',
          icon: 'shield-outline',
          color: '#00FF9D',
        };
    }
  };

  const details = getChallengeDetails();

  return (
    <View style={styles.overlay}>
      {/* Top Banner with Attempt Counter & Timer */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Attempt {attempts}/3</Text>
        </View>
        <View style={styles.timerBadge}>
          <Ionicons name="time-outline" size={16} color="#FF4D6D" />
          <Text style={styles.timerText}>{timer}s</Text>
        </View>
      </View>

      {/* Main Instruction Display */}
      <View style={styles.centerContainer}>
        <Animated.View style={[styles.iconCircle, { borderColor: details.color, transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name={details.icon} size={48} color={details.color} />
        </Animated.View>
        <Text style={[styles.title, { color: details.color }]}>{details.title}</Text>
        <Text style={styles.desc}>{details.desc}</Text>
      </View>

      {/* Progress Bar at the Bottom */}
      <View style={styles.progressBarBg}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: timer > 10 ? details.color : '#FF4D6D',
              width: progressWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 15, 30, 0.85)',
    justifyContent: 'space-between',
    padding: 24,
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    zIndex: 10,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 109, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 109, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  timerText: {
    color: '#FF4D6D',
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 15, 30, 0.9)',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  desc: {
    color: '#718096',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '85%',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
});
