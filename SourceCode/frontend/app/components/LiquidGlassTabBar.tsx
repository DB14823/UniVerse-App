import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NativeTabBar, {
  TabConfig,
} from "../../modules/liquid-glass-tab-bar/index";

const STUDENT_TABS: TabConfig[] = [
  {
    key: "events",
    label: "Events",
    sfSymbol: "calendar",
    sfSymbolActive: "calendar.fill",
  },
  {
    key: "tickets",
    label: "Tickets",
    sfSymbol: "ticket",
    sfSymbolActive: "ticket.fill",
  },
  {
    key: "social",
    label: "Social",
    sfSymbol: "person.3",
    sfSymbolActive: "person.3.fill",
  },
  {
    key: "messages",
    label: "Messages",
    sfSymbol: "message",
    sfSymbolActive: "message.fill",
  },
];

const ORG_TABS: TabConfig[] = [
  {
    key: "myEvents",
    label: "My Events",
    sfSymbol: "calendar",
    sfSymbolActive: "calendar.fill",
  },
  {
    key: "createEvent",
    label: "Create",
    sfSymbol: "plus.circle",
    sfSymbolActive: "plus.circle.fill",
  },
  {
    key: "social",
    label: "Social",
    sfSymbol: "person.3",
    sfSymbolActive: "person.3.fill",
  },
];

const STUDENT_ACCENT = "#8B5CF6";
const ORG_ACCENT = "#06B6D4";

interface StudentProps {
  role: "student";
  activeTab: string | null;
  onTabPress: (tab: string) => void;
  unreadMessageCount?: number;
}

interface OrgProps {
  role: "org";
  activeTab: string | null;
  onTabPress: (tab: string) => void;
}

type Props = StudentProps | OrgProps;

export default function LiquidGlassTabBar(props: Props) {
  const { bottom } = useSafeAreaInsets();
  // Container height = pill (64) + safe area bottom + 12pt above home indicator
  const containerHeight = 64 + bottom + 12;

  const tabs = props.role === "student" ? STUDENT_TABS : ORG_TABS;
  const accentColor = props.role === "student" ? STUDENT_ACCENT : ORG_ACCENT;
  const unreadCounts: Record<string, number> =
    props.role === "student" ? { messages: props.unreadMessageCount ?? 0 } : {};

  return (
    <View
      style={[styles.container, { height: containerHeight }]}
      pointerEvents="box-none"
    >
      <NativeTabBar
        style={StyleSheet.absoluteFill}
        tabs={tabs}
        activeTab={props.activeTab ?? ""}
        unreadCounts={unreadCounts}
        accentColor={accentColor}
        onTabPress={(event) => props.onTabPress(event.nativeEvent.tabKey)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
});
