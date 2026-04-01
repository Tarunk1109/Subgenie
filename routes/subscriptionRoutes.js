import express from "express";
import {
  createSubscription,
  deleteSubscription,
  getSubscriptionById,
  getSubscriptions,
  searchSubscriptions,
  updateSubscription,
} from "../controllers/subscriptionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/search", protect, searchSubscriptions);

router
  .route("/")
  .get(protect, getSubscriptions)
  .post(protect, createSubscription);

router
  .route("/:id")
  .get(protect, getSubscriptionById)
  .put(protect, updateSubscription)
  .delete(protect, deleteSubscription);

export default router;