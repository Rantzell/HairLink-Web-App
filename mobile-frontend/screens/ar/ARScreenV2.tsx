import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
// eslint-disable-next-line import/no-unresolved
import { FaceTrackerView, FaceData } from 'expo-face-tracker';
import { buildArHtmlHybrid } from './arHtmlHybrid';
import { CustomAlert } from '../../components/GlobalAlert';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const SHORT_HAIR_MODULE = require('../../assets/ar/ShortHair.glb');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LONG_HAIR_MODULE = require('../../assets/ar/LongHair.glb');

type StyleId = 'short' | 'long';
type ColorId = 'black' | 'brown' | 'light';

const COLORS: { id: ColorId; name: string; hex: string }[] = [
  { id: 'black', name: 'Black', hex: '#1a1a1a' },
  { id: 'brown', name: 'Brown', hex: '#5a3320' },
  { id: 'light', name: 'Light', hex: '#c9a37a' },
];

/**
 * Hybrid AR Try-On — native CameraX + ML Kit face tracking under a transparent
 * three.js WebView overlay. Native pose events flow through JS into the WebView
 * via injectJavaScript.
 *
 * Layered top-to-bottom (z-order):
 *   - UI chrome (Pressables for style/color/back/capture)         z = 5
 *   - Transparent WebView (three.js hair render)                  z = 1
 *   - Native FaceTrackerView (camera preview + ML Kit)            z = 0
 */
