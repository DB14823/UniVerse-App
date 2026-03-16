import { Request, Response } from "express";
import prisma from "../utils/prisma";

/**
 * REGISTER PUSH TOKEN
 * Saves a push notification token for the current user
 */
export const registerPushToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { token } = req.body;

    if (!userId || !userRole) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Check if token already exists
    const existing = await prisma.pushToken.findUnique({
      where: { token },
    });

    if (existing) {
      // Update to this user if token belongs to someone else
      if (existing.userId !== userId) {
        await prisma.pushToken.update({
          where: { token },
          data: { userId, userRole: userRole.toUpperCase() },
        });
      }
      return res.json({ message: "Token already registered" });
    }

    // Create new token
    await prisma.pushToken.create({
      data: {
        token,
        userId,
        userRole: userRole.toUpperCase(),
      },
    });

    return res.status(201).json({ message: "Token registered successfully" });
  } catch (error) {
    console.error("Error registering push token:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * UNREGISTER PUSH TOKEN
 * Removes a push notification token
 */
export const unregisterPushToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    await prisma.pushToken.deleteMany({
      where: { token },
    });

    return res.json({ message: "Token unregistered successfully" });
  } catch (error) {
    console.error("Error unregistering push token:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * GET USER'S NOTIFICATIONS
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { limit = "50", offset = "0", unreadOnly = "false" } = req.query;

    const where: any = { userId };

    if (unreadOnly === "true") {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string, 10),
      skip: parseInt(offset as string, 10),
    });

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * MARK NOTIFICATION AS READ
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * MARK ALL NOTIFICATIONS AS READ
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * GET NOTIFICATION SETTINGS
 */
export const getNotificationSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let notificationsEnabled = true;

    if (userRole.toUpperCase() === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { id: userId },
        select: { notificationsEnabled: true },
      });
      notificationsEnabled = student?.notificationsEnabled ?? true;
    } else if (userRole.toUpperCase() === "ORGANISATION") {
      const org = await prisma.organisation.findUnique({
        where: { id: userId },
        select: { notificationsEnabled: true },
      });
      notificationsEnabled = org?.notificationsEnabled ?? true;
    }

    return res.json({ notificationsEnabled });
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * UPDATE NOTIFICATION SETTINGS
 */
export const updateNotificationSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { notificationsEnabled } = req.body;

    if (!userId || !userRole) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (typeof notificationsEnabled !== "boolean") {
      return res.status(400).json({ message: "notificationsEnabled must be a boolean" });
    }

    if (userRole.toUpperCase() === "STUDENT") {
      await prisma.student.update({
        where: { id: userId },
        data: { notificationsEnabled },
      });
    } else if (userRole.toUpperCase() === "ORGANISATION") {
      await prisma.organisation.update({
        where: { id: userId },
        data: { notificationsEnabled },
      });
    }

    // If disabling notifications, remove all push tokens for this user
    if (!notificationsEnabled) {
      await prisma.pushToken.deleteMany({
        where: { userId },
      });
    }

    return res.json({ notificationsEnabled });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * DELETE NOTIFICATION
 */
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await prisma.notification.delete({
      where: { id },
    });

    return res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

const notificationsController = {
  registerPushToken,
  unregisterPushToken,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getNotificationSettings,
  updateNotificationSettings,
  deleteNotification,
};

export default notificationsController;
