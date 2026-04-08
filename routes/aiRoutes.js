import express from "express";
import { getAiSuggestions, getAlternatives } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/suggestions", protect, getAiSuggestions);
router.get("/alternatives/:id", protect, getAlternatives);

export default router;
