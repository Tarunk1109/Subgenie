import express from "express";
import { handleChat, handleChatAction } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, handleChat);
router.post("/action", protect, handleChatAction);

export default router;
