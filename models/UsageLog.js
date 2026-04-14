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

// ─── Indexes for query optimization ──────────────────────────────────────────
usageLogSchema.index({ user: 1 });
usageLogSchema.index({ subscription: 1 });
usageLogSchema.index({ user: 1, date: -1 });
usageLogSchema.index({ user: 1, action: 1 });
usageLogSchema.index({ user: 1, subscription: 1, date: -1 });
usageLogSchema.index({ subscription: 1, action: 1, date: -1 });

const UsageLog = mongoose.model("UsageLog", usageLogSchema);

export default UsageLog;
