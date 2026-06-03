import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType, FlashMode } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, vs } from '../../lib/scaling';

/**
 * AR Try-On screen.
 *
 * Expo Go does not expose face-mesh / ARKit APIs, so this is a guided camera
 * try-on rather than a true face-tracking AR overlay. The flow:
 *   1. Request camera permission (with a fallback to system Settings if denied)
 *   2. Show a live camera preview (default: front cam) with a face-guide
 *      oval and a translucent "hair canopy" overlay tinted by the selected wig
 *   3. Let the user toggle flash, flip cameras, scroll wig styles, and
 *      capture a still. The captured photo is shown in a modal review.
 *
 * Real face-tracking + 3D wig mesh would need a custom dev client + a
 * native module (e.g. react-native-vision-camera + face-detector plugin).
 */

type WigStyle = {
  id: string;
  label: string;
  color: string;   // hex – tint applied to the overlay canopy
  swatch: string;  // hex – chip color (usually same as color)
};

const WIG_STYLES: WigStyle[] = [
  { id: 'natural-black', label: 'Natural Black', color: '#1a1a1a', swatch: '#1a1a1a' },
  { id: 'rich-brown',    label: 'Rich Brown',    color: '#4A2C1A', swatch: '#4A2C1A' },
  { id: 'caramel',       label: 'Caramel',       color: '#8B5A2B', swatch: '#8B5A2B' },
  { id: 'honey-blonde',  label: 'Honey Blonde',  color: '#C99A55', swatch: '#C99A55' },
  { id: 'rose-blush',    label: 'Rose Blush',    color: '#C77B8C', swatch: '#C77B8C' },
];

