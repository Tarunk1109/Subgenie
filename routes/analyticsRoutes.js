import express from "express";
import {
  getSummary,
  getCostPerUse,
  getInsights,
} from "../controllers/analyticsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/summary", protect, getSummary);
router.get("/cost-per-use", protect, getCostPerUse);
router.get("/insights", protect, getInsights);

export default router;
