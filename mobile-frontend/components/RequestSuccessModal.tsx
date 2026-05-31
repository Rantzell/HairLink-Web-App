import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { s, vs, ms } from '../lib/scaling';
import { useModalEntrance } from '../lib/modalAnimation';

/**
 * Hair-request submitted confirmation. Recipient-themed (light purple).
 * Same UI language + animation timing as DonationSuccessModal: top accent
 * bar, small icon chip, status chip, two-line copy, two info chips, primary
 * + quiet secondary action. All animations OUT-only, ≤320ms total, no
 * infinite pulses.
 */
interface RequestSuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

const TINT = '#B084CC';        // light purple — recipient theme
const TINT_SOFT = '#F3EBFB';
const TINT_SOFTER = '#FAF5FE';

export default function RequestSuccessModal({ visible, onClose }: RequestSuccessModalProps) {
  const { backdrop, cardOpacity, cardScale, iconScale } = useModalEntrance(visible);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <BlurView intensity={28} style={StyleSheet.absoluteFill} tint="dark" />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.cardWrap,
            { opacity: cardOpacity, transform: [{ scale: cardScale }] },
          ]}
        >
          <View style={styles.card}>
            <View style={[styles.accentBar, { backgroundColor: TINT }]} />

            <View style={styles.cardBody}>
              <Animated.View
                style={[
                  styles.iconChip,
                  { backgroundColor: TINT_SOFTER, borderColor: TINT_SOFT, transform: [{ scale: iconScale }] },
                ]}
              >
                <Ionicons name="heart" size={ms(28)} color={TINT} />
                <View style={styles.checkBubble}>
                  <Ionicons name="checkmark" size={ms(10)} color="#fff" />
                </View>
              </Animated.View>

              <Text style={styles.title}>Request submitted!</Text>

              <View style={[styles.statusChip, { backgroundColor: TINT_SOFTER }]}>
                <Feather name="clock" size={ms(11)} color={TINT} />
                <Text style={[styles.statusText, { color: TINT }]}>Pending Review</Text>
              </View>

              <Text style={styles.bodyLine}>
                Your story has been shared with us.
              </Text>
              <Text style={styles.bodySub}>
                We&apos;ll send updates as the review progresses.
              </Text>

              {/* Two compact info chips replace the big "Status Card" block */}
              <View style={styles.infoRow}>
                <View style={[styles.infoChip, { backgroundColor: TINT_SOFTER, borderColor: TINT_SOFT }]}>
                  <MaterialCommunityIcons name="calendar-check" size={ms(16)} color={TINT} />
                  <Text style={[styles.infoText, { color: TINT }]}>In Calendar</Text>
                </View>
                <View style={[styles.infoChip, { backgroundColor: TINT_SOFTER, borderColor: TINT_SOFT }]}>
                  <MaterialCommunityIcons name="bell-check" size={ms(16)} color={TINT} />
                  <Text style={[styles.infoText, { color: TINT }]}>Notified</Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onClose}
                style={[styles.primaryBtn, { backgroundColor: TINT }]}
              >
                <Text style={styles.primaryBtnText}>Thank you</Text>
                <Feather name="arrow-right" size={ms(15)} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: ms(24),
  },
  cardWrap: { width: '100%', maxWidth: ms(360) },
  card: {
    backgroundColor: '#fff',
    borderRadius: ms(22),
    overflow: 'hidden',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 14,
  },
  accentBar: { height: vs(4), width: '100%' },
  cardBody: {
    paddingHorizontal: ms(22),
    paddingTop: vs(22),
    paddingBottom: vs(18),
    alignItems: 'center',
  },
  iconChip: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(16),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: vs(14),
  },
  checkBubble: {
    position: 'absolute',
    bottom: -ms(4),
    right: -ms(4),
    width: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  title: {
    fontSize: ms(22),
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.4,
    marginBottom: vs(8),
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
    paddingHorizontal: ms(10),
    paddingVertical: vs(4),
    borderRadius: 999,
    marginBottom: vs(14),
  },
  statusText: {
    fontSize: ms(10.5),
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  bodyLine: {
    fontSize: ms(13.5),
    color: '#44403C',
    textAlign: 'center',
    lineHeight: ms(19),
    marginBottom: vs(2),
    fontWeight: '500',
  },
  bodySub: {
    fontSize: ms(12),
    color: '#78716C',
    textAlign: 'center',
    lineHeight: ms(17),
    marginBottom: vs(16),
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    gap: ms(8),
    marginBottom: vs(16),
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    paddingHorizontal: ms(10),
    paddingVertical: vs(7),
    borderRadius: ms(10),
    borderWidth: 1,
  },
  infoText: {
    fontSize: ms(11.5),
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  primaryBtn: {
    width: '100%',
    height: vs(46),
    borderRadius: ms(13),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(8),
    marginBottom: vs(8),
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    paddingVertical: vs(8),
    paddingHorizontal: ms(12),
  },
  secondaryBtnText: {
    color: '#78716C',
    fontSize: ms(13),
    fontWeight: '700',
  },
});
