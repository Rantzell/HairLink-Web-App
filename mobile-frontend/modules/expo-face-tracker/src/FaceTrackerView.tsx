import { requireNativeView } from 'expo';
import * as React from 'react';
import { ViewProps } from 'react-native';

export type FaceLandmark = {
  type: 'leftEye' | 'rightEye' | 'noseBase' | 'mouthBottom' | 'mouthLeft' | 'mouthRight' | 'leftEar' | 'rightEar' | 'leftCheek' | 'rightCheek';
  x: number; // normalized 0..1 within preview
  y: number; // normalized 0..1 within preview
};

export type FaceData = {
  // Bounding box, normalized to 0..1 within the preview surface.
  boxLeft: number;
  boxTop: number;
  boxWidth: number;
  boxHeight: number;
  // Head Euler angles in degrees, ML Kit convention.
  eulerX: number; // pitch — up/down nod
  eulerY: number; // yaw — left/right turn
  eulerZ: number; // roll — head tilt
  // ML Kit returns 0..1 (no probability) for unspecified detector settings;
  // a value of -1 means the field wasn't computed for this frame.
  smilingProbability: number;
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
  landmarks: FaceLandmark[];
};

export type FaceTrackerViewProps = ViewProps & {
  style?: any;
  // Stream of face detection results, ~25-30 fps on a modern mid-range device.
  onFace?: (e: { nativeEvent: FaceData }) => void;
  // Surfaced when no face is currently tracked (debounced).
  onFaceLost?: (e: { nativeEvent: {} }) => void;
  // Fatal initialization failures (camera permission, ML Kit init, etc.).
  onError?: (e: { nativeEvent: { message: string } }) => void;
};

// Match the Expo Module's Name() declaration (ExpoFaceTrackerView in native).
const NativeView: React.ComponentType<any> = requireNativeView('ExpoFaceTracker');

const FaceTrackerView = React.forwardRef<any, FaceTrackerViewProps>((props, ref) => {
  return (
    <NativeView
      ref={ref}
      style={props.style}
      onFace={props.onFace}
      onFaceLost={props.onFaceLost}
      onError={props.onError}
    />
  );
});

FaceTrackerView.displayName = 'FaceTrackerView';
export default FaceTrackerView;
