import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { s, vs, ms } from '../lib/scaling';

const { width } = Dimensions.get('window');

interface DonationSuccessModalProps {
  visible: boolean;
  amount: number;
  stars: number;
  type?: 'monetary' | 'hair';
  role?: 'Donor' | 'Recipient';
  onClose: () => void;
}

export default function DonationSuccessModal({ 
  visible, 
  amount, 
  stars, 
  type = 'monetary', 
  role = 'Donor',
  onClose 
}: DonationSuccessModalProps) {
  const isRecipient = role === 'Recipient';
  const themeColor = isRecipient ? '#9B59B6' : '#FF1493';
  const themeLightColor = isRecipient ? '#F5EEF8' : '#FFF0F5';
  const themeAccentColor = isRecipient ? '#C39BD3' : '#FFD6EF';

  const heartScale = useSharedValue(1);

  // Pulse animation for the heart
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
              <View style={styles.starBadge}>
                <MaterialCommunityIcons name="star" size={ms(24)} color="#FFD700" />
              </View>
            </View>

            <Text style={styles.titleText}>Thank You!</Text>
            
            <View style={[styles.pendingBanner, { backgroundColor: themeLightColor }]}>
              <MaterialCommunityIcons name="clock-outline" size={ms(16)} color={themeColor} />
              <Text style={[styles.pendingText, { color: themeColor }]}>PENDING REVIEW</Text>
            </View>

            <Text style={styles.messageText}>
              Your {type === 'hair' ? 'hair donation' : <><Text style={[styles.highlight, { color: themeColor }]}>₱{amount.toLocaleString()}</Text> donation</>} has been received!
              {"\n\n"}
              <Text style={{fontWeight: '700'}}>Please wait while we verify your contribution.</Text> Your Star Points will be automatically added to your profile once approved!
            </Text>

            {/* Rewards Card */}
            <View style={[styles.rewardCard, { backgroundColor: themeLightColor, borderColor: themeAccentColor }]}>
              <Text style={[styles.rewardLabel, { color: themeColor }]}>ESTIMATED STARS</Text>
              <View style={styles.rewardValueRow}>
                <MaterialCommunityIcons name="star-face" size={ms(32)} color="#FFD700" />
                <Text style={styles.rewardValue}>+{stars}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: themeColor, shadowColor: themeColor }]} 
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>See My Rewards</Text>
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
  starBadge: {
    position: 'absolute',
    bottom: vs(15),
    right: ms(15),
    backgroundColor: '#fff',
    borderRadius: ms(15),
    padding: ms(2),
    elevation: 3,
  },
  titleText: {
    fontSize: ms(28),
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: vs(12),
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
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(12),
    paddingVertical: vs(6),
    borderRadius: ms(20),
    marginBottom: vs(16),
    gap: ms(6),
  },
  pendingText: {
    fontSize: ms(12),
    fontWeight: '900',
    letterSpacing: 1,
  },
  rewardCard: {
    width: '100%',
    borderRadius: ms(20),
    padding: ms(16),
    alignItems: 'center',
    marginBottom: vs(24),
    borderWidth: 1.5,
  },
  rewardLabel: {
    fontSize: ms(12),
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: vs(8),
  },
  rewardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
  },
  rewardValue: {
    fontSize: ms(32),
    fontWeight: '900',
    color: '#1a1a1a',
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

