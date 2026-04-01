import UsageLog from "../models/UsageLog.js";
import Subscription from "../models/Subscription.js";

export const createUsageLog = async (req, res) => {
  const { subscription, date, action, notes } = req.body;

  const existingSubscription = await Subscription.findOne({
    _id: subscription,
    user: req.user._id,
  });

  if (!existingSubscription) {
    return res.status(404).json({ message: "Subscription not found for this user" });
  }

  const usageLog = await UsageLog.create({
    user: req.user._id,
    subscription,
    date,
    action,
    notes,
  });

  res.status(201).json(usageLog);
};

export const getUsageLogs = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = { user: req.user._id };

  if (req.query.subscription) {
    query.subscription = req.query.subscription;
  }

  if (req.query.action) {
    query.action = req.query.action;
  }

  if (req.query.q) {
    query.notes = { $regex: req.query.q, $options: "i" };
  }

  let sortBy = "-createdAt";
  if (req.query.sort) {
    sortBy = req.query.sort.split(",").join(" ");
  }

  const logs = await UsageLog.find(query)
    .populate("subscription", "name category cost")
    .sort(sortBy)
    .skip(skip)
    .limit(limit);

  const total = await UsageLog.countDocuments(query);

  res.status(200).json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    data: logs,
  });
};

export const getUsageLogById = async (req, res) => {
  const log = await UsageLog.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate("subscription", "name category cost");

  if (!log) {
    return res.status(404).json({ message: "Usage log not found" });
  }

  res.status(200).json(log);
};

export const updateUsageLog = async (req, res) => {
  const log = await UsageLog.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!log) {
    return res.status(404).json({ message: "Usage log not found" });
  }

  log.subscription = req.body.subscription || log.subscription;
  log.date = req.body.date || log.date;
  log.action = req.body.action || log.action;
  log.notes = req.body.notes ?? log.notes;

  const updatedLog = await log.save();
  res.status(200).json(updatedLog);
};

export const deleteUsageLog = async (req, res) => {
  const log = await UsageLog.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!log) {
    return res.status(404).json({ message: "Usage log not found" });
  }

  await log.deleteOne();
  res.status(200).json({ message: "Usage log deleted successfully" });
};