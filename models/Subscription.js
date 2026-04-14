import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Subscription name is required"],
      trim: true,
    },
    cost: {
      type: Number,
      required: [true, "Cost is required"],
      min: 0,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
  },
  { timestamps: true }
);

// ─── Indexes for query optimization ──────────────────────────────────────────
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ user: 1, category: 1 });
subscriptionSchema.index({ user: 1, billingCycle: 1 });
subscriptionSchema.index({ user: 1, createdAt: -1 });
subscriptionSchema.index({ user: 1, cost: 1 });
subscriptionSchema.index({ name: "text" }, { weights: { name: 10, category: 5 } });

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
