import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { sendNotificationToUser } from "../services/notifications";

/**
 * FOLLOW A USER OR ORGANISATION
 */
export const followUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { targetId } = req.params;

    if (!userId || !userRole) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!targetId) {
      return res.status(400).json({ message: "Target ID is required" });
    }

    // Can't follow yourself
    if (userId === targetId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    // Check if target exists and determine their type
    const targetStudent = await prisma.student.findUnique({
      where: { id: targetId },
    });

    const targetOrg = await prisma.organisation.findUnique({
      where: { id: targetId },
    });

    if (!targetStudent && !targetOrg) {
      return res.status(404).json({ message: "User not found" });
    }

    const targetRole = targetStudent ? "STUDENT" : "ORGANISATION";

    // Check if already following
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ message: "Already following this user" });
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId: userId,
        followerType: userRole.toUpperCase(),
        followingId: targetId,
        followingType: targetRole,
      },
    });

    // Notify the followed user
    try {
      let followerName = "Someone";
      if (userRole.toUpperCase() === "STUDENT") {
        const student = await prisma.student.findUnique({
          where: { id: userId },
          select: { username: true, name: true },
        });
        followerName = student?.username || student?.name || followerName;
      } else {
        const org = await prisma.organisation.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        followerName = org?.name || followerName;
      }
      await sendNotificationToUser(
        targetId,
        targetRole,
        "NEW_FOLLOWER",
        `${followerName} followed you`,
        "You have a new follower!",
        { followerId: userId },
      );
    } catch (notifError) {
      console.error("Error sending follow notification:", notifError);
    }

    return res.status(201).json({ message: "Followed successfully" });
  } catch (error) {
    console.error("Error following user:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * UNFOLLOW A USER OR ORGANISATION
 */
export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { targetId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!targetId) {
      return res.status(400).json({ message: "Target ID is required" });
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Not following this user" });
    }

    await prisma.follow.delete({
      where: {
        id: existing.id,
      },
    });

    return res.json({ message: "Unfollowed successfully" });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * GET FOLLOWERS OF A USER
 */
export const getFollowers = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const follows = await prisma.follow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: "desc" },
    });

    // Fetch user details for each follower
    const followers = await Promise.all(
      follows.map(async (follow) => {
        let user = null;
        let role = follow.followerType;

        if (follow.followerType === "STUDENT") {
          user = await prisma.student.findUnique({
            where: { id: follow.followerId },
            select: {
              id: true,
              username: true,
              name: true,
              profileImageUrl: true,
            },
          });
        } else {
          user = await prisma.organisation.findUnique({
            where: { id: follow.followerId },
            select: {
              id: true,
              name: true,
              profileImageUrl: true,
            },
          });
        }

        if (!user) return null;

        return {
          id: user.id,
          username: "username" in user ? user.username : user.name,
          name: user.name,
          profileImageUrl: user.profileImageUrl,
          role: follow.followerType,
          followedAt: follow.createdAt,
        };
      }),
    );

    // Filter out nulls
    const validFollowers = followers.filter(Boolean);

    return res.json({ followers: validFollowers });
  } catch (error) {
    console.error("Error fetching followers:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * GET FOLLOWING OF A USER
 */
export const getFollowing = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: "desc" },
    });

    // Fetch user details for each following
    const following = await Promise.all(
      follows.map(async (follow) => {
        let user = null;

        if (follow.followingType === "STUDENT") {
          user = await prisma.student.findUnique({
            where: { id: follow.followingId },
            select: {
              id: true,
              username: true,
              name: true,
              profileImageUrl: true,
            },
          });
        } else {
          user = await prisma.organisation.findUnique({
            where: { id: follow.followingId },
            select: {
              id: true,
              name: true,
              profileImageUrl: true,
            },
          });
        }

        if (!user) return null;

        return {
          id: user.id,
          username: "username" in user ? user.username : user.name,
          name: user.name,
          profileImageUrl: user.profileImageUrl,
          role: follow.followingType,
          followedAt: follow.createdAt,
        };
      }),
    );

    // Filter out nulls
    const validFollowing = following.filter(Boolean);

    return res.json({ following: validFollowing });
  } catch (error) {
    console.error("Error fetching following:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * CHECK IF CURRENT USER IS FOLLOWING A TARGET
 */
export const checkFollowing = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { targetId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!targetId) {
      return res.status(400).json({ message: "Target ID is required" });
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetId,
        },
      },
    });

    return res.json({ isFollowing: !!existing });
  } catch (error) {
    console.error("Error checking follow status:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * GET FOLLOWER AND FOLLOWING COUNTS FOR A USER
 */
export const getFollowCounts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return res.json({ followersCount, followingCount });
  } catch (error) {
    console.error("Error fetching follow counts:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

const followController = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkFollowing,
  getFollowCounts,
};

export default followController;
