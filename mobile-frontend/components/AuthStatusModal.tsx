import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

interface AuthStatusModalProps {
  visible: boolean;
  type: 'error' | 'success';
  title: string;
  message: string;
  onClose: () => void;
}

export default function AuthStatusModal({ visible, type, title, message, onClose }: AuthStatusModalProps) {
  if (!visible) return null;

  const isError = type === 'error';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <Animated.View 
          entering={ZoomIn.springify().damping(15)} 
          style={styles.modalContainer}
        >
          {/* Main Card */}
          <View style={styles.card}>
            {/* Status Icon Header */}
            <View style={[styles.iconCircle, { backgroundColor: isError ? '#FEF2F2' : '#F0FDF4' }]}>
              <Ionicons 
                name={isError ? "alert-circle" : "checkmark-circle"} 
                size={48} 
                color={isError ? "#EF4444" : "#10B981"} 
              />
            </View>

            <Text style={styles.titleText}>{title}</Text>
            <Text style={styles.messageText}>{message}</Text>

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: isError ? '#EF4444' : '#10B981' }]} 
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>
                {isError ? "Got it" : "Continue"}
              </Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -40,
    borderWidth: 4,
    borderColor: '#fff',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
