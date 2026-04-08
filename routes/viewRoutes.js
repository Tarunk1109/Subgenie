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
  renderProfile,
  handleUpdateProfile,
  renderAdmin,
  handleUpdateUserRole,
} from "../controllers/viewController.js";
import { viewProtect, viewAdminOnly, injectUser } from "../middleware/viewAuthMiddleware.js";

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
router.get("/profile", viewProtect, renderProfile);
router.post("/profile", viewProtect, handleUpdateProfile);
router.get("/admin", viewProtect, viewAdminOnly, renderAdmin);
router.post("/admin/role/:userId", viewProtect, viewAdminOnly, handleUpdateUserRole);

export default router;
