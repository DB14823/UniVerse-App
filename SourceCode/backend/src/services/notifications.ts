import prisma from "../utils/prisma";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Send a push notification via Expo's push service
 */
export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> => {
  try {
    const message: PushMessage = {
      to: token,
      title,
      body,
      data,
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (result.data?.status === "error") {
      console.error("Push notification error:", result.data);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
};

/**
 * Get all push tokens for a user
 */
export const getUserPushTokens = async (
  userId: string
): Promise<string[]> => {
  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });

  return tokens.map((t) => t.token);
};

/**
 * Send a notification to a specific user
 * - Stores notification in database
 * - Sends push notifications to all user's devices
 */
export const sendNotificationToUser = async (
  userId: string,
  userRole: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    // Check if user has notifications enabled
    let notificationsEnabled = true;

    if (userRole === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { id: userId },
        select: { notificationsEnabled: true },
      });
      notificationsEnabled = student?.notificationsEnabled ?? true;
    } else if (userRole === "ORGANISATION") {
      const org = await prisma.organisation.findUnique({
        where: { id: userId },
        select: { notificationsEnabled: true },
      });
      notificationsEnabled = org?.notificationsEnabled ?? true;
    }

    // Store notification in database regardless of notification setting
    await prisma.notification.create({
      data: {
        type,
        title,
        body,
        data: data ?? undefined,
        userId,
        userRole,
      },
    });

    // Only send push if notifications are enabled
    if (!notificationsEnabled) {
      return;
    }

    // Get push tokens and send notifications
    const tokens = await getUserPushTokens(userId);

    if (tokens.length === 0) {
      return;
    }

    // Send push notifications to all devices
    await Promise.all(
      tokens.map((token) => sendPushNotification(token, title, body, data))
    );
  } catch (error) {
    console.error("Error sending notification to user:", error);
  }
};

/**
 * Send a notification to multiple users
 */
export const sendNotificationToUsers = async (
  userIds: string[],
  userRole: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    // Filter users who have notifications enabled
    const enabledUserIds: string[] = [];

    for (const userId of userIds) {
      let enabled = true;

      if (userRole === "STUDENT") {
        const student = await prisma.student.findUnique({
          where: { id: userId },
          select: { notificationsEnabled: true },
        });
        enabled = student?.notificationsEnabled ?? true;
      } else if (userRole === "ORGANISATION") {
        const org = await prisma.organisation.findUnique({
          where: { id: userId },
          select: { notificationsEnabled: true },
        });
        enabled = org?.notificationsEnabled ?? true;
      }

      if (enabled) {
        enabledUserIds.push(userId);
      }
    }

    if (enabledUserIds.length === 0) {
      return;
    }

    // Create notifications in database for all users
    await prisma.notification.createMany({
      data: enabledUserIds.map((userId) => ({
        type,
        title,
        body,
        data: data ?? undefined,
        userId,
        userRole,
      })),
    });

    // Get all push tokens for enabled users
    const tokens = await prisma.pushToken.findMany({
      where: { userId: { in: enabledUserIds } },
      select: { token: true },
    });

    if (tokens.length === 0) {
      return;
    }

    // Send push notifications
    await Promise.all(
      tokens.map((t) => sendPushNotification(t.token, title, body, data))
    );
  } catch (error) {
    console.error("Error sending notifications to users:", error);
  }
};

/**
 * Notify followers of a new event
 */
export const notifyFollowersOfNewEvent = async (
  organiserId: string,
  organiserName: string,
  eventId: string,
  eventTitle: string
): Promise<void> => {
  try {
    // Get all followers
    const follows = await prisma.follow.findMany({
      where: { followingId: organiserId },
      select: { followerId: true, followerType: true },
    });

    if (follows.length === 0) {
      return;
    }

    const followerIds = follows.map((f) => f.followerId);

    await sendNotificationToUsers(
      followerIds,
      "MIXED", // Followers can be students or organisations
      "NEW_EVENT",
      `New event from ${organiserName}`,
      `${eventTitle} - Check it out!`,
      { eventId, organiserId }
    );
  } catch (error) {
    console.error("Error notifying followers of new event:", error);
  }
};
