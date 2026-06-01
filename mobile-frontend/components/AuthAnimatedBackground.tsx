import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Looping "movie" background for the auth screens.
 *
 * What it does
 * ────────────
 * - Two soft pink gradient orbs that drift independently
 * - A subtle dotted/blob layer (third orb) for depth
 * - Three pink ribbon glyphs that float up the screen on long loops
 *
 * Motion language
 * ───────────────
 * All looping animations use `Easing.inOut(Easing.sin)` because the
 * background is supposed to feel ambient and continuous (the user's
 * "no ease-in-out" rule was about *popup entrances* — different surface).
 * Loop durations are long (6–14s) so nothing distracts from the form.
 *
 * Use it as the FIRST child inside the screen container with
 * `pointerEvents="none"` (already set) so it doesn't intercept taps.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const BRAND = {
  pink: '#D63B8A',
  pinkLight: '#FFB8E4',
  pinkSofter: '#FFE0EE',
};

interface Props {
  /** Tone the floating ribbons. Defaults to brand pink. */
  tint?: string;
}

export default function AuthAnimatedBackground({ tint = BRAND.pink }: Props) {
  // Orb drivers
  const orbA = useRef(new Animated.Value(0)).current;
  const orbB = useRef(new Animated.Value(0)).current;
  const orbC = useRef(new Animated.Value(0)).current;

  // Floating ribbon drivers — one per glyph
  const ribbon1 = useRef(new Animated.Value(0)).current;
  const ribbon2 = useRef(new Animated.Value(0)).current;
  const ribbon3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopPingPong = (v: Animated.Value, dur: number, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: dur,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();

    // A linear float that rolls 0 → 1 over `dur` then resets is the
    // simplest way to make a ribbon "drift up and across forever".
    const loopRise = (v: Animated.Value, dur: number, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: dur,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Snap back to 0 instantly so the glyph "re-appears" at the bottom.
          Animated.timing(v, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

    loopPingPong(orbA, 8000);
    loopPingPong(orbB, 11000, 1200);
    loopPingPong(orbC, 13000, 600);

    loopRise(ribbon1, 14000);
    loopRise(ribbon2, 16000, 4000);
    loopRise(ribbon3, 18000, 8000);
  }, [orbA, orbB, orbC, ribbon1, ribbon2, ribbon3]);

  // Orb translate interpolations
  const orbAX = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });
  const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });
  const orbBY = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const orbCX = orbC.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] });
  const orbCY = orbC.interpolate({ inputRange: [0, 1], outputRange: [10, -10] });

  // Helper: build a ribbon "drift" — rises from below the screen to above,
  // gently swaying horizontally, fading in/out near the edges.
  const ribbonStyle = (
    v: Animated.Value,
    startX: number,
    sway: number,
  ): any => ({
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [SCREEN_H + 60, -120],
        }),
      },
      {
        translateX: v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [startX, startX + sway, startX],
        }),
      },
      {
        rotate: v.interpolate({
          inputRange: [0, 1],
          outputRange: ['-12deg', '12deg'],
        }),
      },
    ],
    opacity: v.interpolate({
      inputRange: [0, 0.15, 0.85, 1],
      outputRange: [0, 0.55, 0.55, 0],
    }),
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Soft base wash */}
      <LinearGradient
        colors={['#FFFAFC', '#FAFAF9', '#FFF4F8']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Orb A — top right */}
      <Animated.View
        style={[
          styles.orb,
          {
            top: -SCREEN_H * 0.05,
            right: -SCREEN_W * 0.15,
            width: SCREEN_W * 0.7,
            height: SCREEN_W * 0.7,
            opacity: 0.55,
            transform: [{ translateX: orbAX }, { translateY: orbAY }],
          },
        ]}
      >
        <LinearGradient
          colors={[BRAND.pinkLight, 'transparent']}
          style={styles.orbFill}
        />
      </Animated.View>

      {/* Orb B — bottom left */}
      <Animated.View
        style={[
          styles.orb,
          {
            bottom: -SCREEN_H * 0.05,
            left: -SCREEN_W * 0.2,
            width: SCREEN_W * 0.65,
            height: SCREEN_W * 0.65,
            opacity: 0.4,
            transform: [{ translateX: orbBX }, { translateY: orbBY }],
          },
        ]}
      >
        <LinearGradient
          colors={[BRAND.pink, 'transparent']}
          style={styles.orbFill}
        />
      </Animated.View>

      {/* Orb C — mid right, smaller, lighter */}
      <Animated.View
        style={[
          styles.orb,
          {
            top: SCREEN_H * 0.35,
            right: -SCREEN_W * 0.1,
            width: SCREEN_W * 0.4,
            height: SCREEN_W * 0.4,
            opacity: 0.3,
            transform: [{ translateX: orbCX }, { translateY: orbCY }],
          },
        ]}
      >
        <LinearGradient
          colors={[BRAND.pinkSofter, 'transparent']}
          style={styles.orbFill}
        />
      </Animated.View>

      {/* Floating ribbon glyphs — slow rising drift, faded */}
      <Animated.View style={[styles.glyph, ribbonStyle(ribbon1, SCREEN_W * 0.12, 30)]}>
        <Ionicons name="ribbon" size={28} color={tint} />
      </Animated.View>
      <Animated.View style={[styles.glyph, ribbonStyle(ribbon2, SCREEN_W * 0.45, -40)]}>
        <MaterialCommunityIcons name="ribbon" size={22} color={tint} />
      </Animated.View>
      <Animated.View style={[styles.glyph, ribbonStyle(ribbon3, SCREEN_W * 0.78, 20)]}>
        <Ionicons name="ribbon-outline" size={32} color={tint} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orbFill: {
    flex: 1,
    borderRadius: 9999,
  },
  glyph: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
