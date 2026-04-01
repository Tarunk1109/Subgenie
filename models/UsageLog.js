import mongoose from "mongoose";

const usageLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    action: {
      type: String,
      enum: ["used", "not_used"],
      default: "used",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

const UsageLog = mongoose.model("UsageLog", usageLogSchema);

export default UsageLog;