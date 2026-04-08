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
  res.render("pages/landing", { user: req.user || null, pageTitle: "Home" });
};

export const renderLogin = (req, res) => {
  if (req.cookies?.token) return res.redirect("/dashboard");
  res.render("pages/login", { error: null, pageTitle: "Login", user: null });
};

export const renderRegister = (req, res) => {
  if (req.cookies?.token) return res.redirect("/dashboard");
  res.render("pages/register", { error: null, pageTitle: "Sign Up", user: null });
};

export const handleLogin = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user) {
    return res.render("pages/login", { error: "Invalid email or password", pageTitle: "Login", user: null });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.render("pages/login", { error: "Invalid email or password", pageTitle: "Login", user: null });
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
    return res.render("pages/register", { error: "All fields are required", pageTitle: "Sign Up", user: null });
  }
  if (password.length < 6) {
    return res.render("pages/register", { error: "Password must be at least 6 characters", pageTitle: "Sign Up", user: null });
  }
  if (password !== confirmPassword) {
    return res.render("pages/register", { error: "Passwords do not match", pageTitle: "Sign Up", user: null });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.render("pages/register", { error: "Email already registered", pageTitle: "Sign Up", user: null });
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

  res.render("pages/dashboard", {
    user: req.user,
    pageTitle: "Dashboard",
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

  const q = req.query.q || "";
  const categoryFilter = req.query.category || "";
  const billingCycleFilter = req.query.billingCycle || "";
  const sortParam = req.query.sort || "newest";
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = 8;

  const filter = { user: userId };
  if (q) filter.name = { $regex: q, $options: "i" };
  if (categoryFilter) filter.category = { $regex: `^${categoryFilter}$`, $options: "i" };
  if (billingCycleFilter) filter.billingCycle = billingCycleFilter;

  const sortMap = {
    newest: "-createdAt",
    oldest: "createdAt",
    "name-asc": "name",
    "name-desc": "-name",
    "cost-asc": "cost",
    "cost-desc": "-cost",
  };
  const sortValue = sortMap[sortParam] || "-createdAt";

  const totalCount = await Subscription.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const subscriptions = await Subscription.find(filter)
    .sort(sortValue)
    .skip((page - 1) * pageSize)
    .limit(pageSize);

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

  const allCategories = await Subscription.distinct("category", { user: userId });

  res.render("pages/subscriptions", {
    user: req.user,
    pageTitle: "Subscriptions",
    subscriptions: subsWithUsage,
    allCategories,
    q,
    categoryFilter,
    billingCycleFilter,
    sortParam,
    currentPage: page,
    totalPages,
    totalCount,
  });
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

  res.render("pages/usage", { user: req.user, pageTitle: subscription.name + " — Usage", subscription, logs });
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

  res.render("pages/insights", {
    user: req.user,
    pageTitle: "Insights",
    insights,
    potentialSavings,
  });
};

export const renderProfile = (req, res) => {
  res.render("pages/profile", { user: req.user, pageTitle: "Profile", success: null, error: null });
};

export const handleUpdateProfile = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !name.trim()) {
    return res.render("pages/profile", { user: req.user, pageTitle: "Profile", success: null, error: "Name is required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.render("pages/profile", { user: req.user, pageTitle: "Profile", success: null, error: "Valid email is required" });
  }

  if (password) {
    if (password.length < 6) {
      return res.render("pages/profile", { user: req.user, pageTitle: "Profile", success: null, error: "Password must be at least 6 characters" });
    }
    if (password !== confirmPassword) {
      return res.render("pages/profile", { user: req.user, pageTitle: "Profile", success: null, error: "Passwords do not match" });
    }
  }

  const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } });
  if (existingEmail) {
    return res.render("pages/profile", { user: req.user, pageTitle: "Profile", success: null, error: "Email already in use by another account" });
  }

  const user = await User.findById(req.user._id);
  user.name = name.trim();
  user.email = email.toLowerCase();

  if (password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
  }

  await user.save();
  const updatedUser = await User.findById(req.user._id).select("-password");

  res.render("pages/profile", { user: updatedUser, pageTitle: "Profile", success: "Profile updated successfully", error: null });
};

export const renderAdmin = async (req, res) => {
  const users = await User.find().select("-password").sort("-createdAt");

  const usersWithCount = await Promise.all(
    users.map(async (u) => {
      const subCount = await Subscription.countDocuments({ user: u._id });
      return { ...u.toObject(), subCount };
    })
  );

  res.render("pages/admin", {
    user: req.user,
    pageTitle: "Admin",
    users: usersWithCount,
    success: req.query.success || null,
  });
};

export const handleUpdateUserRole = async (req, res) => {
  const { role } = req.body;
  const { userId } = req.params;

  if (!["user", "admin"].includes(role)) {
    return res.redirect("/admin");
  }

  await User.findByIdAndUpdate(userId, { role });
  res.redirect("/admin?success=Role+updated+successfully");
};
