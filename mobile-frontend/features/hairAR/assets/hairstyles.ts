import type { Hairstyle } from '../types';

/**
 * Hairstyle catalog for the AR try-on carousel.
 *
 * ── To add a new hairstyle ──────────────────────────────────────────────
 * 1. Drop 3 transparent, hair-only PNGs in `assets/ar/hair/`:
 *      <id>-front.png, <id>-left.png, <id>-right.png
 *    (left/right are ¾ views; if you only have a front, point all three at it.)
 * 2. Append an entry below. Tune anchorY / widthMult / yOffset once on-device
 *    using the debug sliders (long-press the preview to reveal them).
 * ────────────────────────────────────────────────────────────────────────
 */
export const HAIRSTYLES: Hairstyle[] = [
  {
    id: 'short-black',
    name: 'Short',
    assets: {
      front: require('../../../assets/ar/hair/short-front.png'),
      left: require('../../../assets/ar/hair/short-left.png'),
      right: require('../../../assets/ar/hair/short-right.png'),
    },
    anchorY: 0.58,
    widthMult: 2.05,
    yOffset: -0.2,
    swapYawDeg: 18,
  },
];

export const DEFAULT_HAIRSTYLE_ID = HAIRSTYLES[0].id;
