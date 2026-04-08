import mongoose from "mongoose";

const telegramUserSchema = new mongoose.Schema(
  {
    telegramChatId: {
      type: String,
      unique: true,
      required: [true, "Telegram chat ID is required"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    remindersEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const TelegramUser = mongoose.model("TelegramUser", telegramUserSchema);

export default TelegramUser;
