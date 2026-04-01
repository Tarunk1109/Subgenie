import express from "express";
import {
  createUsageLog,
  deleteUsageLog,
  getUsageLogById,
  getUsageLogs,
  updateUsageLog,
} from "../controllers/usageLogController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getUsageLogs).post(protect, createUsageLog);

router
  .route("/:id")
  .get(protect, getUsageLogById)
  .put(protect, updateUsageLog)
  .delete(protect, deleteUsageLog);

export default router;