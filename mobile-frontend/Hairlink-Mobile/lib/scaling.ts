import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Baseline sizes (iPhone 13)
const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

/**
 * Scaled width based on device screen width
 */
const horizontalScale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

/**
 * Scaled height based on device screen height
 */
const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

/**
 * Moderate scaling for cases where full scaling might be too aggressive (fonts, padding)
 * @param factor default 0.5
 */
const moderateScale = (size: number, factor = 0.5) => size + (horizontalScale(size) - size) * factor;

/**
 * Responsive Size shorthand (horizontal)
 */
export const s = horizontalScale;

/**
 * Vertical Size shorthand
 */
export const vs = verticalScale;

/**
 * Moderate Scale shorthand (useful for font sizes & margins)
 */
export const ms = moderateScale;

/**
 * Screen dimensions helpers
 */
export const metrics = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmallDevice: SCREEN_WIDTH < 375,
  isAndroid: Platform.OS === 'android',
  isIOS: Platform.OS === 'ios',
};
