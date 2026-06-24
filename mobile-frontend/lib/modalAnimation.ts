import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export function useModalEntrance(visible: boolean) {
  const backdrop = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    backdrop.setValue(0);
    cardOpacity.setValue(0);
    cardScale.setValue(0.92);
    iconScale.setValue(0);

    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(60),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [visible, backdrop, cardOpacity, cardScale, iconScale]);

  return { backdrop, cardOpacity, cardScale, iconScale };
}

/**
 * Slide-from-bottom variant for sheet-style modals (notification trays,
 * comment sheets). Same "out only" philosophy, swaps the scale pop for a
 * brief upward translate.
 */
export function useSheetEntrance(visible: boolean, distancePx = 24) {
  const backdrop = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(distancePx)).current;

  useEffect(() => {
    if (!visible) return;

    backdrop.setValue(0);
    cardOpacity.setValue(0);
    cardTranslateY.setValue(distancePx);

    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, backdrop, cardOpacity, cardTranslateY, distancePx]);

  return { backdrop, cardOpacity, cardTranslateY };
}
