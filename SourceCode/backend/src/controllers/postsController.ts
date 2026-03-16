import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { uploadImage, deleteImage, extractPublicIdFromUrl } from "../services/imageUpload";

const buildPostUser = (post: {
  student: {
    id: string;
    username: string;
    name: string | null;
    profileImageUrl: string | null;
  } | null;
  organisation: {
    id: string;
    name: string;
    profileImageUrl: string | null;
  } | null;
}) => {
  if (post.student) {
    return {
      id: post.student.id,
      username: post.student.username,
      name: post.student.name,
      role: "STUDENT" as const,
      profileImageUrl: post.student.profileImageUrl,
    };
  }

  if (post.organisation) {
    return {
      id: post.organisation.id,
      username: post.organisation.name,
      name: post.organisation.name,
      role: "ORGANISATION" as const,
      profileImageUrl: post.organisation.profileImageUrl,
    };
  }

  return {
    id: "",
    username: "Unknown",
    name: null,
    role: "STUDENT" as const,
    profileImageUrl: null,
  };
};

/**
 * CREATE POST
 * Creates a new post with image and caption
 */
export const createPost = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { caption, image } = req.body;

    if (!caption || !image) {
      return res.status(400).json({
        message: "Missing required fields: caption, image"
      });
    }

    // Upload image to Cloudinary
    const uploadResult = await uploadImage(image, "universe/posts");

    const post = await prisma.posts.create({
      data: {
        caption,
        imageUrl: uploadResult.url,
        studentId: userRole === "STUDENT" ? userId : null,
        organisationId: userRole === "ORGANISATION" ? userId : null,
      },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImageUrl: true,
          },
        },
        organisation: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
    });

    const postWithUser = {
      ...post,
      User: buildPostUser(post),
    };

    return res.status(201).json({
      message: "Post created successfully",
      post: postWithUser
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * GET ALL POSTS
 * Retrieves all posts with author information
 */
export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const posts = await prisma.posts.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImageUrl: true,
          },
        },
        organisation: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
        likes: userId
          ? {
              where: { userId },
              select: { id: true },
              take: 1,
            }
          : false,
      },
    });

    const postsWithUser = posts.map((post: any) => ({
      ...post,
      User: buildPostUser(post),
      likeCount: post._count?.likes ?? 0,
      commentCount: post._count?.comments ?? 0,
      likedByMe: Array.isArray(post.likes) && post.likes.length > 0,
      likes: undefined,
      _count: undefined,
    }));

    return res.json({ posts: postsWithUser });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * GET USER'S POSTS
 * Retrieves all posts by a specific user
 */
export const getUserPosts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const posts = await prisma.posts.findMany({
      where: {
        OR: [{ studentId: userId }, { organisationId: userId }],
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImageUrl: true,
          },
        },
        organisation: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    const postsWithUser = posts.map((post: any) => ({
      ...post,
      User: buildPostUser(post),
      likeCount: post._count?.likes ?? 0,
      commentCount: post._count?.comments ?? 0,
      likes: undefined,
      _count: undefined,
    }));

    return res.json({ posts: postsWithUser });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * GET POST BY ID
 * Retrieves a single post with author information
 */
export const getPostById = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    const post = await prisma.posts.findUnique({
      where: { id: postId },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImageUrl: true,
          },
        },
        organisation: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
        likes: userId
          ? {
              where: { userId },
              select: { id: true },
              take: 1,
            }
          : false,
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const postWithUser = {
      ...post,
      User: buildPostUser(post),
      likeCount: post._count?.likes ?? 0,
      commentCount: post._count?.comments ?? 0,
      likedByMe: Array.isArray(post.likes) && post.likes.length > 0,
      likes: undefined,
      _count: undefined,
    };

    return res.json({ post: postWithUser });
  } catch (error) {
    console.error("Error fetching post:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * DELETE POST
 * Deletes a post (only by the author)
 */
export const deletePost = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if post exists and belongs to user
    const post = await prisma.posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.studentId !== userId && post.organisationId !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    // Delete image from Cloudinary
    if (post.imageUrl) {
      const publicId = extractPublicIdFromUrl(post.imageUrl);
      if (publicId) {
        await deleteImage(publicId);
      }
    }

    // Delete the post
    await prisma.posts.delete({
      where: { id: postId },
    });

    return res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * UPDATE POST
 * Updates a post's caption and/or image (only by the author)
 */
export const updatePost = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { caption, image } = req.body;

    if (!caption && !image) {
      return res.status(400).json({
        message: "At least one field (caption or image) must be provided"
      });
    }

    // Check if post exists and belongs to user
    const post = await prisma.posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.studentId !== userId && post.organisationId !== userId) {
      return res.status(403).json({ message: "Not authorized to update this post" });
    }

    // Prepare update data
    const updateData: any = {};
    if (caption) updateData.caption = caption;
    if (image) {
      // Delete old image if exists
      if (post.imageUrl) {
        const publicId = extractPublicIdFromUrl(post.imageUrl);
        if (publicId) {
          await deleteImage(publicId);
        }
      }

      // Upload new image
      const uploadResult = await uploadImage(image, "universe/posts");
      updateData.imageUrl = uploadResult.url;
    }

    // Update the post
    const updatedPost = await prisma.posts.update({
      where: { id: postId },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImageUrl: true,
          },
        },
        organisation: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
    });

    const postWithUser = {
      ...updatedPost,
      User: buildPostUser(updatedPost),
    };

    return res.json({ message: "Post updated successfully", post: postWithUser });
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * UPDATE POST LIKES
 * Increments or decrements a post's like count
 */
