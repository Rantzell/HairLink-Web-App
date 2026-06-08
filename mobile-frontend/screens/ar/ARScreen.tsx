import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  ScrollView,
  Image,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType, FlashMode } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, vs } from '../../lib/scaling';

/**
 * HairLink AR Try-On — Instagram / Snapchat-style filter UI.
 *
 * Expo Go does not expose ARKit / ARCore face-mesh APIs, so we simulate the
 * experience with a live camera feed + a tinted wig-canopy overlay that
 * corresponds to the chosen style & color. The UX matches the polished AR
 * filter aesthetic: scrollable style carousel, per-style color swatches,
 * animated corner guides, a glassmorphism bottom panel, and a full-screen
 * photo preview sheet.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Data ────────────────────────────────────────────────────────────────────

type HairColor = { id: string; name: string; hex: string };
type WigStyle = {
  id: string;
  label: string;
  icon: string;              // MaterialCommunityIcons name
  shape: 'short' | 'medium' | 'long' | 'wavy' | 'curly';
  colors: HairColor[];
};

const GLOBAL_COLORS: HairColor[] = [
  { id: 'jet-black',    name: 'Jet Black',    hex: '#0d0d0d' },
  { id: 'dark-brown',   name: 'Dark Brown',   hex: '#2C1A0E' },
  { id: 'rich-brown',   name: 'Rich Brown',   hex: '#4A2C1A' },
  { id: 'caramel',      name: 'Caramel',      hex: '#8B5A2B' },
  { id: 'honey-blonde', name: 'Honey Blonde', hex: '#C99A55' },
  { id: 'rose-blush',   name: 'Rose Blush',   hex: '#C77B8C' },
  { id: 'burgundy',     name: 'Burgundy',     hex: '#6D1A2A' },
  { id: 'silver',       name: 'Silver',       hex: '#A8A8A8' },
];

const WIG_STYLES: WigStyle[] = [
  {
    id: 'bob',
    label: 'Bob Cut',
    icon: 'content-cut',
    shape: 'short',
    colors: GLOBAL_COLORS,
  },
  {
    id: 'sleek-long',
    label: 'Sleek Long',
    icon: 'face-woman',
    shape: 'long',
    colors: GLOBAL_COLORS,
  },
  {
    id: 'wavy',
    label: 'Beach Waves',
    icon: 'water-outline',
    shape: 'wavy',
    colors: GLOBAL_COLORS,
  },
  {
    id: 'curly',
    label: 'Full Curls',
    icon: 'autorenew',
    shape: 'curly',
    colors: GLOBAL_COLORS,
  },
  {
    id: 'pixie',
    label: 'Pixie',
    icon: 'star-circle-outline',
    shape: 'short',
    colors: GLOBAL_COLORS,
  },
];

// ─── Wig canopy shape helper ──────────────────────────────────────────────────

function getCanopyStyle(shape: WigStyle['shape'], colorHex: string) {
  const base = {
    position: 'absolute' as const,
    backgroundColor: colorHex + 'B0', // ~69 % alpha
  };
  switch (shape) {
    case 'short':
      return { ...base, top: '15%', width: ms(210), height: ms(110), borderTopLeftRadius: ms(120), borderTopRightRadius: ms(120), borderBottomLeftRadius: ms(30), borderBottomRightRadius: ms(30) };
    case 'medium':
      return { ...base, top: '13%', width: ms(220), height: ms(160), borderTopLeftRadius: ms(120), borderTopRightRadius: ms(120), borderBottomLeftRadius: ms(60), borderBottomRightRadius: ms(60) };
    case 'long':
      return { ...base, top: '12%', width: ms(230), height: ms(300), borderTopLeftRadius: ms(120), borderTopRightRadius: ms(120), borderBottomLeftRadius: ms(80), borderBottomRightRadius: ms(80) };
    case 'wavy':
      return { ...base, top: '12%', width: ms(240), height: ms(280), borderTopLeftRadius: ms(130), borderTopRightRadius: ms(130), borderBottomLeftRadius: ms(100), borderBottomRightRadius: ms(100) };
    case 'curly':
      return { ...base, top: '11%', width: ms(260), height: ms(240), borderTopLeftRadius: ms(140), borderTopRightRadius: ms(140), borderBottomLeftRadius: ms(90), borderBottomRightRadius: ms(90) };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated corner bracket guides — four L-shapes around the face oval. */
