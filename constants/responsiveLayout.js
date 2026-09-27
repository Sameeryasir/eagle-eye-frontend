import { useWindowDimensions, PixelRatio } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const shortest = Math.min(width, height);
  const isSmallPhone = shortest < 360;
  const isCompactHeight = height < 700;
  const isTablet = shortest >= 600;

  const scale = clamp(width / 390, 0.82, isTablet ? 1.08 : 1.05);

  const rs = (size) =>
    Math.round(PixelRatio.roundToNearestPixel(size * scale));

  const horizontalPad = clamp(width * 0.06, isSmallPhone ? 16 : 20, 32);
  const contentWidth = Math.min(width - horizontalPad * 2, isTablet ? 480 : 420);

  return {
    width,
    height,
    insets,
    scale,
    rs,
    isSmallPhone,
    isCompactHeight,
    isTablet,
    horizontalPad,
    contentWidth,
    titleSize: rs(isSmallPhone ? 26 : 30),
    subtitleSize: rs(isSmallPhone ? 13.5 : 15),
    bodySize: rs(16),
    labelSize: rs(11.5),
    captionSize: rs(12),
    buttonTextSize: rs(16),
    inputHeight: rs(isCompactHeight ? 48 : 52),
    buttonPadY: rs(isCompactHeight ? 14 : 16),
    fieldGap: rs(isCompactHeight ? 14 : 18),
    sectionGap: rs(isCompactHeight ? 20 : 28),
    radius: rs(10),
    hitSize: rs(44),
    iconSize: rs(22),
    stackFields: width < 360,
  };
}
