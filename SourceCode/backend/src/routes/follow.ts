import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import followController from "../controllers/followController";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Follow/unfollow a user
router.post("/:targetId", followController.followUser);
router.delete("/:targetId", followController.unfollowUser);

// Check if following
router.get("/check/:targetId", followController.checkFollowing);

// Get follow counts for a user
router.get("/counts/:userId", followController.getFollowCounts);

// Get followers/following lists
router.get("/followers/:userId", followController.getFollowers);
router.get("/following/:userId", followController.getFollowing);

export default router;
