import { requireNativeViewManager } from "expo-modules-core";
import { ViewProps } from "react-native";

export interface TabConfig {
  key: string;
  label: string;
  sfSymbol: string;
  sfSymbolActive: string;
}

export interface LiquidGlassTabBarNativeProps extends ViewProps {
  tabs: TabConfig[];
  activeTab: string;
  unreadCounts: Record<string, number>;
  accentColor: string;
  onTabPress: (event: { nativeEvent: { tabKey: string } }) => void;
}

const NativeView =
  requireNativeViewManager<LiquidGlassTabBarNativeProps>("LiquidGlassTabBar");

export default NativeView;
