import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  Image,
  Modal,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import type { Face } from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, vs } from '../../lib/scaling';
import HairModelViewer from './HairModelViewer';

/**
 * HairLink AR Try-On — live face-tracked wig overlay.
 *
 * Pipeline:
 *  1. react-native-vision-camera frame processor runs ML Kit face detection
 *     per frame on the camera thread.
 *  2. Worklets.createRunOnJS hops the resulting face bbox + yaw + roll back
 *     into the JS thread.
 *  3. ARScreen translates the 3D model overlay container to the detected
 *     face position (forehead-anchored) and feeds yaw/roll into the GL view
 *     so the mesh rotates with the head pose.
 *
 * Only the FIRST detected face is tracked. Coordinate mapping handles front
 * camera mirroring + simple frame-to-screen scaling.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type HairColor = { id: string; name: string; hex: string };
type Length = 'short' | 'long';

const COLORS: HairColor[] = [
  { id: 'black', name: 'Black', hex: '#0d0d0d' },
  { id: 'brown', name: 'Brown', hex: '#6B3A1F' },
  { id: 'light', name: 'Light', hex: '#D29A55' },
];

export default function ARScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { hasPermission: cameraHasPerm, requestPermission: requestCameraPerm } = useCameraPermission();
  const [mediaPerm, requestMediaPerm] = MediaLibrary.usePermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const device = useCameraDevice(facing);
  const [isCapturing, setIsCapturing] = useState(false);
  const [length, setLength] = useState<Length>('long');
  const [selectedColor, setSelectedColor] = useState<HairColor>(COLORS[0]);
  const [favorite, setFavorite] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  // Face tracking state.
  // `trackingEnabled = false` → wig stays centered on screen so we can
  // verify the model isn't being clipped before re-enabling face follow.
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(false);
  const [overlayBox, setOverlayBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [faceYaw, setFaceYaw] = useState<number>(0);
  const [faceRoll, setFaceRoll] = useState<number>(0);

  // Default centered box (used when tracking is OFF, or as fallback when no face).
  const centeredBox = useMemo(() => {
    const { width: w, height: h } = Dimensions.get('window');
    const boxW = w * 0.85;
    const boxH = h * 0.55;
    return { x: (w - boxW) / 2, y: h * 0.08, w: boxW, h: boxH };
  }, []);

  // User adjustments — applied on top of face-tracked position.
  //   `scale`       pinch with 2 fingers (or +/− buttons) to grow/shrink
  //   `offsetX/Y`   2-finger drag (or tilt buttons) to nudge position
  //   `tiltPitch`   forward/back tilt of the 3D model around its X axis (rad)
  const [scale, setScale] = useState<number>(1.5);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [tiltPitch, setTiltPitch] = useState<number>(0);
  // Pinch/drag gesture refs (held outside React state so PanResponder reads
  // the most recent values without re-creating the responder on each render).
  const scaleRef = useRef<number>(1);
  const offsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);
  const dragStartRef = useRef<{ cx: number; cy: number; ox: number; oy: number } | null>(null);

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = { x: offsetX, y: offsetY }; }, [offsetX, offsetY]);

  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (e: GestureResponderEvent) =>
          e.nativeEvent.touches.length === 2,
        onMoveShouldSetPanResponder: (e: GestureResponderEvent) =>
          e.nativeEvent.touches.length === 2,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          const touches = e.nativeEvent.touches;
          if (touches.length !== 2) return;
          const a = { x: touches[0].pageX, y: touches[0].pageY };
          const b = { x: touches[1].pageX, y: touches[1].pageY };
          pinchStartRef.current = { dist: distance(a, b), scale: scaleRef.current };
          dragStartRef.current = {
            cx: (a.x + b.x) / 2,
            cy: (a.y + b.y) / 2,
            ox: offsetRef.current.x,
            oy: offsetRef.current.y,
          };
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          const touches = e.nativeEvent.touches;
          if (touches.length !== 2 || !pinchStartRef.current || !dragStartRef.current) return;
          const a = { x: touches[0].pageX, y: touches[0].pageY };
          const b = { x: touches[1].pageX, y: touches[1].pageY };

          // Pinch → scale
          const d = distance(a, b);
          const next = Math.max(0.4, Math.min(3.5, pinchStartRef.current.scale * (d / pinchStartRef.current.dist)));
          setScale(next);

          // Two-finger drag → offset
          const cx = (a.x + b.x) / 2;
          const cy = (a.y + b.y) / 2;
          setOffsetX(dragStartRef.current.ox + (cx - dragStartRef.current.cx));
          setOffsetY(dragStartRef.current.oy + (cy - dragStartRef.current.cy));
        },
        onPanResponderRelease: () => {
          pinchStartRef.current = null;
          dragStartRef.current = null;
        },
        onPanResponderTerminate: () => {
          pinchStartRef.current = null;
          dragStartRef.current = null;
        },
      }),
    [],
  );

  const resetAdjustments = () => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
    setTiltPitch(0);
  };

  const bumpScale = (delta: number) =>
    setScale(s => Math.max(0.4, Math.min(3.5, s + delta)));
  const bumpTilt = (delta: number) =>
    setTiltPitch(t => Math.max(-0.8, Math.min(0.8, t + delta)));

  useEffect(() => {
    if (!cameraHasPerm) requestCameraPerm();
  }, [cameraHasPerm, requestCameraPerm]);

  const ensureMediaPerm = async () => {
    if (mediaPerm?.granted) return true;
    const res = await requestMediaPerm();
    return res.granted;
  };

  // ── Face detector ────────────────────────────────────────────────
  const { detectFaces } = useFaceDetector({
    performanceMode: 'fast',
    landmarkMode: 'none',
    contourMode: 'none',
    classificationMode: 'none',
    minFaceSize: 0.15,
  });

  // Worklet → JS bridge. Translates frame-space bounds to screen-space + state.
  const onFacesDetected = useMemo(
    () =>
      Worklets.createRunOnJS(
        (
          present: boolean,
          fx: number,
          fy: number,
          fw: number,
          fh: number,
          yaw: number,
          roll: number,
          frameW: number,
          frameH: number,
        ) => {
          if (!present) {
            setOverlayBox(null);
            return;
          }
          const { width: screenW, height: screenH } = Dimensions.get('window');
          // Frame coords are pre-rotated to portrait; preview is NOT
          // auto-mirrored by Vision Camera (despite the user seeing a mirror
          // image), so we mirror X ourselves to match what they see.
          const sx = screenW / frameW;
          const sy = screenH / frameH;
          const mirrored = facing === 'front';
          let x = fx * sx;
          const y = fy * sy;
          const w = fw * sx;
          const h = fh * sy;
          if (mirrored) x = screenW - x - w;

          // Wig anchored to the top of the head — sits ABOVE the face bbox.
          // - Wider (1.6× face) so the wig silhouette extends past the temples
          // - Higher (1.4× face above) so the wig sits on top of the head, not on the face
          const padX = w * 0.55;       // → total width = 2.1× face width
          const padTop = h * 1.3;      // → top extends 1.3 face-heights above bbox
          const padBottom = h * 0.4;   // include the head crown area below bbox top
          setOverlayBox({
            x: x - padX,
            y: y - padTop,
            w: w + padX * 2,
            h: h + padTop + padBottom,
          });
          setFaceYaw((yaw * Math.PI) / 180);
          setFaceRoll(((-roll) * Math.PI) / 180);
        },
      ),
    [facing],
  );

  // Frame processor — runs on the camera thread, calls back into JS.
  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      const faces = detectFaces(frame);
      const f: Face | undefined = faces?.[0];
      if (f) {
        onFacesDetected(
          true,
          f.bounds.x,
          f.bounds.y,
          f.bounds.width,
          f.bounds.height,
          f.yawAngle ?? 0,
          f.rollAngle ?? 0,
          frame.width,
          frame.height,
        );
      } else {
        onFacesDetected(false, 0, 0, 0, 0, 0, 0, frame.width, frame.height);
      }
    },
    [detectFaces, onFacesDetected],
  );

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo: any = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      if (!photo?.path) throw new Error('No image captured');
      const uri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      const ok = await ensureMediaPerm();
      if (ok) {
        try {
          const asset = await MediaLibrary.createAssetAsync(uri);
          try { await MediaLibrary.createAlbumAsync('HairLink', asset, false); } catch {}
        } catch (e) { console.warn('Save to gallery failed:', e); }
      }
      setPreview(uri);
    } catch (e: any) {
      Alert.alert('Capture Failed', e?.message || 'Could not take photo.');
    } finally {
      setIsCapturing(false);
    }
  };

  // ── Permission / device loading ──────────────────────────────────────
  if (!cameraHasPerm || !device) {
    return (
      <View style={[styles.centered, { backgroundColor: '#0d0308' }]}>
        <LinearGradient colors={['#2a0a1a', '#0d0308']} style={StyleSheet.absoluteFill} />
        <View style={styles.deniedIconWrap}>
          <MaterialCommunityIcons name="camera-off" size={ms(52)} color="#FF379B" />
        </View>
        <Text style={styles.deniedTitle}>
          {!cameraHasPerm ? 'Camera Access Needed' : 'Preparing camera…'}
        </Text>
        <Text style={styles.deniedDesc}>
          {!cameraHasPerm
            ? 'HairLink AR needs your camera to virtually try on wig styles. Your photo never leaves your device.'
            : 'Initialising face tracking and 3D renderer.'}
        </Text>
        {!cameraHasPerm ? (
          <TouchableOpacity style={styles.grantBtn} onPress={() => requestCameraPerm().catch(() => Linking.openSettings())}>
            <LinearGradient colors={['#B0245E', '#FF379B']} style={styles.grantBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.grantBtnText}>Enable Camera</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <ActivityIndicator size="large" color="#FF379B" />
        )}
        <TouchableOpacity onPress={onBack} style={{ marginTop: vs(14) }}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Camera
        ref={cameraRef as any}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        photo
        frameProcessor={frameProcessor}
      />

      {/* Live 3D wig overlay.
          Scaling is anchored to the TOP-CENTER of the box so growing the
          wig extends it DOWNWARD past the face — keeping the head INSIDE
          the wig. The wig's top stays put as you resize. */}
      {(() => {
        const box = trackingEnabled ? overlayBox : centeredBox;
        if (!box) {
          return (
            <View pointerEvents="none" style={styles.modelOverlay}>
              <HairModelViewer length={length} colorHex={selectedColor.hex} disablePan />
            </View>
          );
        }
        const cx = box.x + box.w / 2;
        const sw = box.w * scale;
        const sh = box.h * scale;
        const left = cx - sw / 2 + offsetX;
        const top = box.y + offsetY; // top-anchored — does NOT move when scaling
        return (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left,
              top,
              width: sw,
              height: sh,
              zIndex: 5,
            }}
          >
            <HairModelViewer
              length={length}
              colorHex={selectedColor.hex}
              faceYaw={trackingEnabled ? faceYaw : undefined}
              faceRoll={trackingEnabled ? faceRoll : undefined}
              disablePan
            />
          </View>
        );
      })()}

      {/* Full-screen invisible gesture layer — captures 2-finger pinch/drag
          anywhere on the camera view. Sits BELOW UI (z=6) so the top header,
          bottom panel, and right rail buttons remain tappable. */}
      <View
        {...panResponder.panHandlers}
        style={styles.gestureLayer}
      />

      <View style={[styles.topHeader, { paddingTop: insets.top + vs(8) }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={ms(22)} color="#fff" />
        </TouchableOpacity>
        <View style={styles.brandTitleWrap}>
          <Text style={styles.brandTitle}>HairLink AR</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setFavorite(f => !f)}
          style={styles.heartBtnOuter}
        >
          <LinearGradient
            colors={['#9B5BFF', '#FF379B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heartBtnInner}
          >
            <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={ms(20)} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={[styles.statusPillWrap, { top: insets.top + vs(60) }]}>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: overlayBox ? '#3DE07A' : '#F59E0B' }]} />
          <Text style={styles.statusText}>
            {overlayBox ? 'Tracking' : 'Searching for face'} · {length === 'short' ? 'Short' : 'Long'} · {selectedColor.name}
          </Text>
          <View style={styles.badge3D}>
            <Text style={styles.badge3DText}>AR</Text>
          </View>
        </View>

        {/* Debug HUD — live screen-space numbers for tuning */}
        <View style={styles.debugPanel}>
          <Text style={styles.debugText}>
            box   X:{overlayBox ? overlayBox.x.toFixed(0) : '—'}  Y:{overlayBox ? overlayBox.y.toFixed(0) : '—'}  W:{overlayBox ? overlayBox.w.toFixed(0) : '—'}  H:{overlayBox ? overlayBox.h.toFixed(0) : '—'}
          </Text>
          <Text style={styles.debugText}>
            user  scale:{scale.toFixed(2)}  offX:{offsetX.toFixed(0)}  offY:{offsetY.toFixed(0)}
          </Text>
          <Text style={styles.debugText}>
            head  yaw:{((faceYaw * 180) / Math.PI).toFixed(0)}°  roll:{((faceRoll * 180) / Math.PI).toFixed(0)}°
          </Text>
        </View>
      </View>

      <View style={[styles.rightRail, { top: insets.top + vs(130) }]}>
        <TouchableOpacity
          style={styles.railBtn}
          onPress={() => setFacing(c => (c === 'back' ? 'front' : 'back'))}
        >
          <MaterialCommunityIcons name="camera-flip-outline" size={ms(20)} color="#fff" />
        </TouchableOpacity>
        {(scale !== 1 || offsetX !== 0 || offsetY !== 0) && (
          <TouchableOpacity
            style={[styles.railBtn, styles.railBtnActive]}
            onPress={resetAdjustments}
          >
            <MaterialCommunityIcons name="restore" size={ms(20)} color="#FF8DC1" />
          </TouchableOpacity>
        )}
        {/* Tracking toggle — centered vs face-follow */}
        <TouchableOpacity
          style={[styles.railBtn, trackingEnabled && styles.railBtnActive]}
          onPress={() => setTrackingEnabled(t => !t)}
        >
          <MaterialCommunityIcons
            name={trackingEnabled ? 'face-recognition' : 'image-frame'}
            size={ms(20)}
            color={trackingEnabled ? '#FF8DC1' : '#fff'}
          />
        </TouchableOpacity>

        {/* Spacer */}
        <View style={{ height: vs(8) }} />

        {/* Size + / − — anchored to top of wig so head stays inside */}
        <TouchableOpacity style={styles.railBtn} onPress={() => bumpScale(0.15)}>
          <Ionicons name="add" size={ms(20)} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.railBtn} onPress={() => bumpScale(-0.15)}>
          <Ionicons name="remove" size={ms(20)} color="#fff" />
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
        style={[styles.bottomPanel, { paddingBottom: insets.bottom + vs(18) }]}
      >
        <View style={styles.colorRow}>
          {COLORS.map(c => {
            const isActive = c.id === selectedColor.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedColor(c)}
                activeOpacity={0.85}
                style={styles.colorTouch}
              >
                {isActive && (
                  <LinearGradient
                    colors={['#FF379B', '#9B5BFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.colorRing}
                  />
                )}
                <View style={[
                  styles.colorSwatch,
                  { backgroundColor: c.hex },
                  isActive && styles.colorSwatchActive,
                ]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.lengthRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setLength('short')}
            style={[styles.shortBtn, length === 'short' && styles.shortBtnActive]}
          >
            {length === 'short' ? (
              <LinearGradient
                colors={['#FF379B', '#9B5BFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <Text style={[styles.lengthBtnText, length === 'short' && styles.lengthBtnTextActive]}>
              Short
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setLength('long')}
            style={[styles.longBtn, length === 'long' && styles.longBtnActive]}
          >
            {length === 'long' ? (
              <LinearGradient
                colors={['#FF379B', '#9B5BFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: ms(28) }]}
              />
            ) : null}
            <Text style={[styles.lengthBtnText, length === 'long' && styles.lengthBtnTextActive]}>
              Long
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={takePicture}
          disabled={isCapturing}
          activeOpacity={0.85}
          style={styles.shutterOuter}
        >
          <LinearGradient
            colors={isCapturing ? ['#888', '#aaa'] : ['#FF379B', '#9B5BFF']}
            style={styles.shutterGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isCapturing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="camera" size={ms(30)} color="#fff" />
            }
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      <Modal
        visible={!!preview}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setPreview(null)}
      >
        <View style={styles.previewBackdrop}>
          <LinearGradient colors={['#0d0308', '#1a0512']} style={StyleSheet.absoluteFill} />
          <View style={[styles.previewHeader, { paddingTop: insets.top + vs(10) }]}>
            <TouchableOpacity onPress={() => setPreview(null)} style={styles.previewClose}>
              <Ionicons name="chevron-down" size={ms(24)} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.previewHeaderTitle}>Saved to Gallery</Text>
            <View style={{ width: ms(40) }} />
          </View>
          {preview && (
            <View style={styles.previewImgWrap}>
              <Image source={{ uri: preview }} style={styles.previewImg} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.previewImgOverlay}>
                <View style={styles.previewStyleTag}>
                  <Ionicons name="checkmark-circle" size={ms(12)} color="#3DE07A" />
                  <Text style={styles.previewStyleTagText}>
                    Saved · {length === 'short' ? 'Short' : 'Long'} · {selectedColor.name}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}
          <View style={[styles.previewActions, { paddingBottom: insets.bottom + vs(20) }]}>
            <TouchableOpacity style={styles.previewBtnSolid} onPress={() => setPreview(null)}>
              <LinearGradient
                colors={['#FF379B', '#9B5BFF']}
                style={styles.previewBtnSolidInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="camera" size={ms(16)} color="#fff" style={{ marginRight: ms(6) }} />
                <Text style={styles.previewBtnSolidText}>Take Another</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: ms(28), backgroundColor: '#0d0308' },
  loadingText: { marginTop: vs(12), color: '#FF379B', fontWeight: '700', fontSize: ms(13) },
  deniedIconWrap: { width: ms(96), height: ms(96), borderRadius: ms(48), backgroundColor: 'rgba(255,55,155,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: vs(20), borderWidth: 1.5, borderColor: 'rgba(255,55,155,0.3)' },
  deniedTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff', marginBottom: vs(10) },
  deniedDesc: { fontSize: ms(13), color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: ms(21), marginBottom: vs(28) },
  grantBtn: { width: '80%', borderRadius: ms(30), overflow: 'hidden' },
  grantBtnInner: { paddingVertical: vs(14), alignItems: 'center', justifyContent: 'center', borderRadius: ms(30) },
  grantBtnText: { color: '#fff', fontWeight: '900', fontSize: ms(15), letterSpacing: 0.5 },
  backLinkText: { color: 'rgba(255,255,255,0.45)', fontWeight: '700', fontSize: ms(13) },
  modelOverlay: { position: 'absolute', top: '8%', left: 0, right: 0, height: '55%', zIndex: 5 },
  gestureLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 6,
    // BG must be transparent but non-undefined so RN actually creates a
    // hit-test region; backgroundColor:'transparent' works on both platforms.
    backgroundColor: 'transparent',
  },
  topHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ms(16), zIndex: 20 },
  closeBtn: { width: ms(36), height: ms(36), borderRadius: ms(18), backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  brandTitleWrap: { flex: 1, alignItems: 'flex-start', paddingLeft: ms(8) },
  brandTitle: { color: '#C77BFF', fontSize: ms(26), fontWeight: '900', letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heartBtnOuter: { width: ms(60), height: ms(34), borderRadius: ms(17), overflow: 'hidden' },
  heartBtnInner: { flex: 1, borderRadius: ms(17), alignItems: 'center', justifyContent: 'center' },
  statusPillWrap: { position: 'absolute', left: ms(16), right: ms(16), zIndex: 20 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.78)', borderRadius: ms(20), paddingHorizontal: ms(14), paddingVertical: vs(8), borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statusDot: { width: ms(8), height: ms(8), borderRadius: ms(4), marginRight: ms(10) },
  statusText: { color: '#fff', fontSize: ms(12), fontWeight: '700', flex: 1 },
  badge3D: { backgroundColor: 'rgba(255,55,155,0.25)', borderRadius: ms(10), paddingHorizontal: ms(8), paddingVertical: vs(2), borderWidth: 1, borderColor: 'rgba(255,55,155,0.5)' },
  badge3DText: { color: '#FF8DC1', fontSize: ms(10), fontWeight: '900', letterSpacing: 0.5 },
  debugPanel: {
    marginTop: vs(6),
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: ms(10),
    paddingVertical: vs(6),
    borderRadius: ms(8),
    borderWidth: 1,
    borderColor: 'rgba(255,55,155,0.35)',
  },
  debugText: {
    color: '#FFD3E8',
    fontSize: ms(10),
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rightRail: { position: 'absolute', right: ms(12), gap: vs(10), zIndex: 20 },
  railBtn: { width: ms(38), height: ms(38), borderRadius: ms(19), backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  railBtnActive: { backgroundColor: 'rgba(255,55,155,0.18)', borderColor: 'rgba(255,55,155,0.55)' },
  bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, paddingTop: vs(28), paddingHorizontal: ms(20), alignItems: 'center' },
  colorRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: ms(18), marginBottom: vs(20) },
  colorTouch: { width: ms(50), height: ms(50), alignItems: 'center', justifyContent: 'center', position: 'relative' },
  colorRing: { position: 'absolute', width: ms(50), height: ms(50), borderRadius: ms(25) },
  colorSwatch: { width: ms(40), height: ms(40), borderRadius: ms(20), borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  colorSwatchActive: { borderWidth: 2, borderColor: '#0d0308' },
  lengthRow: { flexDirection: 'row', alignItems: 'center', gap: ms(14), marginBottom: vs(18) },
  shortBtn: { width: ms(72), height: ms(56), borderRadius: ms(36), backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shortBtnActive: { borderColor: 'transparent' },
  longBtn: { paddingHorizontal: ms(32), height: ms(56), borderRadius: ms(28), backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  longBtnActive: { borderColor: 'transparent' },
  lengthBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: ms(15), fontWeight: '800', letterSpacing: 0.3 },
  lengthBtnTextActive: { color: '#fff' },
  shutterOuter: { width: ms(72), height: ms(72), borderRadius: ms(36), borderWidth: 3, borderColor: '#fff', padding: ms(4), shadowColor: '#FF379B', shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  shutterGradient: { flex: 1, borderRadius: ms(30), alignItems: 'center', justifyContent: 'center' },
  previewBackdrop: { flex: 1, backgroundColor: '#0d0308' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ms(16), paddingBottom: vs(12) },
  previewClose: { width: ms(40), height: ms(40), borderRadius: ms(20), backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  previewHeaderTitle: { color: '#fff', fontSize: ms(16), fontWeight: '900', letterSpacing: 0.3 },
  previewImgWrap: { marginHorizontal: ms(16), borderRadius: ms(24), overflow: 'hidden', flex: 1, maxHeight: SCREEN_H * 0.62 },
  previewImg: { width: '100%', height: '100%', backgroundColor: '#000' },
  previewImgOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: ms(14) },
  previewStyleTag: { flexDirection: 'row', alignItems: 'center', gap: ms(5), alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: ms(20), paddingHorizontal: ms(10), paddingVertical: vs(5), borderWidth: 1, borderColor: 'rgba(61,224,122,0.5)' },
  previewStyleTagText: { color: '#fff', fontSize: ms(11), fontWeight: '700' },
  previewActions: { flexDirection: 'row', gap: ms(12), paddingHorizontal: ms(20), paddingTop: vs(16) },
  previewBtnSolid: { flex: 1, borderRadius: ms(14), overflow: 'hidden' },
  previewBtnSolidInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: vs(14), borderRadius: ms(14) },
  previewBtnSolidText: { color: '#fff', fontWeight: '900', fontSize: ms(14) },
});
