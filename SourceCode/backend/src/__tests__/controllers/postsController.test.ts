import prisma from "../../utils/prisma";
import {
  createPost,
  getAllPosts,
  getPostById,
  getUserPosts,
  deletePost,
  updatePost,
  updatePostLikes,
  getPostsByHashtag,
  createComment,
  deleteComment,
  getComments,
} from "../../controllers/postsController";
import { mockRequest, mockResponse } from "../helpers";

jest.mock("../../utils/prisma");
jest.mock("../../services/imageUpload", () => ({
  uploadImage: jest
    .fn()
    .mockResolvedValue({ url: "https://cdn.example.com/post.jpg" }),
  deleteImage: jest.fn().mockResolvedValue(undefined),
  extractPublicIdFromUrl: jest.fn().mockReturnValue("universe/posts/abc"),
}));
jest.mock("../../services/notifications", () => ({
  sendNotificationToUser: jest.fn().mockResolvedValue(undefined),
}));

const db = prisma as jest.Mocked<typeof prisma>;

const STUDENT = { id: "stu1", email: "s@test.com", role: "STUDENT" as const };
const ORG = { id: "org1", email: "o@test.com", role: "ORGANISATION" as const };

const makePost = (overrides = {}) => ({
  id: "post1",
  caption: "Hello #world",
  imageUrl: "https://cdn.example.com/post.jpg",
  studentId: STUDENT.id,
  organisationId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  student: {
    id: STUDENT.id,
    username: "stu1",
    name: "Student One",
    profileImageUrl: null,
  },
  organisation: null,
  _count: { likes: 3, comments: 1 },
  likes: [],
  ...overrides,
});

