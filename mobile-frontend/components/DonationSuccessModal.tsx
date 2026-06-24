import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { s, vs, ms } from '../lib/scaling';
import { useModalEntrance } from '../lib/modalAnimation';

interface DonationSuccessModalProps {
  visible: boolean;
  amount: number;
  stars: number;
  type?: 'monetary' | 'hair';
  role?: 'Donor' | 'Recipient';
  onClose: () => void;
}

const BRAND = {
  donorPink: '#D63B8A',
  donorPinkSoft: '#FFE0EE',
  donorPinkSofter: '#FFF0F8',
  recipientPurple: '#B084CC',
  recipientPurpleSoft: '#F3EBFB',
  recipientPurpleSofter: '#FAF5FE',
  ink: '#1C1917',
  inkSoft: '#44403C',
  mute: '#78716C',
  line: '#F0EDE9',
  star: '#F59E0B',
};

export default function DonationSuccessModal({
  visible,
  amount,
  stars,
  type = 'monetary',
  role = 'Donor',
  onClose,
}: DonationSuccessModalProps) {
  const isRecipient = role === 'Recipient';
  const tint = isRecipient ? BRAND.recipientPurple : BRAND.donorPink;
  const tintSoft = isRecipient ? BRAND.recipientPurpleSoft : BRAND.donorPinkSoft;
  const tintSofter = isRecipient ? BRAND.recipientPurpleSofter : BRAND.donorPinkSofter;

  // Shared modal entrance — backdrop fade + card pop + icon stamp,
  // all OUT curves, total ≤ 320ms. See lib/modalAnimation.ts.
  const { backdrop, cardOpacity, cardScale, iconScale } = useModalEntrance(visible);

  // Local: stars strip slides in from the right after the card lands.
  // Stays inline because it's specific to this modal.
  const starsX = useRef(new Animated.Value(20)).current;
  const starsOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    starsX.setValue(20);
    starsOp.setValue(0);
    Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        Animated.timing(starsX, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(starsOp, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [visible, starsX, starsOp]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop — Pressable lets the user dismiss by tapping outside */}
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <BlurView intensity={28} style={StyleSheet.absoluteFill} tint="dark" />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.cardWrap,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <View style={styles.card}>
            {}
            <View style={[styles.accentBar, { backgroundColor: tint }]} />

            <View style={styles.cardBody}>
              {/* Icon chip — tinted soft bg, brand-coloured icon, with a
                  small star bubble at the corner. One-shot scale pop. */}
              <Animated.View
                style={[
                  styles.iconChip,
                  { backgroundColor: tintSofter, borderColor: tintSoft, transform: [{ scale: iconScale }] },
                ]}
              >
                <Ionicons name="heart" size={ms(32)} color={tint} />
                <View style={styles.iconStarBubble}>
                  <MaterialCommunityIcons name="star" size={ms(11)} color={BRAND.star} />
                </View>
              </Animated.View>

              {/* Title + status chip */}
              <Text style={styles.title}>Thank you!</Text>

              <View style={[styles.statusChip, { backgroundColor: tintSofter }]}>
                <Feather name={type === 'hair' ? 'clock' : 'check-circle'} size={ms(11)} color={tint} />
                <Text style={[styles.statusText, { color: tint }]}>
                  {type === 'hair' ? 'Pending Review' : 'Completed'}
                </Text>
              </View>

              {/* Body — trimmed copy */}
              <Text style={styles.bodyLine}>
                {type === 'hair' ? (
                  <>Your hair donation has been received.</>
                ) : (
                  <>
                    Your <Text style={[styles.bodyHi, { color: tint }]}>₱{amount.toLocaleString()}</Text>{' '}
                    gift means the world to us. 💖
                  </>
                )}
              </Text>
              <Text style={styles.bodySub}>
                {type === 'hair' ? (
                  <>We&apos;ll credit your stars once a reviewer approves it.</>
                ) : (
                  <>Your generosity helps us craft beautiful wigs for those who need them most. You&apos;re truly making a difference!</>
                )}
              </Text>

              {/* Rewards strip — hair only. Monetary donations no longer
                  award stars, so the strip is skipped entirely for them
                  (also skipped if `stars` is 0). */}
              {type === 'hair' && stars > 0 && (
                <Animated.View
                  style={[
                    styles.rewardStrip,
                    {
                      backgroundColor: tintSofter,
                      borderColor: tintSoft,
                      opacity: starsOp,
                      transform: [{ translateX: starsX }],
                    },
                  ]}
                >
                  <View style={styles.rewardStripLeft}>
                    <MaterialCommunityIcons name="star-four-points" size={ms(18)} color={tint} />
                    <Text style={[styles.rewardLabel, { color: tint }]}>Estimated Stars</Text>
                  </View>
                  <View style={styles.rewardStripRight}>
                    <Text style={styles.rewardPlus}>+{stars}</Text>
                    <MaterialCommunityIcons name="star" size={ms(16)} color={BRAND.star} />
                  </View>
                </Animated.View>
              )}

              {/* Actions */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onClose}
                style={[styles.primaryBtn, { backgroundColor: tint }]}
              >
                <Text style={styles.primaryBtnText}>
                  {type === 'hair' ? 'See My Rewards' : 'Got it'}
                </Text>
                <Feather name="arrow-right" size={ms(15)} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={styles.secondaryBtn}
              >
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

  cardWrap: {
    width: '100%',
    maxWidth: ms(360),
  },
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
  accentBar: {
    height: vs(4),
    width: '100%',
  },
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
  iconStarBubble: {
    position: 'absolute',
    bottom: -ms(4),
    right: -ms(4),
    width: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: BRAND.star,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: ms(22),
    fontWeight: '800',
    color: BRAND.ink,
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
    color: BRAND.inkSoft,
    textAlign: 'center',
    lineHeight: ms(19),
    marginBottom: vs(2),
    fontWeight: '500',
  },
  bodyHi: {
    fontWeight: '800',
  },
  bodySub: {
    fontSize: ms(12),
    color: BRAND.mute,
    textAlign: 'center',
    lineHeight: ms(17),
    marginBottom: vs(16),
    fontWeight: '500',
  },

  rewardStrip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(14),
    paddingVertical: vs(10),
    borderRadius: ms(12),
    borderWidth: 1,
    marginBottom: vs(16),
  },
  rewardStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  rewardStripRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  rewardLabel: {
    fontSize: ms(11),
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  rewardPlus: {
    fontSize: ms(20),
    fontWeight: '800',
    color: BRAND.ink,
    letterSpacing: -0.5,
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
    color: BRAND.mute,
    fontSize: ms(13),
    fontWeight: '700',
  },
});
