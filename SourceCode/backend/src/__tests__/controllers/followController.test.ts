import prisma from "../../utils/prisma";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkFollowing,
  getFollowCounts,
} from "../../controllers/followController";
import { mockRequest, mockResponse } from "../helpers";

jest.mock("../../utils/prisma");

const db = prisma as jest.Mocked<typeof prisma>;

const STUDENT = { id: "stu1", email: "s@test.com", role: "STUDENT" as const };
const TARGET_ORG_ID = "org1";

const makeFollow = (overrides = {}) => ({
  id: "follow1",
  followerId: STUDENT.id,
  followerType: "STUDENT",
  followingId: TARGET_ORG_ID,
  followingType: "ORGANISATION",
  createdAt: new Date(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// followUser
// ---------------------------------------------------------------------------
describe("followUser", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await followUser(mockRequest({ params: { targetId: TARGET_ORG_ID } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when targetId is missing", async () => {
    const res = mockResponse();
    await followUser(mockRequest({ user: STUDENT, params: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Target ID is required" });
  });

  it("returns 400 when user tries to follow themselves", async () => {
    const res = mockResponse();
    await followUser(
      mockRequest({ user: STUDENT, params: { targetId: STUDENT.id } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Cannot follow yourself",
    });
  });

  it("returns 404 when target user does not exist", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue(null);
    (db.organisation.findUnique as jest.Mock).mockResolvedValue(null);

    const res = mockResponse();
    await followUser(
      mockRequest({ user: STUDENT, params: { targetId: "ghost" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("returns 400 when already following the target", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue(null);
    (db.organisation.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ORG_ID,
    });
    (db.follow.findUnique as jest.Mock).mockResolvedValue(makeFollow());

    const res = mockResponse();
    await followUser(
      mockRequest({ user: STUDENT, params: { targetId: TARGET_ORG_ID } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Already following this user",
    });
  });

  it("creates a follow record and returns 201", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue(null);
    (db.organisation.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ORG_ID,
    });
    (db.follow.findUnique as jest.Mock).mockResolvedValue(null);
    (db.follow.create as jest.Mock).mockResolvedValue(makeFollow());

    const res = mockResponse();
    await followUser(
      mockRequest({ user: STUDENT, params: { targetId: TARGET_ORG_ID } }),
      res,
    );

    expect(db.follow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          followerId: STUDENT.id,
          followingId: TARGET_ORG_ID,
          followingType: "ORGANISATION",
        }),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: "Followed successfully" });
  });
});

// ---------------------------------------------------------------------------
// unfollowUser
// ---------------------------------------------------------------------------
describe("unfollowUser", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await unfollowUser(
      mockRequest({ params: { targetId: TARGET_ORG_ID } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 404 when not following the target", async () => {
    (db.follow.findUnique as jest.Mock).mockResolvedValue(null);

    const res = mockResponse();
    await unfollowUser(
      mockRequest({ user: STUDENT, params: { targetId: TARGET_ORG_ID } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Not following this user",
    });
  });

  it("deletes the follow record and returns success", async () => {
    (db.follow.findUnique as jest.Mock).mockResolvedValue(makeFollow());
    (db.follow.delete as jest.Mock).mockResolvedValue(undefined);

    const res = mockResponse();
    await unfollowUser(
      mockRequest({ user: STUDENT, params: { targetId: TARGET_ORG_ID } }),
      res,
    );

    expect(db.follow.delete).toHaveBeenCalledWith({ where: { id: "follow1" } });
    expect(res.json).toHaveBeenCalledWith({
      message: "Unfollowed successfully",
    });
  });
});

// ---------------------------------------------------------------------------
// checkFollowing
// ---------------------------------------------------------------------------
describe("checkFollowing", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await checkFollowing(
      mockRequest({ params: { targetId: TARGET_ORG_ID } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns isFollowing: true when a follow record exists", async () => {
    (db.follow.findUnique as jest.Mock).mockResolvedValue(makeFollow());

    const res = mockResponse();
    await checkFollowing(
      mockRequest({ user: STUDENT, params: { targetId: TARGET_ORG_ID } }),
      res,
    );

    expect(res.json).toHaveBeenCalledWith({ isFollowing: true });
  });

  it("returns isFollowing: false when no follow record exists", async () => {
    (db.follow.findUnique as jest.Mock).mockResolvedValue(null);

    const res = mockResponse();
    await checkFollowing(
      mockRequest({ user: STUDENT, params: { targetId: TARGET_ORG_ID } }),
      res,
    );

    expect(res.json).toHaveBeenCalledWith({ isFollowing: false });
  });
});

// ---------------------------------------------------------------------------
// getFollowCounts
// ---------------------------------------------------------------------------
describe("getFollowCounts", () => {
  it("returns 400 when userId param is missing", async () => {
    const res = mockResponse();
    await getFollowCounts(mockRequest({ params: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns follower and following counts", async () => {
    (db.follow.count as jest.Mock)
      .mockResolvedValueOnce(12) // followersCount
      .mockResolvedValueOnce(5); // followingCount

    const res = mockResponse();
    await getFollowCounts(mockRequest({ params: { userId: STUDENT.id } }), res);

    expect(res.json).toHaveBeenCalledWith({
      followersCount: 12,
      followingCount: 5,
    });
  });
});

// ---------------------------------------------------------------------------
// getFollowers
// ---------------------------------------------------------------------------
describe("getFollowers", () => {
  it("returns 400 when userId param is missing", async () => {
    const res = mockResponse();
    await getFollowers(mockRequest({ params: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns follower list with profile info", async () => {
    (db.follow.findMany as jest.Mock).mockResolvedValue([makeFollow()]);
    (db.student.findUnique as jest.Mock).mockResolvedValue({
      id: STUDENT.id,
      username: "stu1",
      name: "Student One",
      profileImageUrl: null,
    });

    const res = mockResponse();
    await getFollowers(mockRequest({ params: { userId: TARGET_ORG_ID } }), res);

    const { followers } = (res.json as jest.Mock).mock.calls[0][0];
    expect(followers).toHaveLength(1);
    expect(followers[0].username).toBe("stu1");
    expect(followers[0].role).toBe("STUDENT");
  });

  it("filters out followers whose accounts no longer exist", async () => {
    (db.follow.findMany as jest.Mock).mockResolvedValue([makeFollow()]);
    (db.student.findUnique as jest.Mock).mockResolvedValue(null); // deleted account

    const res = mockResponse();
    await getFollowers(mockRequest({ params: { userId: TARGET_ORG_ID } }), res);

    const { followers } = (res.json as jest.Mock).mock.calls[0][0];
    expect(followers).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getFollowing
// ---------------------------------------------------------------------------
describe("getFollowing", () => {
  it("returns following list with org profile info", async () => {
    (db.follow.findMany as jest.Mock).mockResolvedValue([
      makeFollow({ followingType: "ORGANISATION" }),
    ]);
    (db.organisation.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ORG_ID,
      name: "Test Org",
      profileImageUrl: null,
    });

    const res = mockResponse();
    await getFollowing(mockRequest({ params: { userId: STUDENT.id } }), res);

    const { following } = (res.json as jest.Mock).mock.calls[0][0];
    expect(following).toHaveLength(1);
    expect(following[0].username).toBe("Test Org");
    expect(following[0].role).toBe("ORGANISATION");
  });

  it("returns 400 when userId param is missing", async () => {
    const res = mockResponse();
    await getFollowing(mockRequest({ params: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
