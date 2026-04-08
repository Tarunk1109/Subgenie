import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import UsageLog from "../models/UsageLog.js";
import generateToken from "../utils/generateToken.js";

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const renderLanding = (req, res) => {
  res.render("landing", { user: req.user || null });
};

export const renderLogin = (req, res) => {
  if (req.cookies?.token) return res.redirect("/dashboard");
  res.render("login", { error: null });
};

export const renderRegister = (req, res) => {
  if (req.cookies?.token) return res.redirect("/dashboard");
  res.render("register", { error: null });
};

export const handleLogin = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user) {
    return res.render("login", { error: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.render("login", { error: "Invalid email or password" });
  }

  const token = generateToken(user._id);
  res.cookie("token", token, {
    httpOnly: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  });
  res.redirect("/dashboard");
};

export const handleRegister = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password) {
    return res.render("register", { error: "All fields are required" });
  }
  if (password.length < 6) {
    return res.render("register", {
      error: "Password must be at least 6 characters",
    });
  }
  if (password !== confirmPassword) {
    return res.render("register", { error: "Passwords do not match" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.render("register", { error: "Email already registered" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
  });

  const token = generateToken(user._id);
  res.cookie("token", token, {
    httpOnly: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  });
  res.redirect("/dashboard");
};

export const handleLogout = (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
};

export const renderDashboard = async (req, res) => {
  const userId = req.user._id;
  const monthStart = getMonthStart();

  const subscriptions = await Subscription.find({ user: userId });
  const totalSubs = subscriptions.length;
  const totalMonthlySpend = subscriptions.reduce((sum, s) => {
    return sum + (s.billingCycle === "yearly" ? s.cost / 12 : s.cost);
  }, 0);

  const usesThisMonth = await UsageLog.countDocuments({
    user: userId,
    action: "used",
    date: { $gte: monthStart },
  });

  const avgCostPerUse =
    usesThisMonth > 0 ? totalMonthlySpend / usesThisMonth : null;

  const categorySpend = {};
  for (const sub of subscriptions) {
    const mc = sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost;
    categorySpend[sub.category] = (categorySpend[sub.category] || 0) + mc;
  }

  const recentLogs = await UsageLog.find({ user: userId })
    .populate("subscription", "name")
    .sort("-date")
    .limit(5);

  res.render("dashboard", {
    user: req.user,
    totalSubs,
    totalMonthlySpend: totalMonthlySpend.toFixed(2),
    usesThisMonth,
    avgCostPerUse: avgCostPerUse ? avgCostPerUse.toFixed(2) : "N/A",
    categorySpend,
    subscriptions,
    recentLogs,
  });
};

export const renderSubscriptions = async (req, res) => {
  const userId = req.user._id;
  const monthStart = getMonthStart();

  const subscriptions = await Subscription.find({ user: userId }).sort(
    "-createdAt"
  );

  const subsWithUsage = await Promise.all(
    subscriptions.map(async (sub) => {
      const useCount = await UsageLog.countDocuments({
        subscription: sub._id,
        action: "used",
        date: { $gte: monthStart },
      });
      return { ...sub.toObject(), useCount };
    })
  );

  res.render("subscriptions", { user: req.user, subscriptions: subsWithUsage });
};

export const renderUsage = async (req, res) => {
  const userId = req.user._id;
  const subscriptionId = req.params.subscriptionId;

  const subscription = await Subscription.findOne({
    _id: subscriptionId,
    user: userId,
  });
  if (!subscription) {
    return res.redirect("/subscriptions");
  }

  const logs = await UsageLog.find({
    user: userId,
    subscription: subscriptionId,
  }).sort("-date");

  res.render("usage", { user: req.user, subscription, logs });
};

export const renderInsights = async (req, res) => {
  const userId = req.user._id;
  const monthStart = getMonthStart();

  const subscriptions = await Subscription.find({ user: userId });
  const insights = [];

  for (const sub of subscriptions) {
    const useCount = await UsageLog.countDocuments({
      subscription: sub._id,
      action: "used",
      date: { $gte: monthStart },
    });

    const monthlyCost =
      sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost;
    const costPerUse = useCount > 0 ? monthlyCost / useCount : null;

    const flags = [];
    let recommendation = null;

    if (useCount === 0) {
      flags.push("unused");
      recommendation = `You haven't used ${sub.name} this month. Consider cancelling to save $${monthlyCost.toFixed(2)}/mo.`;
    } else if (useCount < 4) {
      flags.push("low_usage");
      recommendation = `${sub.name} was only used ${useCount} time(s) this month. Try using it more or look for a cheaper plan.`;
    }

    if (costPerUse !== null && costPerUse > monthlyCost * 0.5) {
      flags.push("high_cost_per_use");
      if (!recommendation) {
        recommendation = `${sub.name} costs $${costPerUse.toFixed(2)} per use — over half the subscription price each time.`;
      }
    }

    if (flags.length > 0) {
      insights.push({
        _id: sub._id,
        name: sub.name,
        category: sub.category,
        monthlyCost: monthlyCost.toFixed(2),
        useCount,
        costPerUse: costPerUse ? costPerUse.toFixed(2) : "N/A",
        flags,
        recommendation,
      });
    }
  }

  const potentialSavings = insights
    .filter((i) => i.flags.includes("unused"))
    .reduce((sum, i) => sum + parseFloat(i.monthlyCost), 0)
    .toFixed(2);

  res.render("insights", {
    user: req.user,
    insights,
    potentialSavings,
  });
};