export default function ARScreenV2({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [assetsReady, setAssetsReady] = useState(false);
  const [shortB64, setShortB64] = useState<string>('');
  const [longB64, setLongB64] = useState<string>('');

  const [style, setStyle] = useState<StyleId>('short');
  const [colorId, setColorId] = useState<ColorId>('black');
  const [webReady, setWebReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const colorHex = useMemo(
    () => COLORS.find((c) => c.id === colorId)?.hex ?? COLORS[0].hex,
    [colorId],
  );

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // Resolve bundled GLBs to base64 — fed to the WebView once at mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [shortAsset, longAsset] = await Promise.all([
          Asset.fromModule(SHORT_HAIR_MODULE).downloadAsync(),
          Asset.fromModule(LONG_HAIR_MODULE).downloadAsync(),
        ]);
        const shortUri = shortAsset.localUri || shortAsset.uri;
        const longUri = longAsset.localUri || longAsset.uri;
        const [s, l] = await Promise.all([
          FileSystem.readAsStringAsync(shortUri, { encoding: FileSystem.EncodingType.Base64 }),
          FileSystem.readAsStringAsync(longUri, { encoding: FileSystem.EncodingType.Base64 }),
        ]);
        if (cancelled) return;
        setShortB64(s);
        setLongB64(l);
        setAssetsReady(true);
      } catch (e: any) {
        if (!cancelled) setErrorMsg('Failed to load hair models: ' + (e?.message ?? String(e)));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const html = useMemo(() => {
    if (!assetsReady) return '';
    return buildArHtmlHybrid({
      shortB64,
      longB64,
      initialStyle: style,
      initialColor: colorHex,
    });
  }, [assetsReady, shortB64, longB64]);

  // Each native onFace event is forwarded into the WebView's three.js loop.
  // We inject JavaScript directly rather than the postMessage round-trip
  // through onMessage, because at 30fps the round-trip latency was visibly
  // lagging the head pose. injectJavaScript runs on the WebView's JS thread
  // and is roughly 2x faster end-to-end.
  const post = (payload: object) => {
    const data = JSON.stringify(payload).replace(/'/g, "\\'").replace(/\\/g, "\\\\");
    webRef.current?.injectJavaScript(
      `(function(){try{window.dispatchEvent(new MessageEvent('message',{data:'${data}'}));}catch(e){}})();true;`,
    );
  };

  const onFace = (e: { nativeEvent: FaceData }) => {
    post({ type: 'face', ...e.nativeEvent });
  };
  const onFaceLost = () => post({ type: 'faceLost' });
  const onTrackerError = (e: { nativeEvent: { message: string } }) => {
    setErrorMsg(e.nativeEvent.message);
  };

  const pickStyle = (s: StyleId) => { setStyle(s); post({ type: 'setStyle', value: s }); };
  const pickColor = (id: ColorId) => {
    setColorId(id);
    const hex = COLORS.find((c) => c.id === id)?.hex ?? COLORS[0].hex;
    post({ type: 'setColor', value: hex });
  };
  const capture = () => post({ type: 'capture' });

  const saveCapture = async (dataUri: string) => {
    try {
      const base64 = dataUri.split(',')[1];
      if (!base64) return;
      const path = `${FileSystem.cacheDirectory}hairlink-tryon-${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'image/png', dialogTitle: 'Save AR Try-On' });
      } else {
        CustomAlert.alert('Saved', `Captured to ${path}`);
      }
    } catch (e: any) {
      CustomAlert.alert('Capture failed', e?.message ?? String(e));
    }
  };

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') setWebReady(true);
      else if (msg.type === 'error') { setErrorMsg(msg.message); setWebReady(true); }
      else if (msg.type === 'capture' && typeof msg.dataUri === 'string') saveCapture(msg.dataUri);
    } catch { /* ignore */ }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="camera-outline" size={60} color="white" />
        <Text style={styles.permTitle}>Camera permission needed</Text>
        <Text style={styles.permBody}>
          HairLink AR needs your camera to virtually try on wig styles.
        </Text>
        <Pressable
          style={styles.permButton}
          onPress={async () => {
            const res = await requestPermission();
            if (!res.granted && !res.canAskAgain) {
              CustomAlert.alert(
                'Permission blocked',
                'Enable camera access in system Settings to use AR Try-On.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ],
              );
            }
          }}
        >
          <Text style={styles.permButtonText}>Allow Camera</Text>
        </Pressable>
        <Pressable style={styles.permBack} onPress={onBack}>
          <Text style={styles.permBackText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Native camera + face tracker (bottom layer) */}
      <FaceTrackerView
        style={StyleSheet.absoluteFill}
        onFace={onFace}
        onFaceLost={onFaceLost}
        onError={onTrackerError}
      />

      {/* Transparent WebView with three.js hair render (middle layer) */}
      {html ? (
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          androidLayerType="hardware"
          onMessage={onMessage}
          // backgroundColor='transparent' is supported by react-native-webview;
          // we also set both style + containerStyle for Android consistency.
          style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
          containerStyle={{ backgroundColor: 'transparent' }}
          source={{ html, baseUrl: 'https://localhost' }}
        />
      ) : null}

      {/* Loading overlay until both assets and WebView are ready */}
      {!webReady && !errorMsg ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color="white" size="large" />
          <Text style={styles.loaderText}>
            {assetsReady ? 'Initializing AR…' : 'Loading hair models…'}
          </Text>
        </View>
      ) : null}

      {errorMsg ? (
        <View style={[styles.errorBox, { top: insets.top + 64 }]}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {}
      <Pressable onPress={onBack} style={[styles.backBtn, { top: insets.top + 12 }]} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color="white" />
      </Pressable>

      <Pressable
        onPress={capture}
        style={[styles.captureBtn, { bottom: insets.bottom + 110 }]}
        hitSlop={10}
      >
        <View style={styles.captureInner} />
      </Pressable>

      <View style={[styles.styleRow, { top: insets.top + 12 }]}>
        {(['short', 'long'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => pickStyle(s)}
            style={[styles.pill, style === s && styles.pillActive]}
          >
            <Text style={[styles.pillText, style === s && styles.pillTextActive]}>
              {s === 'short' ? 'Short' : 'Long'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.colorRow, { bottom: insets.bottom + 36 }]}>
        {COLORS.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => pickColor(c.id)}
            style={styles.swatchWrap}
            hitSlop={8}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: c.hex },
                colorId === c.id && styles.swatchActive,
              ]}
            />
            <Text style={styles.swatchLabel}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  loaderText: { color: 'white', marginTop: 12, fontSize: 14 },
  errorBox: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(200,40,40,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    maxWidth: '88%',
    zIndex: 10,
  },
  errorText: { color: 'white', fontSize: 13, textAlign: 'center' },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  captureBtn: {
    position: 'absolute',
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 3,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'white' },
  styleRow: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', zIndex: 4 },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    marginHorizontal: 4,
  },
  pillActive: { backgroundColor: 'rgba(255,255,255,0.95)' },
  pillText: { color: 'white', fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#111' },
  colorRow: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', zIndex: 4 },
  swatchWrap: { alignItems: 'center', marginHorizontal: 14 },
  swatch: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  swatchActive: { borderColor: 'white', borderWidth: 3 },
  swatchLabel: { color: 'white', fontSize: 11, marginTop: 6 },
  permTitle: { color: 'white', fontSize: 18, fontWeight: '600', marginTop: 18 },
  permBody: {
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  permButton: {
    backgroundColor: '#ff4d8d',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  permButtonText: { color: 'white', fontWeight: '600' },
  permBack: { marginTop: 14, padding: 8 },
  permBackText: { color: 'rgba(255,255,255,0.7)' },
});
