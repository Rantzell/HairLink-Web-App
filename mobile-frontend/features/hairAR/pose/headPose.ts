import type { HeadPose } from '../types';

/**
 * Convert MediaPipe FaceLandmarker's 4x4 facial transformation matrix into
 * pitch/yaw/roll Euler angles (radians).
 *
 * MediaPipe returns the matrix row-major in `data` (length 16). We read the
 * upper-left 3x3 rotation block and extract Tait–Bryan angles (YXZ order works
 * well for heads: yaw about Y, pitch about X, roll about Z).
 */
export function matrixToPose(data: number[] | Float32Array): HeadPose {
  // row-major indices
  const r00 = data[0], r01 = data[1], r02 = data[2];
  const r10 = data[4], r11 = data[5], r12 = data[6];
  const r20 = data[8], r21 = data[9], r22 = data[10];

  let pitch: number, yaw: number, roll: number;
  // guard against gimbal lock near ±90° yaw
  const sy = -r20;
  if (Math.abs(sy) < 0.9999) {
    yaw = Math.asin(Math.max(-1, Math.min(1, sy)));
    pitch = Math.atan2(r21, r22);
    roll = Math.atan2(r10, r00);
  } else {
    yaw = Math.asin(Math.max(-1, Math.min(1, sy)));
    pitch = Math.atan2(-r12, r11);
    roll = 0;
  }
  return { pitch, yaw, roll };
}

/**
 * Fallback pose estimate from raw landmarks when the transformation matrix
 * isn't available. Uses temples (234/454), nose tip (1) and forehead (10).
 */
export function poseFromLandmarks(
  lm: { x: number; y: number; z: number }[],
): HeadPose {
  const L = lm[234], R = lm[454], N = lm[1], F = lm[10], C = lm[152];
  const midX = (L.x + R.x) / 2;
  const midY = (L.y + R.y) / 2;
  const faceW = Math.hypot(R.x - L.x, R.y - L.y) || 1e-3;

  const roll = Math.atan2(R.y - L.y, R.x - L.x);
  // nose horizontal offset vs. temple-midpoint → yaw
  const yaw = Math.atan2((N.x - midX), faceW / 2);
  // nose vertical offset vs. forehead↔chin midline → pitch
  const faceH = Math.hypot(C.x - F.x, C.y - F.y) || 1e-3;
  const pitch = Math.atan2((N.y - midY), faceH / 2) - 0.15;

  return { pitch, yaw, roll };
}

const DEG = 180 / Math.PI;
export const toDeg = (r: number) => r * DEG;
