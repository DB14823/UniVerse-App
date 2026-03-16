import express from "express";
import paymentsController from "../controllers/paymentsController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// All payment routes require authentication
router.use(authMiddleware);

// Create a payment intent for a paid event
router.post("/create-intent", paymentsController.createPaymentIntent);

export default router;
