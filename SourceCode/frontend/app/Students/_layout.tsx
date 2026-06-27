import React, { useMemo, useEffect, useState, useCallback } from "react";
import { AppState, View, StyleSheet } from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { registerForPushNotifications } from "../../lib/notifications";
import { fetchConversations } from "../../lib/messagesApi";
import { useSocket, getSocket } from "../hooks/useSocket";
import LiquidGlassTabBar from "../components/LiquidGlassTabBar";

export default function StudentsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useSocket();

  useEffect(() => {
    registerForPushNotifications().catch((err) =>
      console.error("Push registration error:", err),
    );
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const convs = await fetchConversations();
      const total = convs.reduce((sum, c) => sum + c.unreadCount, 0);
      setUnreadCount(total);
    } catch {
      // ignore — badge just won't update
    }
  }, []);

  useEffect(() => {
    refreshUnread();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshUnread();
    });
    return () => sub.remove();
  }, [refreshUnread]);

  // Refresh badge count in real-time when a message arrives and we're not
  // already in that conversation (where it would be marked read immediately).
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => {
      if (!pathname.includes("conversation")) refreshUnread();
    };
    socket.on("new_message", handler);
    return () => {
      socket.off("new_message", handler);
    };
  }, [pathname, refreshUnread]);

  const activeTab = useMemo(() => {
    if (pathname.includes("EventFeed")) return "events";
    if (pathname.includes("myTickets")) return "tickets";
    if (pathname.includes("socialStudent")) return "social";
    if (pathname.includes("messages") || pathname.includes("conversation"))
      return "messages";
    return null;
  }, [pathname]);

  const routeForTab = (tab: string) => {
    if (tab === "events") return "/Students/EventFeed";
    if (tab === "tickets") return "/Students/myTickets";
    if (tab === "social") return "/Students/socialStudent";
    if (tab === "messages") return "/Students/messages";
    return "/Students/EventFeed";
  };

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="EventFeed" options={{ href: null }} />
        <Tabs.Screen name="myTickets" options={{ href: null }} />
        <Tabs.Screen name="socialStudent" options={{ href: null }} />
        <Tabs.Screen name="profileStudent" options={{ href: null }} />
        <Tabs.Screen name="profileOrg" options={{ href: null }} />
        <Tabs.Screen name="messages" options={{ href: null }} />
        <Tabs.Screen name="conversation" options={{ href: null }} />
      </Tabs>
      <View
        style={[
          styles.tabBarOverlay,
          pathname.includes("conversation") && { display: "none" },
        ]}
        pointerEvents="box-none"
      >
        <LiquidGlassTabBar
          role="student"
          activeTab={activeTab}
          unreadMessageCount={unreadCount}
          onTabPress={(tab) => {
            if (tab === activeTab && tab !== "messages") {
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
