// Ambient declarations for local Expo native modules under `modules/`.
// Their JS/native is resolved by expo-modules-autolinking at build & runtime,
// but they are not installed in `node_modules`, so `tsc --noEmit` cannot find
// their type declarations. These shims keep type-checking clean without
// affecting the Metro bundle or runtime behaviour.
declare module 'expo-face-tracker' {
  import type { ComponentType } from 'react';
  export type FaceData = any;
  export const FaceTrackerView: ComponentType<any>;
  const _default: any;
  export default _default;
}