function FaceGuide({ pulse }: { pulse: Animated.Value }) {
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const cornerSize = ms(22);
  const cornerThickness = 2;

  const cornerBase: object = {
    position: 'absolute',
    width: cornerSize,
    height: cornerSize,
    borderColor: '#fff',
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.faceGuideWrap,
        { opacity },
      ]}
    >
      {/* Face oval */}
      <View style={styles.faceOval} />

      {/* TL */}
      <View style={[cornerBase, { top: 0, left: 0, borderTopWidth: cornerThickness, borderLeftWidth: cornerThickness, borderTopLeftRadius: ms(4) }]} />
      {/* TR */}
      <View style={[cornerBase, { top: 0, right: 0, borderTopWidth: cornerThickness, borderRightWidth: cornerThickness, borderTopRightRadius: ms(4) }]} />
      {/* BL */}
      <View style={[cornerBase, { bottom: 0, left: 0, borderBottomWidth: cornerThickness, borderLeftWidth: cornerThickness, borderBottomLeftRadius: ms(4) }]} />
      {/* BR */}
      <View style={[cornerBase, { bottom: 0, right: 0, borderBottomWidth: cornerThickness, borderRightWidth: cornerThickness, borderBottomRightRadius: ms(4) }]} />
    </Animated.View>
  );
}