export const updatePostLikes = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!postId || !userId) {
      return res.status(400).json({ message: "Missing postId or user" });
    }

    const existing = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      select: { id: true },
    });

    let likedByMe = false;

    if (existing) {
      await prisma.like.delete({
        where: { id: existing.id },
      });
      likedByMe = false;
    } else {
      await prisma.like.create({
        data: {
          postId,
          userId,
        },
      });
      likedByMe = true;
    }

    const likeCount = await prisma.like.count({
      where: { postId },
    });

    return res.json({
      post: {
        id: postId,
        likeCount,
        likedByMe,
      },
    });
  } catch (error) {
    console.error("Error updating post likes:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET POSTS BY HASHTAG
 * Retrieves all posts containing a specific hashtag
 */
export const getPostsByHashtag = async (req: Request, res: Response) => {
  try {
    const { tag } = req.params;
    const userId = req.user?.id;

    if (!tag) {
      return res.status(400).json({ message: "Hashtag is required" });
    }

    // Normalize the tag - ensure it starts with # for matching
    const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;

    const posts = await prisma.posts.findMany({
      where: {
        caption: {
          contains: normalizedTag,
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImageUrl: true,
          },
        },
        organisation: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
        likes: userId
          ? {
              where: { userId },
              select: { id: true },
              take: 1,
            }
          : false,
      },
    });

    const postsWithUser = posts.map((post: any) => ({
      ...post,
      User: buildPostUser(post),
      likeCount: post._count?.likes ?? 0,
      commentCount: post._count?.comments ?? 0,
      likedByMe: Array.isArray(post.likes) && post.likes.length > 0,
      likes: undefined,
      _count: undefined,
    }));

    return res.json({ posts: postsWithUser });
  } catch (error) {
    console.error("Error fetching posts by hashtag:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * Helper to build comment author info
 */
const buildCommentUser = async (userId: string) => {
  const student = await prisma.student.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      profileImageUrl: true,
    },
  });

  if (student) {
    return {
      id: student.id,
      username: student.username,
      name: student.name,
      role: "STUDENT" as const,
      profileImageUrl: student.profileImageUrl,
    };
  }

  const organisation = await prisma.organisation.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      profileImageUrl: true,
    },
  });

  if (organisation) {
    return {
      id: organisation.id,
      username: organisation.name,
      name: organisation.name,
      role: "ORGANISATION" as const,
      profileImageUrl: organisation.profileImageUrl,
    };
  }

  return {
    id: "",
    username: "Unknown",
    name: null,
    role: "STUDENT" as const,
    profileImageUrl: null,
  };
};

/**
 * GET COMMENTS FOR A POST
 * Retrieves all comments for a specific post with author info
 */
export const getComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
    });

    // Build author info for each comment
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        User: await buildCommentUser(comment.userId),
      }))
    );

    return res.json({ comments: commentsWithAuthors });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * CREATE COMMENT
 * Creates a new comment on a post
 */
export const createComment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { postId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ message: "Comment content is required" });
    }

    // Check if post exists
    const post = await prisma.posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId,
        userId,
      },
    });

    const author = await buildCommentUser(userId);

    return res.status(201).json({
      message: "Comment created successfully",
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        User: author,
      },
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * DELETE COMMENT
 * Deletes a comment (only by the author)
 */
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { postId, commentId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if comment exists and belongs to user
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.postId !== postId) {
      return res.status(400).json({ message: "Comment does not belong to this post" });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
