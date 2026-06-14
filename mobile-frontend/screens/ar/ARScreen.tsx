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
import { buildArHtml } from './arHtml';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const SHORT_HAIR_MODULE = require('../../assets/ar/ShortHair.glb');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LONG_HAIR_MODULE = require('../../assets/ar/LongHair.glb');

type StyleId = 'short' | 'long';
type ColorId = 'black' | 'brown' | 'light';

const COLORS: { id: ColorId; name: string; hex: string }[] = [
  { id: 'black', name: 'Black', hex: '#33312f' },
  { id: 'brown', name: 'Brown', hex: '#5a3320' },
  { id: 'light', name: 'Light', hex: '#c9a37a' },
];

export default function ARScreen({ onBack }: { onBack: () => void }) {
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
    return buildArHtml({
      shortB64,
      longB64,
      initialStyle: style,
      initialColor: colorHex,
    });
  }, [assetsReady, shortB64, longB64]);

  const post = (payload: object) => {
    const data = JSON.stringify(payload).replace(/'/g, "\\'");
    webRef.current?.injectJavaScript(
      `(function(){try{window.dispatchEvent(new MessageEvent('message',{data:'${data}'}));}catch(e){}})();true;`,
    );
  };

  const pickStyle = (s: StyleId) => { setStyle(s); post({ type: 'setStyle', value: s }); };
  const pickColor = (id: ColorId) => {
    setColorId(id);
    const hex = COLORS.find((c) => c.id === id)?.hex ?? COLORS[0].hex;
    post({ type: 'setColor', value: hex });
  };
  const flipCamera  = () => post({ type: 'flipCamera' });
  const capture     = () => post({ type: 'capture' });

  const saveCapture = async (dataUri: string) => {
    try {
      const base64 = dataUri.split(',')[1];
      if (!base64) return;
      const path = `${FileSystem.cacheDirectory}hairlink-tryon-${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'image/jpeg', dialogTitle: 'Save AR Try-On' });
      } else {
        Alert.alert('Saved', `Captured to ${path}`);
      }
    } catch (e: any) {
      Alert.alert('Capture failed', e?.message ?? String(e));
    }
  };

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') setWebReady(true);
      else if (msg.type === 'error') { setErrorMsg(msg.message); setWebReady(true); }
      else if (msg.type === 'capture' && typeof msg.dataUri === 'string') saveCapture(msg.dataUri);
    } catch {}
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
              Alert.alert(
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
      {html ? (
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          allowsFullscreenVideo
          androidLayerType="hardware"
          onMessage={onMessage}
          source={{ html, baseUrl: 'https://localhost' }}
          style={styles.web}
        />
      ) : null}

      {!webReady && !errorMsg ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color="#ff4d8d" size="large" />
        </View>
      ) : null}

      {errorMsg ? (
        <View style={[styles.errorBox, { top: insets.top + 64 }]}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <Pressable onPress={onBack} style={[styles.backBtn, { top: insets.top + 10 }]} hitSlop={12}>
        <Ionicons name="chevron-back" size={18} color="white" />
      </Pressable>

      <View style={[styles.topRightStack, { top: insets.top + 10 }]}>
        <Pressable onPress={flipCamera} style={styles.iconBtn} hitSlop={12}>
          <Ionicons name="camera-reverse" size={18} color="white" />
        </Pressable>
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 18 }]} pointerEvents="box-none">
        {/* Pink capture button */}
        <Pressable onPress={capture} style={styles.captureBtn} hitSlop={10}>
          <View style={styles.captureInner} />
        </Pressable>

        {/* Style toggle — sits below the capture, above the colors */}
        <View style={styles.styleToggle}>
          {(['short', 'long'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => pickStyle(s)}
              style={[styles.segment, style === s && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, style === s && styles.segmentTextActive]}>
                {s === 'short' ? 'Short' : 'Long'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Color choices */}
        <View style={styles.colorRow}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  web: { flex: 1, backgroundColor: '#000' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  errorBox: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(200,40,40,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    maxWidth: '88%',
  },
  errorText: { color: 'white', fontSize: 13, textAlign: 'center' },
  backBtn: {
    position: 'absolute',
    left: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  topRightStack: {
    position: 'absolute',
    right: 14,
    flexDirection: 'column',
    gap: 8,
    zIndex: 5,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: 10,
    gap: 9,
    zIndex: 5,
  },
  styleToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20,20,20,0.55)',
    borderRadius: 18,
    padding: 3,
  },
  segment: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 15 },
  segmentActive: { backgroundColor: '#fff' },
  segmentText: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 12 },
  segmentTextActive: { color: '#111' },
  captureBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,77,141,0.22)',
    borderWidth: 3,
    borderColor: '#ff4d8d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ff4d8d' },
  colorRow: { flexDirection: 'row', alignItems: 'center' },
  swatchWrap: { alignItems: 'center', marginHorizontal: 9 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  swatchActive: { borderColor: 'white', borderWidth: 2.5 },
  swatchLabel: { color: 'white', fontSize: 9, marginTop: 3 },
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
