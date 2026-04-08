import express from "express";
import {
  renderLanding,
  renderLogin,
  renderRegister,
  handleLogin,
  handleRegister,
  handleLogout,
  renderDashboard,
  renderSubscriptions,
  renderUsage,
  renderInsights,
} from "../controllers/viewController.js";
import { viewProtect, injectUser } from "../middleware/viewAuthMiddleware.js";

const router = express.Router();

router.get("/", injectUser, renderLanding);
router.get("/login", renderLogin);
router.post("/login", handleLogin);
router.get("/register", renderRegister);
router.post("/register", handleRegister);
router.get("/logout", handleLogout);

router.get("/dashboard", viewProtect, renderDashboard);
router.get("/subscriptions", viewProtect, renderSubscriptions);
router.get("/usage/:subscriptionId", viewProtect, renderUsage);
router.get("/insights", viewProtect, renderInsights);

export default router;
