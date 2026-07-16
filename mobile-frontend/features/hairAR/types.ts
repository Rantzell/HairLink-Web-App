/** Shared types for the native 2.5D hair AR feature. */

export type Vec2 = { x: number; y: number };

/** Head pose in radians (camera space). */
export type HeadPose = {
  pitch: number; // nod (up/down)
  yaw: number; // turn (left/right)
  roll: number; // tilt (ear to shoulder)
};

/** Everything the renderer needs to place hair for one frame. */
export type FaceFrame = {
  /** Screen-space anchor where the hairline sits (between the temples). */
  anchor: Vec2;
  /** Temple-to-temple distance in px — drives hair scale. */
  faceWidth: number;
  pose: HeadPose;
  /** True while a face is present this frame. */
  hasFace: boolean;
  /** Frame timestamp in seconds. */
  t: number;
};

/** Which artwork variant to show, chosen by yaw. */
export type HairView = 'front' | 'left' | 'right';

/** A hairstyle definition. Add new styles by appending to HAIRSTYLES. */
export type Hairstyle = {
  id: string;
  name: string;
  /** require()'d PNG modules, transparent, hair-only. */
  assets: Record<HairView, number>;
  /** Fraction down the image that lands on the hairline anchor (0..1). */
  anchorY: number;
  /** Hair width as a multiple of face width. */
  widthMult: number;
  /** Extra vertical nudge as a fraction of face width (− = up). */
  yOffset: number;
  /** Yaw (deg) past which we swap to the ¾ side art. */
  swapYawDeg: number;
};
