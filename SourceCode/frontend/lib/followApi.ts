import { API_URL } from "./api";
import * as SecureStore from "expo-secure-store";

async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("authToken");
}

async function fetchWithAuth(url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  const text = await res.text();

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.error || message;
    } catch {}
    throw new Error(message);
  }

  if (text.trim() === "") {
    return null;
  }

  return JSON.parse(text);
}

export interface FollowUser {
  id: string;
  username: string;
  name: string | null;
  profileImageUrl: string | null;
  role: string;
  followedAt: string;
}

/**
 * Follow a user or organisation
 */
export async function followUser(targetId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/follow/${targetId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Unfollow a user or organisation
 */
export async function unfollowUser(targetId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchWithAuth(`${API_URL}/follow/${targetId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Check if current user is following a target
 */
export async function checkFollowing(targetId: string): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/follow/check/${targetId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.isFollowing;
}

/**
 * Get follower and following counts for a user
 */
export async function getFollowCounts(
  userId: string
): Promise<{ followersCount: number; followingCount: number }> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/follow/counts/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return {
    followersCount: data.followersCount,
    followingCount: data.followingCount,
  };
}

/**
 * Get followers list for a user
 */
export async function getFollowers(userId: string): Promise<FollowUser[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/follow/followers/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.followers;
}

/**
 * Get following list for a user
 */
export async function getFollowing(userId: string): Promise<FollowUser[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const data = await fetchWithAuth(`${API_URL}/follow/following/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.following;
}
