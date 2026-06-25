import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ms, vs } from '../lib/scaling';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

let globalAlertRef: any = null;

/**
 * A global imperative method to trigger the custom alert modal from anywhere.
 * Signature matches React Native's standard Alert.alert().
 */
export const CustomAlert = {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => {
    if (globalAlertRef) {
      globalAlertRef.show(title, message, buttons);
    } else {
      // Fallback if the component hasn't mounted
      console.warn('CustomAlert.alert called before GlobalAlertComponent mounted.');
    }
  },
};

export default function GlobalAlertComponent({ themeRole }: { themeRole?: 'Donor' | 'Recipient' | null } = {}) {
  const [state, setState] = useState<AlertState>({ visible: false, title: '' });

  // Role-based accent: recipients get purple, donors (and pre-login/unknown)
  // get the brand pink. Applied to the default info icon + the primary button
  // so every popup matches the signed-in user's role.
  const isRecipient = themeRole === 'Recipient';
  const brand = isRecipient ? '#B084CC' : '#D63B8A';
  const brandSoft = isRecipient ? '#FDF7FB' : '#FFF0F8';

  const show = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setState({ visible: true, title, message, buttons });
  }, []);

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    globalAlertRef = { show, hide };
    return () => {
      if (globalAlertRef?.show === show) {
        globalAlertRef = null;
      }
    };
  }, [show, hide]);

  if (!state.visible) return null;

  // If no buttons are provided, use a default "OK" button
  const activeButtons = state.buttons && state.buttons.length > 0
    ? state.buttons
    : [{ text: 'OK', onPress: hide }];

  // Determine an icon and color based on title keywords or button styles
  const isError = state.title.toLowerCase().includes('error') || state.title.toLowerCase().includes('fail');
  const isSuccess = state.title.toLowerCase().includes('success') || state.title.toLowerCase().includes('confirm') || state.title.toLowerCase().includes('redeem') || state.title.toLowerCase().includes('copied');
  
  let iconName: any = 'information-circle';
  let iconColor = brand; // Role-based primary color
  let iconBg = brandSoft;

  if (isError) {
    iconName = 'close-circle';
    iconColor = '#E53935';
    iconBg = '#FFEBEE';
  } else if (isSuccess) {
    iconName = 'checkmark-circle';
    iconColor = '#2E7D32';
    iconBg = '#E8F5E9';
  }

  return (
    <Modal transparent visible={state.visible} animationType="none" onRequestClose={hide}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.backdrop}>
        <Animated.View entering={ZoomIn.duration(250).springify()} exiting={ZoomOut.duration(200)} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={ms(40)} color={iconColor} />
          </View>
          <Text style={styles.title}>{state.title}</Text>
          {!!state.message && <Text style={styles.message}>{state.message}</Text>}
          
          <View style={[styles.actions, activeButtons.length > 2 && { flexDirection: 'column', alignItems: 'stretch' }]}>
            {activeButtons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              
              let btnStyle: any = [styles.btn, activeButtons.length <= 2 && { flex: 1 }];
              let textStyle: any = [];

              if (isCancel) {
                btnStyle.push(styles.btnCancel);
                textStyle.push(styles.textCancel);
              } else if (isDestructive) {
                btnStyle.push(styles.btnDestructive);
                textStyle.push(styles.textDestructive);
              } else {
                btnStyle.push(styles.btnPrimary);
                btnStyle.push({ backgroundColor: brand });
                textStyle.push(styles.textPrimary);
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={btnStyle}
                  activeOpacity={0.8}
                  onPress={() => {
                    hide();
                    if (btn.onPress) {
                      // Call after animation finishes (200ms) to avoid iOS presentation race conditions
                      setTimeout(btn.onPress, 300);
                    }
                  }}
                >
                  <Text style={textStyle}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: ms(20),
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: ms(24),
    padding: ms(24),
    width: '100%',
    maxWidth: ms(340),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrap: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
  },
  title: {
    fontSize: ms(18),
    fontWeight: '900',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: vs(8),
  },
  message: {
    fontSize: ms(14),
    color: '#666',
    textAlign: 'center',
    marginBottom: vs(24),
    lineHeight: ms(20),
  },
  actions: {
    flexDirection: 'row',
    gap: ms(10),
    width: '100%',
    justifyContent: 'center',
  },
  btn: {
    paddingVertical: vs(12),
    borderRadius: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: '#F5F5F5',
  },
  textCancel: {
    color: '#666',
    fontWeight: '800',
    fontSize: ms(14),
    textAlign: 'center',
  },
  btnDestructive: {
    backgroundColor: '#FFEBEE',
  },
  textDestructive: {
    color: '#E53935',
    fontWeight: '800',
    fontSize: ms(14),
    textAlign: 'center',
  },
  btnPrimary: {
    backgroundColor: '#B084CC',
  },
  textPrimary: {
    color: '#fff',
    fontWeight: '800',
    fontSize: ms(14),
    textAlign: 'center',
  },
});
