import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { s, vs, ms } from '../lib/scaling';

const { width } = Dimensions.get('window');

interface RequestSuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function RequestSuccessModal({ 
  visible, 
  onClose 
}: RequestSuccessModalProps) {
  const themeColor = '#9B59B6';
  const themeLightColor = '#F5EEF8';
  const themeAccentColor = '#C39BD3';

  const heartScale = useSharedValue(1);

  // Pulse animation for the heart icon
  React.useEffect(() => {
    if (visible) {
      heartScale.value = withRepeat(
        withSequence(
          withSpring(1.2, { damping: 2 }),
          withSpring(1, { damping: 2 })
        ),
        -1,
        true
      );
    } else {
      heartScale.value = 1;
    }
  }, [visible]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
    >
      <View style={styles.overlay}>
        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
        
        <Animated.View 
          entering={ZoomIn.springify().damping(12)} 
          style={styles.modalContainer}
        >
          <View style={styles.card}>
            {/* Celebratory Icon */}
            <View style={[styles.iconContainer, { backgroundColor: themeLightColor }]}>
              <Animated.View style={heartStyle}>
                <Ionicons name="heart" size={ms(80)} color={themeColor} />
              </Animated.View>
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={ms(20)} color="#fff" />
              </View>
            </View>

            <Text style={styles.titleText}>Request Submitted!</Text>
            <Text style={styles.messageText}>
              Your journey has been shared with us. Your hair request is now <Text style={[styles.highlight, { color: themeColor }]}>Pending Review</Text>. 
              {"\n\n"}We have automatically saved this in your <Text style={{fontWeight:'900', color: themeColor}}>Calendar</Text> and sent a confirmation <Text style={{fontWeight:'900', color: themeColor}}>Notification</Text>.
            </Text>

            {/* Status Card */}
            <View style={[styles.statusCard, { backgroundColor: themeLightColor, borderColor: themeAccentColor }]}>
              <View style={styles.statusRow}>
                <MaterialCommunityIcons name="calendar-check" size={ms(24)} color={themeColor} />
                <Text style={styles.statusLabel}>Saved in Calendar</Text>
              </View>
              <View style={[styles.statusRow, { marginTop: vs(12) }]}>
                <MaterialCommunityIcons name="bell-check" size={ms(24)} color={themeColor} />
                <Text style={styles.statusLabel}>Notification Sent</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: themeColor, shadowColor: themeColor }]} 
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Greatly Appreciated</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: ms(24),
  },
  modalContainer: {
    width: '100%',
    maxWidth: ms(340),
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: ms(35),
    paddingHorizontal: ms(24),
    paddingBottom: vs(24),
    paddingTop: vs(50),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 10,
  },
  iconContainer: {
    position: 'absolute',
    top: vs(-50),
    width: ms(120),
    height: ms(120),
    borderRadius: ms(60),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#fff',
  },
  checkBadge: {
    position: 'absolute',
    bottom: vs(15),
    right: ms(15),
    backgroundColor: '#27AE60',
    borderRadius: ms(15),
    padding: ms(4),
    elevation: 3,
  },
  titleText: {
    fontSize: ms(24),
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: vs(12),
    textAlign: 'center',
  },
  messageText: {
    fontSize: ms(15),
    color: '#666',
    textAlign: 'center',
    lineHeight: vs(22),
    marginBottom: vs(24),
  },
  highlight: {
    fontWeight: '900',
  },
  statusCard: {
    width: '100%',
    borderRadius: ms(20),
    padding: ms(20),
    marginBottom: vs(24),
    borderWidth: 1.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
  },
  statusLabel: {
    fontSize: ms(14),
    fontWeight: '800',
    color: '#444',
  },
  actionBtn: {
    width: '100%',
    height: vs(58),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: ms(16),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
