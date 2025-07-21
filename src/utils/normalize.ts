import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const widthBaseScale = SCREEN_WIDTH / 375;
const heightBaseScale = SCREEN_HEIGHT / 812;

export function normalize(size: number) {
  const newSize = size * widthBaseScale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export function normalizeVertical(size: number) {
  const newSize = size * heightBaseScale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export const SCREEN = {
  WIDTH: SCREEN_WIDTH,
  HEIGHT: SCREEN_HEIGHT
};