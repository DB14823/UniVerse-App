import { requireNativeViewManager } from "expo-modules-core";
import { ViewProps } from "react-native";

export interface LiquidGlassSurfaceProps extends ViewProps {
  cornerRadius?: number;
}

const LiquidGlassSurface =
  requireNativeViewManager<LiquidGlassSurfaceProps>("LiquidGlassSurface");

export default LiquidGlassSurface;
