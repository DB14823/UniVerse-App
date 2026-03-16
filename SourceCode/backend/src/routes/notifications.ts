import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import notificationsController from "../controllers/notificationsController";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Push token management
router.post("/register-token", notificationsController.registerPushToken);
router.delete("/register-token", notificationsController.unregisterPushToken);

// Notification settings
router.get("/settings", notificationsController.getNotificationSettings);
router.put("/settings", notificationsController.updateNotificationSettings);

// Notification CRUD
router.get("/", notificationsController.getNotifications);
router.patch("/:id/read", notificationsController.markAsRead);
router.patch("/read-all", notificationsController.markAllAsRead);
router.delete("/:id", notificationsController.deleteNotification);

export default router;