/** Single style card in the horizontal carousel. */
function StyleCard({
  style,
  isActive,
  colorHex,
  onPress,
}: {
  style: WigStyle;
  isActive: boolean;
  colorHex: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[cardStyles.wrap, isActive && cardStyles.wrapActive]}
    >
      {/* Mini hair shape */}
      <View style={[cardStyles.miniShape, { backgroundColor: colorHex + 'CC' }]} />
      {/* Icon */}
      <View style={cardStyles.iconWrap}>
        <MaterialCommunityIcons
          name={style.icon as any}
          size={ms(26)}
          color={isActive ? '#fff' : 'rgba(255,255,255,0.55)'}
        />
      </View>
      <Text style={[cardStyles.label, isActive && cardStyles.labelActive]} numberOfLines={1}>
        {style.label}
      </Text>
      {isActive && <View style={cardStyles.activeDot} />}
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  wrap: {
    width: ms(76),
    alignItems: 'center',
    paddingVertical: vs(10),
    paddingHorizontal: ms(4),
    borderRadius: ms(16),
    marginHorizontal: ms(4),
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  wrapActive: {
    backgroundColor: 'rgba(255, 55, 155, 0.22)',
    borderColor: '#FF379B',
  },
  miniShape: {
    width: ms(38),
    height: ms(22),
    borderTopLeftRadius: ms(20),
    borderTopRightRadius: ms(20),
    borderBottomLeftRadius: ms(8),
    borderBottomRightRadius: ms(8),
    marginBottom: vs(4),
  },
  iconWrap: { marginBottom: vs(4) },
  label: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: ms(10),
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  labelActive: { color: '#fff' },
  activeDot: {
    position: 'absolute',
    bottom: vs(6),
    width: ms(4),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: '#FF379B',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ARScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<WigStyle>(WIG_STYLES[0]);
  const [selectedColor, setSelectedColor] = useState<HairColor>(GLOBAL_COLORS[0]);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  // Pulsing animation for the face guide corners
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission?.granted, permission?.canAskAgain]);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      setPreview(photo?.uri ?? null);
    } catch (e: any) {
      Alert.alert('Capture Failed', e?.message || 'Could not take photo.');
    } finally {
      setIsCapturing(false);
    }
  };

  // ── Permission loading ────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF379B" />
        <Text style={styles.loadingText}>Preparing camera…</Text>
      </View>
    );
  }

  // ── Permission denied ─────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: '#0d0308' }]}>
        <LinearGradient
          colors={['#2a0a1a', '#0d0308']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.deniedIconWrap}>
          <MaterialCommunityIcons name="camera-off" size={ms(52)} color="#FF379B" />
        </View>
        <Text style={styles.deniedTitle}>Camera Access Needed</Text>
        <Text style={styles.deniedDesc}>
          HairLink AR needs your camera to virtually try on wig styles. Your photo never leaves your device.
        </Text>
        {permission.canAskAgain ? (
          <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
            <LinearGradient colors={['#B0245E', '#FF379B']} style={styles.grantBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.grantBtnText}>Enable Camera</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.grantBtn} onPress={() => Linking.openSettings()}>
            <LinearGradient colors={['#B0245E', '#FF379B']} style={styles.grantBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.grantBtnText}>Open Settings</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onBack} style={{ marginTop: vs(14) }}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canopyStyle = getCanopyStyle(selectedStyle.shape, selectedColor.hex);
  const bottomPad = insets.bottom + vs(14);

  // ── Main AR view ──────────────────────────────────────────────────────
  return (
    <View style={styles.root}>

      {/* ── Camera ─────────────────────────────────────────────────── */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        responsiveOrientationWhenOrientationLocked
      />

      {/* ── Wig canopy + face guide ─────────────────────────────────── */}
      <View pointerEvents="none" style={styles.overlayLayer}>
        {/* Wig canopy */}
        <View style={canopyStyle as any} />

        {/* Face guide with animated corners */}
        <FaceGuide pulse={pulseAnim} />

        {/* Scanning label */}
        <Animated.View
          pointerEvents="none"
          style={[styles.scanBadge, {
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
          }]}
        >
          <View style={styles.scanDot} />
          <Text style={styles.scanText}>TRACKING FACE</Text>
        </Animated.View>
      </View>

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['rgba(0,0,0,0.72)', 'transparent']}
        style={[styles.topBar, { paddingTop: insets.top + vs(6) }]}
      >
        {/* Close */}
        <TouchableOpacity style={styles.iconCircle} onPress={onBack}>
          <Ionicons name="close" size={ms(22)} color="#fff" />
        </TouchableOpacity>

        {/* Brand */}
        <View style={styles.brandWrap}>
          <View style={styles.brandPill}>
            <FontAwesome5 name="magic" size={ms(10)} color="#FF379B" />
            <Text style={styles.brandText}>HairLink AR</Text>
          </View>
          <Text style={styles.styleNameText}>{selectedStyle.label} · {selectedColor.name}</Text>
        </View>

        {/* Flash */}
        <TouchableOpacity
          style={[styles.iconCircle, flash === 'on' && styles.iconCircleActive]}
          onPress={() => setFlash(f => (f === 'off' ? 'on' : 'off'))}
        >
          <Ionicons
            name={flash === 'on' ? 'flash' : 'flash-off'}
            size={ms(20)}
            color={flash === 'on' ? '#FF379B' : '#fff'}
          />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Right side utility rail ─────────────────────────────────── */}
      <View style={[styles.rightRail, { top: insets.top + vs(70) }]}>
        <TouchableOpacity
          style={styles.railBtn}
          onPress={() => setFacing(c => (c === 'back' ? 'front' : 'back'))}
        >
          <MaterialCommunityIcons name="camera-flip-outline" size={ms(22)} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.railBtn}>
          <Ionicons name="sparkles" size={ms(19)} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.railBtn}>
          <Ionicons name="share-outline" size={ms(21)} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Bottom panel (glassmorphism) ────────────────────────────── */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
        style={[styles.bottomPanel, { paddingBottom: bottomPad }]}
      >
        {/* Section label */}
        <Text style={styles.sectionLabel}>CHOOSE STYLE</Text>

        {/* Style carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.styleCarousel}
        >
          {WIG_STYLES.map(w => (
            <StyleCard
              key={w.id}
              style={w}
              isActive={w.id === selectedStyle.id}
              colorHex={selectedColor.hex}
              onPress={() => setSelectedStyle(w)}
            />
          ))}
        </ScrollView>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Color row */}
        <Text style={styles.sectionLabel}>COLOR</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorRow}
        >
          {GLOBAL_COLORS.map(c => {
            const isActive = c.id === selectedColor.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedColor(c)}
                style={[styles.colorChip, isActive && styles.colorChipActive]}
                activeOpacity={0.8}
              >
                <View style={[styles.colorSwatch, { backgroundColor: c.hex }]} />
                {isActive && (
                  <View style={styles.colorCheckWrap}>
                    <Ionicons name="checkmark" size={ms(9)} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Capture row */}
        <View style={styles.captureRow}>
          {/* Gallery placeholder */}
          <TouchableOpacity style={styles.sideActionBtn}>
            <Ionicons name="images-outline" size={ms(22)} color="#fff" />
            <Text style={styles.sideActionLabel}>Gallery</Text>
          </TouchableOpacity>

          {/* Shutter */}
          <TouchableOpacity
            onPress={takePicture}
            disabled={isCapturing}
            activeOpacity={0.85}
            style={styles.shutterOuter}
          >
            <LinearGradient
              colors={isCapturing ? ['#888', '#aaa'] : ['#B0245E', '#FF379B']}
              style={styles.shutterGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isCapturing
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="camera" size={ms(28)} color="#fff" />
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Flip */}
          <TouchableOpacity
            style={styles.sideActionBtn}
            onPress={() => setFacing(c => (c === 'back' ? 'front' : 'back'))}
          >
            <MaterialCommunityIcons name="camera-flip-outline" size={ms(22)} color="#fff" />
            <Text style={styles.sideActionLabel}>Flip</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Photo preview modal ─────────────────────────────────────── */}
      <Modal
        visible={!!preview}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setPreview(null)}
      >
        <View style={styles.previewBackdrop}>
          <LinearGradient
            colors={['#0d0308', '#1a0512']}
            style={StyleSheet.absoluteFill}
          />

          {/* Header */}
          <View style={[styles.previewHeader, { paddingTop: insets.top + vs(10) }]}>
            <TouchableOpacity onPress={() => setPreview(null)} style={styles.previewClose}>
              <Ionicons name="chevron-down" size={ms(24)} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.previewHeaderTitle}>Your Look</Text>
            <View style={{ width: ms(40) }} />
          </View>

          {/* Photo */}
          {preview && (
            <View style={styles.previewImgWrap}>
              <Image source={{ uri: preview }} style={styles.previewImg} resizeMode="cover" />
              {/* Style tag overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.previewImgOverlay}
              >
                <View style={styles.previewStyleTag}>
                  <FontAwesome5 name="magic" size={ms(10)} color="#FF379B" />
                  <Text style={styles.previewStyleTagText}>
                    {selectedStyle.label} · {selectedColor.name}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Reaction / action row */}
          <View style={styles.previewReactRow}>
            {['😍', '✨', '💖', '🔥'].map(e => (
              <TouchableOpacity key={e} style={styles.reactBtn}>
                <Text style={{ fontSize: ms(24) }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action buttons */}
          <View style={[styles.previewActions, { paddingBottom: insets.bottom + vs(20) }]}>
            <TouchableOpacity
              style={styles.previewBtnGhost}
              onPress={() => setPreview(null)}
            >
              <Ionicons name="refresh" size={ms(16)} color="#FF379B" style={{ marginRight: ms(6) }} />
              <Text style={styles.previewBtnGhostText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.previewBtnSolid}
              onPress={() => { setPreview(null); onBack(); }}
            >
              <LinearGradient
                colors={['#B0245E', '#FF379B']}
                style={styles.previewBtnSolidInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark-circle" size={ms(16)} color="#fff" style={{ marginRight: ms(6) }} />
                <Text style={styles.previewBtnSolidText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Permission states
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(28),
    backgroundColor: '#0d0308',
  },
  loadingText: { marginTop: vs(12), color: '#FF379B', fontWeight: '700', fontSize: ms(13) },
  deniedIconWrap: {
    width: ms(96),
    height: ms(96),
    borderRadius: ms(48),
    backgroundColor: 'rgba(255,55,155,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(20),
    borderWidth: 1.5,
    borderColor: 'rgba(255,55,155,0.3)',
  },
  deniedTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff', marginBottom: vs(10) },
  deniedDesc: {
    fontSize: ms(13),
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: ms(21),
    marginBottom: vs(28),
  },
  grantBtn: { width: '80%', borderRadius: ms(30), overflow: 'hidden' },
  grantBtnInner: {
    paddingVertical: vs(14),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ms(30),
  },
  grantBtnText: { color: '#fff', fontWeight: '900', fontSize: ms(15), letterSpacing: 0.5 },
  backLinkText: { color: 'rgba(255,255,255,0.45)', fontWeight: '700', fontSize: ms(13) },

  // Overlay
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  faceGuideWrap: {
    position: 'absolute',
    top: '22%',
    width: ms(186),
    height: ms(250),
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: ms(186),
    height: ms(250),
    borderRadius: ms(120),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  scanBadge: {
    position: 'absolute',
    top: '60%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: ms(20),
    paddingHorizontal: ms(10),
    paddingVertical: vs(4),
    gap: ms(5),
  },
  scanDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    backgroundColor: '#FF379B',
  },
  scanText: {
    color: '#fff',
    fontSize: ms(9),
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(16),
    paddingBottom: vs(24),
    zIndex: 20,
  },
  iconCircle: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: 'rgba(255,55,155,0.2)',
    borderColor: '#FF379B',
  },
  brandWrap: { alignItems: 'center' },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: ms(20),
    paddingHorizontal: ms(10),
    paddingVertical: vs(4),
    borderWidth: 1,
    borderColor: 'rgba(255,55,155,0.35)',
    marginBottom: vs(3),
  },
  brandText: { color: '#fff', fontSize: ms(11), fontWeight: '900', letterSpacing: 0.5 },
  styleNameText: { color: 'rgba(255,255,255,0.7)', fontSize: ms(10), fontWeight: '600' },

  // Right rail
  rightRail: {
    position: 'absolute',
    right: ms(12),
    gap: vs(10),
    zIndex: 20,
  },
  railBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom panel
  bottomPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    zIndex: 20,
    paddingTop: vs(20),
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: ms(9.5),
    fontWeight: '800',
    letterSpacing: 1.8,
    marginLeft: ms(18),
    marginBottom: vs(8),
  },
  styleCarousel: {
    paddingHorizontal: ms(12),
    paddingBottom: vs(4),
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: ms(16),
    marginVertical: vs(12),
  },
  colorRow: {
    paddingHorizontal: ms(14),
    paddingBottom: vs(6),
    gap: ms(8),
  },
  colorChip: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  colorChipActive: { borderColor: '#fff' },
  colorSwatch: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  colorCheckWrap: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: ms(14),
    height: ms(14),
    borderRadius: ms(7),
    backgroundColor: '#FF379B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: ms(28),
    marginTop: vs(14),
    marginBottom: vs(4),
  },
  sideActionBtn: {
    alignItems: 'center',
    gap: vs(3),
    width: ms(56),
  },
  sideActionLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: ms(10),
    fontWeight: '700',
  },
  shutterOuter: {
    width: ms(76),
    height: ms(76),
    borderRadius: ms(38),
    borderWidth: 3,
    borderColor: '#fff',
    padding: ms(4),
    shadowColor: '#FF379B',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  shutterGradient: {
    flex: 1,
    borderRadius: ms(32),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Preview modal
  previewBackdrop: {
    flex: 1,
    backgroundColor: '#0d0308',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(16),
    paddingBottom: vs(12),
  },
  previewClose: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeaderTitle: {
    color: '#fff',
    fontSize: ms(16),
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  previewImgWrap: {
    marginHorizontal: ms(16),
    borderRadius: ms(24),
    overflow: 'hidden',
    flex: 1,
    maxHeight: SCREEN_H * 0.52,
  },
  previewImg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  previewImgOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: ms(14),
  },
  previewStyleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: ms(20),
    paddingHorizontal: ms(10),
    paddingVertical: vs(5),
    borderWidth: 1,
    borderColor: 'rgba(255,55,155,0.4)',
  },
  previewStyleTagText: {
    color: '#fff',
    fontSize: ms(11),
    fontWeight: '700',
  },
  previewReactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: ms(16),
    paddingVertical: vs(14),
  },
  reactBtn: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(25),
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    gap: ms(12),
    paddingHorizontal: ms(20),
  },
  previewBtnGhost: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(14),
    borderRadius: ms(14),
    borderWidth: 1.5,
    borderColor: '#FF379B',
    backgroundColor: 'rgba(255,55,155,0.1)',
  },
  previewBtnGhostText: { color: '#FF379B', fontWeight: '900', fontSize: ms(14) },
  previewBtnSolid: {
    flex: 1.4,
    borderRadius: ms(14),
    overflow: 'hidden',
  },
  previewBtnSolidInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(14),
    borderRadius: ms(14),
  },
  previewBtnSolidText: { color: '#fff', fontWeight: '900', fontSize: ms(14) },
});