export default function ARScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedWig, setSelectedWig] = useState<WigStyle>(WIG_STYLES[0]);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  // Auto-request once on first mount. We do NOT re-request on every render —
  // that loops the permission modal.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission?.granted, permission?.canAskAgain]);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      setPreview(photo?.uri || null);
    } catch (e: any) {
      Alert.alert('Capture Failed', e?.message || 'Could not take photo. Try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleFacing = () => setFacing(c => (c === 'back' ? 'front' : 'back'));
  const toggleFlash = () => setFlash(f => (f === 'off' ? 'on' : 'off'));

  const openSettings = () => {
    Linking.openSettings().catch(() =>
      Alert.alert('Unable to open Settings', 'Please enable camera access manually.')
    );
  };

  // ── Permission still loading ──────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B084CC" />
        <Text style={styles.loadingText}>Preparing camera…</Text>
      </View>
    );
  }

  // ── Permission denied / not granted ───────────────────────────────
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <View style={styles.deniedIconWrap}>
          <MaterialCommunityIcons name="camera-off" size={ms(56)} color="#B084CC" />
        </View>
        <Text style={styles.deniedTitle}>Camera Access Needed</Text>
        <Text style={styles.deniedDesc}>
          HairLink needs your camera to try wig styles on in AR. Your photo never leaves the device.
        </Text>
        {permission.canAskAgain ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Enable Camera</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={openSettings}>
            <Text style={styles.primaryBtnText}>Open Settings</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onBack} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Live camera ───────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        responsiveOrientationWhenOrientationLocked
      />

      {/* Face guide + wig canopy overlay (centered-ish, near the top) */}
      <View pointerEvents="none" style={styles.overlayLayer}>
        {/* Tinted canopy approximating where the wig sits */}
        <View
          style={[
            styles.wigCanopy,
            { backgroundColor: selectedWig.color + 'AA' /* ~67% alpha */ },
          ]}
        />
        {/* Face guide oval */}
        <View style={styles.faceGuide} />
        <Text style={styles.guideHint}>
          Center your face in the guide and pick a style below
        </Text>
      </View>

      {/* Top controls */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={[styles.topBar, { paddingTop: insets.top + vs(8) }]}
      >
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <Ionicons name="close" size={ms(26)} color="#fff" />
        </TouchableOpacity>

        <View style={styles.topTitleWrap}>
          <Text style={styles.topTitle}>AR Try-On</Text>
          <Text style={styles.topSubtitle}>{selectedWig.label}</Text>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={toggleFlash}>
          <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={ms(22)} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + vs(20) }]}>
        {/* Wig style chips — horizontal selector */}
        <View style={styles.chipsRow}>
          {WIG_STYLES.map((w) => {
            const isActive = w.id === selectedWig.id;
            return (
              <TouchableOpacity
                key={w.id}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setSelectedWig(w)}
                activeOpacity={0.85}
              >
                <View style={[styles.chipSwatch, { backgroundColor: w.swatch }]} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Capture row: flip / shutter / placeholder */}
        <View style={styles.captureRow}>
          <TouchableOpacity style={styles.smallBtn} onPress={toggleFacing}>
            <MaterialCommunityIcons name="camera-flip-outline" size={ms(24)} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={takePicture}
            style={styles.shutterOuter}
            disabled={isCapturing}
          >
            <View style={styles.shutterMid}>
              <View
                style={[
                  styles.shutterInner,
                  isCapturing && { backgroundColor: '#B084CC', transform: [{ scale: 0.85 }] },
                ]}
              />
            </View>
          </TouchableOpacity>

          <View style={[styles.smallBtn, { opacity: 0.4 }]}>
            <Feather name="image" size={ms(22)} color="#fff" />
          </View>
        </View>
      </View>

      {/* Preview modal — shown after a successful capture */}
      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.previewCard}>
            {preview && (
              <Image source={{ uri: preview }} style={styles.previewImg} resizeMode="cover" />
            )}
            <Text style={styles.previewTitle}>Looks great!</Text>
            <Text style={styles.previewDesc}>
              {selectedWig.label} captured. Try another style or finish your session.
            </Text>
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.previewBtn, styles.previewBtnGhost]}
                onPress={() => setPreview(null)}
              >
                <Text style={styles.previewBtnGhostText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewBtn, styles.previewBtnSolid]}
                onPress={() => {
                  setPreview(null);
                  onBack();
                }}
              >
                <Text style={styles.previewBtnSolidText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Permission states
  centered: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(28),
  },
  loadingText: { marginTop: vs(12), color: '#8C7895', fontWeight: '600' },
  deniedIconWrap: {
    width: ms(96),
    height: ms(96),
    borderRadius: ms(48),
    backgroundColor: '#F5EEF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(20),
  },
  deniedTitle: { fontSize: ms(18), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(8) },
  deniedDesc: {
    fontSize: ms(13),
    color: '#666',
    textAlign: 'center',
    lineHeight: ms(20),
    marginBottom: vs(24),
  },
  primaryBtn: {
    backgroundColor: '#B084CC',
    paddingHorizontal: ms(32),
    paddingVertical: vs(13),
    borderRadius: ms(28),
    shadowColor: '#B084CC',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: ms(14), letterSpacing: 0.3 },
  backLink: { marginTop: vs(18) },
  backLinkText: { color: '#A8A29E', fontWeight: '700', fontSize: ms(13) },

  // Overlay layer (face guide + wig canopy)
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  wigCanopy: {
    position: 'absolute',
    top: '18%',
    width: ms(220),
    height: ms(140),
    borderTopLeftRadius: ms(140),
    borderTopRightRadius: ms(140),
    borderBottomLeftRadius: ms(40),
    borderBottomRightRadius: ms(40),
  },
  faceGuide: {
    position: 'absolute',
    top: '24%',
    width: ms(200),
    height: ms(260),
    borderRadius: ms(130),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderStyle: 'dashed',
  },
  guideHint: {
    position: 'absolute',
    top: '64%',
    color: 'rgba(255,255,255,0.9)',
    fontSize: ms(12),
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
    paddingHorizontal: ms(20),
    textAlign: 'center',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(16),
    paddingBottom: vs(20),
    zIndex: 10,
  },
  iconBtn: {
    width: ms(42),
    height: ms(42),
    borderRadius: ms(21),
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitleWrap: { alignItems: 'center' },
  topTitle: { color: '#fff', fontSize: ms(15), fontWeight: '900', letterSpacing: 0.5 },
  topSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: ms(11), fontWeight: '600', marginTop: vs(2) },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: ms(28),
    paddingHorizontal: ms(10),
    paddingVertical: vs(8),
    marginBottom: vs(18),
    gap: ms(10),
  },
  chip: {
    width: ms(38),
    height: ms(38),
    borderRadius: ms(19),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipActive: { borderColor: '#fff' },
  chipSwatch: {
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: ms(40),
  },
  smallBtn: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterMid: {
    width: ms(68),
    height: ms(68),
    borderRadius: ms(34),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: ms(58),
    height: ms(58),
    borderRadius: ms(29),
    backgroundColor: '#fff',
  },

  // Preview modal
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(20),
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: ms(24),
    padding: ms(20),
    width: '100%',
    maxWidth: ms(360),
    alignItems: 'center',
  },
  previewImg: {
    width: '100%',
    height: vs(280),
    borderRadius: ms(16),
    marginBottom: vs(16),
    backgroundColor: '#000',
  },
  previewTitle: { fontSize: ms(18), fontWeight: '900', color: '#1a1a1a' },
  previewDesc: {
    fontSize: ms(13),
    color: '#666',
    textAlign: 'center',
    lineHeight: ms(20),
    marginTop: vs(6),
    marginBottom: vs(18),
  },
  previewActions: { flexDirection: 'row', gap: ms(10), width: '100%' },
  previewBtn: { flex: 1, paddingVertical: vs(13), borderRadius: ms(14), alignItems: 'center' },
  previewBtnGhost: { backgroundColor: '#F5EEF8', borderWidth: 1, borderColor: '#E8DAEF' },
  previewBtnGhostText: { color: '#B084CC', fontWeight: '900', fontSize: ms(14) },
  previewBtnSolid: { backgroundColor: '#B084CC' },
  previewBtnSolidText: { color: '#fff', fontWeight: '900', fontSize: ms(14) },
});
