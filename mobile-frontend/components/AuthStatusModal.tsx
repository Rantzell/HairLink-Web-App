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
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useModalEntrance } from '../lib/modalAnimation';

/**
 * Compact status modal used by Login / Signup for success + error toasts.
 * Shares the same OUT-curve, ≤320ms entrance language as every other
 * popup in the app (see lib/modalAnimation.ts). No infinite pulses.
 */
interface AuthStatusModalProps {
  visible: boolean;
  type: 'error' | 'success';
  title: string;
  message: string;
  onClose: () => void;
}

const TONES = {
  error: {
    tint: '#DC2626',
    tintSoft: '#FEF2F2',
    tintBorder: '#FCA5A5',
    cta: 'Got it',
  },
  success: {
    tint: '#16A34A',
    tintSoft: '#F0FDF4',
    tintBorder: '#86EFAC',
    cta: 'Continue',
  },
} as const;

export default function AuthStatusModal({ visible, type, title, message, onClose }: AuthStatusModalProps) {
  const tone = TONES[type];
  const { backdrop, cardOpacity, cardScale, iconScale } = useModalEntrance(visible);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <BlurView intensity={24} style={StyleSheet.absoluteFill} tint="dark" />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.cardWrap,
            { opacity: cardOpacity, transform: [{ scale: cardScale }] },
          ]}
        >
          <View style={styles.card}>
            {/* Accent strip */}
            <View style={[styles.accentBar, { backgroundColor: tone.tint }]} />

            <View style={styles.cardBody}>
              {/* Icon chip — single-shot stamp animation */}
              <Animated.View
                style={[
                  styles.iconChip,
                  {
                    backgroundColor: tone.tintSoft,
                    borderColor: tone.tintBorder,
                    transform: [{ scale: iconScale }],
                  },
                ]}
              >
                <Ionicons
                  name={type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                  size={26}
                  color={tone.tint}
                />
              </Animated.View>

              <Text style={styles.title} numberOfLines={2}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onClose}
                style={[styles.actionBtn, { backgroundColor: tone.tint }]}
              >
                <Text style={styles.actionBtnText}>{tone.cta}</Text>
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
    padding: 24,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 340,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  accentBar: { height: 4, width: '100%' },
  cardBody: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },
  iconChip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 13.5,
    color: '#57534E',
    lineHeight: 19,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 16,
  },
  actionBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
