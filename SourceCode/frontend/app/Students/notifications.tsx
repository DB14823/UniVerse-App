import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Notification,
} from "../../lib/notificationsApi";
import { colours } from "../../lib/theme/colours";

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  POST_LIKE: "heart",
  POST_COMMENT: "chatbubble",
  TICKET_CONFIRMED: "ticket",
  NEW_EVENT: "calendar",
  NEW_FOLLOWER: "person-add",
  EVENT_REMINDER_ONE_DAY: "alarm",
  EVENT_REMINDER_ONE_HOUR: "alarm",
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications({ limit: 50 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, []);

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    // Navigate based on notification type
    const data = notification.data || {};
    if (data.postId) {
      router.push({
        pathname: "/post/[postId]",
        params: { postId: data.postId },
      });
    } else if (data.eventId) {
      // Navigate to event in the EventFeed
      router.push("/Students/EventFeed");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAllRead(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconName = NOTIFICATION_ICONS[item.type] || "notifications";
    const iconColor =
      item.type === "POST_LIKE"
        ? colours.accent
        : item.type === "NEW_EVENT"
          ? colours.primary
          : item.type === "TICKET_CONFIRMED"
            ? colours.success
            : colours.secondary;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[styles.iconContainer, { backgroundColor: iconColor + "20" }]}
        >
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTime(item.createdAt)}
          </Text>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const bottomPad = 110 + Math.max(insets.bottom, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Notifications</Text>

        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllRead}
            disabled={markingAllRead}
          >
            {markingAllRead ? (
              <ActivityIndicator size="small" color={colours.textSecondary} />
            ) : (
              <Text style={styles.markAllText}>Mark all read</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colours.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="notifications-off-outline"
            size={64}
            color={colours.textMuted}
          />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            When you get notifications, they'll appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colours.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    justifyContent: "space-between",
    gap: 12,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    borderWidth: 1,
    borderColor: colours.border,
    justifyContent: "center",
    alignItems: "center",
  },

  backIcon: {
    color: colours.textPrimary,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
    fontWeight: "900",
  },

  title: {
    flex: 1,
    textAlign: "center",
    color: colours.textPrimary,
    fontSize: 34,
    fontWeight: "900",
  },

  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  markAllText: {
    color: colours.secondary,
    fontSize: 14,
    fontWeight: "700",
  },

  headerSpacer: {
    width: 80,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  emptyText: {
    color: colours.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
  },

  emptySubtext: {
    color: colours.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },

  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    backgroundColor: colours.background,
  },

  unreadItem: {
    backgroundColor: colours.surface,
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  contentContainer: {
    flex: 1,
  },

  notificationTitle: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },

  notificationBody: {
    color: colours.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },

  notificationTime: {
    color: colours.textMuted,
    fontSize: 12,
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colours.primary,
    marginLeft: 8,
  },
});
