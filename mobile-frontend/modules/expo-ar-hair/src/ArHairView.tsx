import { requireNativeView } from 'expo';
import * as React from 'react';
import { ViewProps } from 'react-native';

export type StyleId = 'short' | 'long';

export type ArHairViewProps = ViewProps & {
  style?: any;
  hairStyle: StyleId;
  color: string;
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
  scale?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  onReady?: (e: { nativeEvent: { ok: boolean } }) => void;
  onError?: (e: { nativeEvent: { message: string } }) => void;
  onCapture?: (e: { nativeEvent: { dataUri: string } }) => void;
  onTracking?: (e: { nativeEvent: { tracking: boolean } }) => void;
};

export type ArHairViewRef = {
  capture: () => Promise<void>;
  flipCamera: () => Promise<void>;
};

// The native view name MUST match the C++ codegen name used by Expo Modules,
// which derives from `View(ExpoArHairView::class)` → "ExpoArHairView".
const NativeView: React.ComponentType<any> = requireNativeView('ExpoArHair');

const ArHairView = React.forwardRef<ArHairViewRef, ArHairViewProps>((props, ref) => {
  const nativeRef = React.useRef<any>(null);

  React.useImperativeHandle(ref, () => ({
    capture: async () => nativeRef.current?.capture?.(),
    flipCamera: async () => nativeRef.current?.flipCamera?.(),
  }));

  return (
    <NativeView
      ref={nativeRef}
      style={props.style}
      // @ts-ignore — native-only prop registered in ExpoArHairModule
      hairStyle={props.hairStyle}
      color={props.color}
      offsetX={props.offsetX ?? 0}
      offsetY={props.offsetY ?? 0}
      offsetZ={props.offsetZ ?? 0}
      scale={props.scale ?? 1}
      rotX={props.rotX ?? 0}
      rotY={props.rotY ?? 0}
      rotZ={props.rotZ ?? 0}
      onReady={props.onReady}
      onError={props.onError}
      onCapture={props.onCapture}
      onTracking={props.onTracking}
    />
  );
});

ArHairView.displayName = 'ArHairView';
export default ArHairView;
