import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

/**
 * Stage 1a — validate the VisionCamera preview renders on this device.
 *
 * This replaces the custom expo-face-tracker camera (whose CameraX preview
 * stayed black on this MediaTek phone). Once the preview is confirmed, we add:
 *   - face detection frame processor (pose + landmarks),
 *   - One Euro smoothing,
 *   - Skia hair overlay,
 *   - selfie-segmentation occlusion.
 */
export default function HairARNative(_props: { styleId?: string }) {
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission needed…</Text>
      </View>
    );
  }
  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No front camera found</Text>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  text: { color: '#fff', fontSize: 15 },
});
