import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { getUserPosts, getCurrentUser, getUserProfile, Post } from "../../lib/postsApi";
import { followUser, unfollowUser, checkFollowing, getFollowCounts } from "../../lib/followApi";
import { colours } from "../../lib/theme/colours";
import { shadows } from "../../lib/theme/colours";

export default function ProfileStudent() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    userId?: string;
    username?: string;
    viewerRole?: string;
  }>();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [username, setUsername] = useState("Loading...");
  const [userId, setUserId] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const totalLikes = useMemo(
    () => userPosts.reduce((sum, post) => sum + (post.likeCount ?? 0), 0),
    [userPosts]
  );

  const normalizeParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  const routeUserId = normalizeParam(params.userId) || null;
  const routeUsername = normalizeParam(params.username) || null;
  const routeViewerRole = normalizeParam(params.viewerRole) || null;
  const viewingOther = Boolean(routeUserId) || routeViewerRole === "ORGANISATION";

  const handleBackPress = useCallback(() => {
    if (routeViewerRole === "ORGANISATION") {
      router.replace("/Organisations/socialOrg");
    } else {
      router.replace("/Students/socialStudent");
    }
  }, [routeViewerRole, router]);

  useEffect(() => {
    loadUserProfile(routeUserId, routeUsername);
  }, [routeUserId, routeUsername]);

  const loadUserProfile = async (
    targetUserId: string | null,
    targetUsername: string | null
  ) => {
    try {
      setLoading(true);
      setProfileImageUri(null);

      let finalUsername: string | null = targetUsername;
      let finalUserId: string | null = targetUserId;

      if (finalUserId) {
        try {
          const user = await getUserProfile(finalUserId);
          if (user?.username) finalUsername = user.username;
          if (user?.profileImageUrl) {
            setProfileImageUri(user.profileImageUrl);
          }
        } catch {}
      } else {
        try {
          const user = await getCurrentUser();
          if (user?.username) finalUsername = user.username;
          if (user?.id) finalUserId = user.id;
          if (user?.profileImageUrl) {
            setProfileImageUri(user.profileImageUrl);
          }
        } catch {}
      }

      if (!finalUsername) {
        const storedUsername = await SecureStore.getItemAsync("username");
        if (storedUsername) finalUsername = storedUsername;
      }

      if (!finalUserId) {
        const storedUserId = await SecureStore.getItemAsync("userId");
        if (storedUserId) finalUserId = storedUserId;
      }

      if (finalUserId) {
        setUserId(finalUserId);
        const posts = await getUserPosts(finalUserId);
        setUserPosts(posts);

        // Load follow data
        try {
          const [counts, followingStatus] = await Promise.all([
            getFollowCounts(finalUserId),
            viewingOther ? checkFollowing(finalUserId) : Promise.resolve(false),
          ]);
          setFollowersCount(counts.followersCount);
          setFollowingCount(counts.followingCount);
          setIsFollowing(followingStatus);
        } catch (err) {
          console.error("Error loading follow data:", err);
        }

        if (!finalUsername && posts.length > 0 && posts[0]?.User?.username) {
          finalUsername = posts[0].User.username;
        }
      }

      setUsername(finalUsername || "Username not available");
    } catch {
      setUsername("Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserProfile(routeUserId, routeUsername);
    setRefreshing(false);
  }, [routeUserId, routeUsername]);

  const handleFollowPress = useCallback(async () => {
    if (!userId || followLoading) return;

    try {
      setFollowLoading(true);
      if (isFollowing) {
        await unfollowUser(userId);
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        await followUser(userId);
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setFollowLoading(false);
    }
  }, [userId, isFollowing, followLoading]);

  const bottomPad = 110 + Math.max(insets.bottom, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBackPress}
          activeOpacity={0.85}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {username}
        </Text>

        {viewingOther ? (
          <View style={styles.headerSpacer} />
        ) : (
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push("/Students/profileStudentSettings")}
            activeOpacity={0.85}
          >
            <Ionicons name="settings" size={22} color={colours.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatarWithGlow}>
            <View style={styles.avatarCircle}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="heart" size={20} color={colours.accent} />
            <Text style={styles.statNumber}>{totalLikes}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people" size={20} color={colours.primary} />
            <Text style={styles.statNumber}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="grid" size={20} color={colours.secondary} />
            <Text style={styles.statNumber}>{userPosts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
        </View>

        {viewingOther && userId && (
          <TouchableOpacity
            style={[
              styles.followBtn,
              isFollowing ? styles.followingBtn : null,
            ]}
            onPress={handleFollowPress}
            disabled={followLoading}
            activeOpacity={0.85}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={colours.textPrimary} />
            ) : (
              <>
                <Ionicons
                  name={isFollowing ? "checkmark" : "add"}
                  size={18}
                  color={isFollowing ? colours.textSecondary : colours.textPrimary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.followBtnText,
                    isFollowing ? styles.followingBtnText : null,
                  ]}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {loading ? (
          <Text style={styles.loadingText}>Loading posts...</Text>
        ) : userPosts.length === 0 ? (
          <Text style={styles.emptyText}>No posts yet</Text>
        ) : (
          <View style={styles.grid}>
            {userPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.tile}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/post/[postId]",
                    params: { postId: post.id },
                  })
                }
              >
                <Image
                  source={{ uri: post.imageUrl }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

     
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.background },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colours.background,
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

  headerTitle: {
    color: colours.textPrimary,
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    flex: 1,
  },

  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colours.glass,
    borderWidth: 1,
    borderColor: colours.border,
    justifyContent: "center",
    alignItems: "center",
  },

  headerSpacer: {
    width: 44,
    height: 44,
  },

  scrollArea: { flex: 1, paddingHorizontal: 16 },

  avatarWrap: { alignItems: "center", marginTop: 10, marginBottom: 16 },

  avatarWithGlow: {
    ...shadows.glow,
    borderRadius: 999,
  },

  avatarCircle: {
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: colours.surface,
    borderWidth: 2,
    borderColor: colours.border,
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },

  statCard: {
    flex: 1,
    maxWidth: 140,
    backgroundColor: colours.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colours.border,
    padding: 16,
    alignItems: "center",
    ...shadows.small,
  },

  statNumber: {
    color: colours.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8,
  },

  statLabel: {
    color: colours.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    paddingBottom: 12,
  },

  tile: {
    width: `${100 / 3 - 0.7}%`,
    aspectRatio: 1,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: "hidden",
  },

  postImage: {
    width: "100%",
    height: "100%",
  },

  loadingText: {
    textAlign: "center",
    color: colours.textMuted,
    fontSize: 16,
    marginTop: 20,
  },

  emptyText: {
    textAlign: "center",
    color: colours.textMuted,
    fontSize: 16,
    marginTop: 20,
  },

  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: colours.primary,
    marginHorizontal: 16,
    marginBottom: 16,
  },

  followingBtn: {
    backgroundColor: colours.glass,
    borderWidth: 1,
    borderColor: colours.border,
  },

  followBtnText: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },

  followingBtnText: {
    color: colours.textSecondary,
  },
});