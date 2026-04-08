import dotenv from "dotenv";
dotenv.config();

import express from "express";
import expressLayouts from "express-ejs-layouts";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import usageLogRoutes from "./routes/usageLogRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import viewRoutes from "./routes/viewRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { startBot } from "./bot/telegramBot.js";

connectDB();

if (process.env.TELEGRAM_BOT_TOKEN && process.env.NODE_ENV !== "test") {
  startBot();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/usageLogs", usageLogRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);

app.use("/", viewRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