// ---------------------------------------------------------------------------
// createPost
// ---------------------------------------------------------------------------
describe("createPost", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await createPost(mockRequest(), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when caption or image is missing", async () => {
    const res = mockResponse();
    await createPost(
      mockRequest({ user: STUDENT, body: { caption: "hi" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("caption, image"),
      }),
    );
  });

  it("creates a post and returns 201 for a STUDENT", async () => {
    (db.posts.create as jest.Mock).mockResolvedValue(makePost());

    const res = mockResponse();
    await createPost(
      mockRequest({
        user: STUDENT,
        body: { caption: "Hello #world", image: "base64data" },
      }),
      res,
    );

    const createArg = (db.posts.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data.studentId).toBe(STUDENT.id);
    expect(createArg.data.organisationId).toBeNull();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("sets organisationId (not studentId) when an ORGANISATION creates a post", async () => {
    (db.posts.create as jest.Mock).mockResolvedValue(
      makePost({
        studentId: null,
        organisationId: ORG.id,
        student: null,
        organisation: { id: ORG.id, name: "TestOrg", profileImageUrl: null },
      }),
    );

    const res = mockResponse();
    await createPost(
      mockRequest({ user: ORG, body: { caption: "Org post", image: "data" } }),
      res,
    );

    const createArg = (db.posts.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data.studentId).toBeNull();
    expect(createArg.data.organisationId).toBe(ORG.id);
  });
});

// ---------------------------------------------------------------------------
// getAllPosts
// ---------------------------------------------------------------------------
describe("getAllPosts", () => {
  it("returns posts with likeCount and commentCount mapped from _count", async () => {
    (db.posts.findMany as jest.Mock).mockResolvedValue([makePost()]);

    const res = mockResponse();
    await getAllPosts(mockRequest({ user: STUDENT }), res);

    const { posts } = (res.json as jest.Mock).mock.calls[0][0];
    expect(posts[0].likeCount).toBe(3);
    expect(posts[0].commentCount).toBe(1);
  });

  it("marks likedByMe as true when the authenticated user has liked the post", async () => {
    (db.posts.findMany as jest.Mock).mockResolvedValue([
      makePost({ likes: [{ id: "like1" }] }),
    ]);

    const res = mockResponse();
    await getAllPosts(mockRequest({ user: STUDENT }), res);

    const { posts } = (res.json as jest.Mock).mock.calls[0][0];
    expect(posts[0].likedByMe).toBe(true);
  });

  it("marks likedByMe as false when the user has not liked the post", async () => {
    (db.posts.findMany as jest.Mock).mockResolvedValue([
      makePost({ likes: [] }),
    ]);

    const res = mockResponse();
    await getAllPosts(mockRequest({ user: STUDENT }), res);

    const { posts } = (res.json as jest.Mock).mock.calls[0][0];
    expect(posts[0].likedByMe).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deletePost
// ---------------------------------------------------------------------------
describe("deletePost", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await deletePost(mockRequest({ params: { postId: "post1" } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 404 when post does not exist", async () => {
    (db.posts.findUnique as jest.Mock).mockResolvedValue(null);

    const res = mockResponse();
    await deletePost(
      mockRequest({ user: STUDENT, params: { postId: "missing" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 403 when user does not own the post", async () => {
    (db.posts.findUnique as jest.Mock).mockResolvedValue(
      makePost({ studentId: "other-student", organisationId: null }),
    );

    const res = mockResponse();
    await deletePost(
      mockRequest({ user: STUDENT, params: { postId: "post1" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("deletes the post and returns success message", async () => {
    (db.posts.findUnique as jest.Mock).mockResolvedValue(makePost());
    (db.posts.delete as jest.Mock).mockResolvedValue(undefined);

    const res = mockResponse();
    await deletePost(
      mockRequest({ user: STUDENT, params: { postId: "post1" } }),
      res,
    );

    expect(db.posts.delete).toHaveBeenCalledWith({ where: { id: "post1" } });
    expect(res.json).toHaveBeenCalledWith({
      message: "Post deleted successfully",
    });
  });
});

// ---------------------------------------------------------------------------
// updatePost
// ---------------------------------------------------------------------------
describe("updatePost", () => {
  it("returns 400 when neither caption nor image is provided", async () => {
    const res = mockResponse();
    await updatePost(
      mockRequest({ user: STUDENT, params: { postId: "post1" }, body: {} }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 403 when user does not own the post", async () => {
    (db.posts.findUnique as jest.Mock).mockResolvedValue(
      makePost({ studentId: "other" }),
    );

    const res = mockResponse();
    await updatePost(
      mockRequest({
        user: STUDENT,
        params: { postId: "post1" },
        body: { caption: "new" },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("updates caption and returns the updated post", async () => {
    const updated = makePost({ caption: "updated caption" });
    (db.posts.findUnique as jest.Mock).mockResolvedValue(makePost());
    (db.posts.update as jest.Mock).mockResolvedValue(updated);

    const res = mockResponse();
    await updatePost(
      mockRequest({
        user: STUDENT,
        params: { postId: "post1" },
        body: { caption: "updated caption" },
      }),
      res,
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        post: expect.objectContaining({ caption: "updated caption" }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// updatePostLikes (toggle like)
// ---------------------------------------------------------------------------
describe("updatePostLikes", () => {
  it("returns 400 when postId or user is missing", async () => {
    const res = mockResponse();
    await updatePostLikes(mockRequest({ params: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates a like when the user has not yet liked the post", async () => {
    (db.like.findUnique as jest.Mock).mockResolvedValue(null);
    (db.like.create as jest.Mock).mockResolvedValue({ id: "like1" });
    (db.like.count as jest.Mock).mockResolvedValue(4);
    (db.posts.findUnique as jest.Mock).mockResolvedValue(makePost());

    const res = mockResponse();
    await updatePostLikes(
      mockRequest({ user: STUDENT, params: { postId: "post1" } }),
      res,
    );

    expect(db.like.create).toHaveBeenCalled();
    const { post } = (res.json as jest.Mock).mock.calls[0][0];
    expect(post.likedByMe).toBe(true);
    expect(post.likeCount).toBe(4);
  });

  it("deletes the like when the user has already liked the post (unlike)", async () => {
    (db.like.findUnique as jest.Mock).mockResolvedValue({ id: "like1" });
    (db.like.delete as jest.Mock).mockResolvedValue(undefined);
    (db.like.count as jest.Mock).mockResolvedValue(2);

    const res = mockResponse();
    await updatePostLikes(
      mockRequest({ user: STUDENT, params: { postId: "post1" } }),
      res,
    );

    expect(db.like.delete).toHaveBeenCalled();
    const { post } = (res.json as jest.Mock).mock.calls[0][0];
    expect(post.likedByMe).toBe(false);
    expect(post.likeCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getPostsByHashtag
// ---------------------------------------------------------------------------
describe("getPostsByHashtag", () => {
  it("returns 400 when tag param is missing", async () => {
    const res = mockResponse();
    await getPostsByHashtag(mockRequest({ params: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("normalizes tag without leading # by prepending one", async () => {
    (db.posts.findMany as jest.Mock).mockResolvedValue([]);

    const res = mockResponse();
    await getPostsByHashtag(
      mockRequest({ user: STUDENT, params: { tag: "world" } }),
      res,
    );

    const call = (db.posts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.caption.contains).toBe("#world");
  });

  it("does not double-prefix a tag that already starts with #", async () => {
    (db.posts.findMany as jest.Mock).mockResolvedValue([]);

    const res = mockResponse();
    await getPostsByHashtag(
      mockRequest({ user: STUDENT, params: { tag: "#world" } }),
      res,
    );

    const call = (db.posts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.caption.contains).toBe("#world");
  });
});

// ---------------------------------------------------------------------------
// getComments
// ---------------------------------------------------------------------------
describe("getComments", () => {
  it("returns comments with author info", async () => {
    (db.comment.findMany as jest.Mock).mockResolvedValue([
      {
        id: "c1",
        content: "Nice!",
        createdAt: new Date(),
        postId: "post1",
        userId: STUDENT.id,
      },
    ]);
    (db.student.findUnique as jest.Mock).mockResolvedValue({
      id: STUDENT.id,
      username: "stu1",
      name: "Student One",
      profileImageUrl: null,
    });

    const res = mockResponse();
    await getComments(mockRequest({ params: { postId: "post1" } }), res);

    const { comments } = (res.json as jest.Mock).mock.calls[0][0];
    expect(comments[0].content).toBe("Nice!");
    expect(comments[0].User.username).toBe("stu1");
  });
});

// ---------------------------------------------------------------------------
// createComment
// ---------------------------------------------------------------------------
describe("createComment", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await createComment(mockRequest({ params: { postId: "post1" } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 for empty content", async () => {
    const res = mockResponse();
    await createComment(
      mockRequest({
        user: STUDENT,
        params: { postId: "post1" },
        body: { content: "  " },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when post does not exist", async () => {
    (db.posts.findUnique as jest.Mock).mockResolvedValue(null);

    const res = mockResponse();
    await createComment(
      mockRequest({
        user: STUDENT,
        params: { postId: "missing" },
        body: { content: "hi" },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("creates and returns a comment with author info", async () => {
    (db.posts.findUnique as jest.Mock).mockResolvedValue(makePost());
    (db.comment.create as jest.Mock).mockResolvedValue({
      id: "c1",
      content: "Great post!",
      postId: "post1",
      userId: STUDENT.id,
      createdAt: new Date(),
    });
    (db.student.findUnique as jest.Mock).mockResolvedValue({
      id: STUDENT.id,
      username: "stu1",
      name: "Student One",
      profileImageUrl: null,
    });

    const res = mockResponse();
    await createComment(
      mockRequest({
        user: STUDENT,
        params: { postId: "post1" },
        body: { content: "Great post!" },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    const { comment } = (res.json as jest.Mock).mock.calls[0][0];
    expect(comment.content).toBe("Great post!");
  });
});

// ---------------------------------------------------------------------------
// deleteComment
// ---------------------------------------------------------------------------
describe("deleteComment", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await deleteComment(
      mockRequest({ params: { postId: "post1", commentId: "c1" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 404 when comment does not exist", async () => {
    (db.comment.findUnique as jest.Mock).mockResolvedValue(null);

    const res = mockResponse();
    await deleteComment(
      mockRequest({
        user: STUDENT,
        params: { postId: "post1", commentId: "missing" },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 when comment belongs to a different post", async () => {
    (db.comment.findUnique as jest.Mock).mockResolvedValue({
      id: "c1",
      postId: "other-post",
      userId: STUDENT.id,
    });

    const res = mockResponse();
    await deleteComment(
      mockRequest({
        user: STUDENT,
        params: { postId: "post1", commentId: "c1" },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 403 when user did not write the comment", async () => {
    (db.comment.findUnique as jest.Mock).mockResolvedValue({
      id: "c1",
      postId: "post1",
      userId: "someone-else",
    });

    const res = mockResponse();
    await deleteComment(
      mockRequest({
        user: STUDENT,
        params: { postId: "post1", commentId: "c1" },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("deletes and confirms deletion", async () => {
    (db.comment.findUnique as jest.Mock).mockResolvedValue({
      id: "c1",
      postId: "post1",
      userId: STUDENT.id,
    });
    (db.comment.delete as jest.Mock).mockResolvedValue(undefined);

    const res = mockResponse();
    await deleteComment(
      mockRequest({
        user: STUDENT,
        params: { postId: "post1", commentId: "c1" },
      }),
      res,
    );

    expect(db.comment.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(res.json).toHaveBeenCalledWith({
      message: "Comment deleted successfully",
    });
  });
});

// ---------------------------------------------------------------------------
// getPostById
// ---------------------------------------------------------------------------
describe("getPostById", () => {
  it("returns 404 when the post does not exist", async () => {
    (db.posts.findUnique as jest.Mock).mockResolvedValue(null);

    const res = mockResponse();
    await getPostById(
      mockRequest({ user: STUDENT, params: { postId: "missing" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Post not found" });
  });

  it("returns the post with likedByMe=true when the user has liked it", async () => {
    (db.posts.findUnique as jest.Mock).mockResolvedValue(
      makePost({ likes: [{ id: "like1" }] }),
    );

    const res = mockResponse();
    await getPostById(
      mockRequest({ user: STUDENT, params: { postId: "post1" } }),
      res,
    );

    const { post } = (res.json as jest.Mock).mock.calls[0][0];
    expect(post.likedByMe).toBe(true);
    expect(post.likeCount).toBe(3);
    expect(post.commentCount).toBe(1);
    expect(post.User.username).toBe("stu1");
  });

  it("returns the post with likedByMe=false when the user has not liked it", async () => {
    (db.posts.findUnique as jest.Mock).mockResolvedValue(
      makePost({ likes: [] }),
    );

    const res = mockResponse();
    await getPostById(
      mockRequest({ user: STUDENT, params: { postId: "post1" } }),
      res,
    );

    const { post } = (res.json as jest.Mock).mock.calls[0][0];
    expect(post.likedByMe).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getUserPosts
// ---------------------------------------------------------------------------
describe("getUserPosts", () => {
  it("returns all posts by the given userId (student)", async () => {
    (db.posts.findMany as jest.Mock).mockResolvedValue([makePost()]);

    const res = mockResponse();
    await getUserPosts(mockRequest({ params: { userId: STUDENT.id } }), res);

    const call = (db.posts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.OR).toEqual([
      { studentId: STUDENT.id },
      { organisationId: STUDENT.id },
    ]);
    const { posts } = (res.json as jest.Mock).mock.calls[0][0];
    expect(posts).toHaveLength(1);
    expect(posts[0].likeCount).toBe(3);
    expect(posts[0].User.username).toBe("stu1");
  });

  it("returns an empty array when the user has no posts", async () => {
    (db.posts.findMany as jest.Mock).mockResolvedValue([]);

    const res = mockResponse();
    await getUserPosts(
      mockRequest({ params: { userId: "no-posts-user" } }),
      res,
    );

    const { posts } = (res.json as jest.Mock).mock.calls[0][0];
    expect(posts).toHaveLength(0);
  });
});
