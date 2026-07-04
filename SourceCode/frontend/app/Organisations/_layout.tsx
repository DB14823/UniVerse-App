import React, { useMemo, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { registerForPushNotifications } from "../../lib/notifications";
import LiquidGlassTabBar from "../components/LiquidGlassTabBar";

const HIDE_TAB_BAR_SCREENS = [
  "createPost",
  "profileOrg",
  "profileStudent",
  "profileOrgSettings",
  "scanTickets",
];

export default function OrganisationsLayout() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    registerForPushNotifications().catch((err) =>
      console.error("Push registration error:", err),
    );
  }, []);

  const activeTab = useMemo(() => {
    if (pathname.includes("eventsOrg")) return "myEvents";
    if (pathname.includes("createEvent")) return "createEvent";
    if (pathname.includes("socialOrg")) return "social";
    return null;
  }, [pathname]);

  const routeForTab = (tab: string) => {
    if (tab === "myEvents") return "/Organisations/eventsOrg";
    if (tab === "createEvent") return "/Organisations/createEvent";
    if (tab === "social") return "/Organisations/socialOrg";
    return "/Organisations/eventsOrg";
  };

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="eventsOrg" options={{ href: null }} />
        <Tabs.Screen name="createEvent" options={{ href: null }} />
        <Tabs.Screen name="scanTickets" options={{ href: null }} />
        <Tabs.Screen name="socialOrg" options={{ href: null }} />
        <Tabs.Screen name="createPost" options={{ href: null }} />
        <Tabs.Screen name="profileOrg" options={{ href: null }} />
        <Tabs.Screen name="profileStudent" options={{ href: null }} />
      </Tabs>
      <View
        style={[
          styles.tabBarOverlay,
          HIDE_TAB_BAR_SCREENS.some((s) => pathname.includes(s)) && {
            display: "none",
          },
        ]}
        pointerEvents="box-none"
      >
        <LiquidGlassTabBar
          role="org"
          activeTab={activeTab}
          onTabPress={(tab) => {
            if (tab === activeTab) {
              router.setParams({ _r: Date.now().toString() });
              return;
            }
            router.replace(routeForTab(tab) as any);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBarOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
