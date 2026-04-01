import Subscription from "../models/Subscription.js";

export const createSubscription = async (req, res) => {
  const { name, cost, category, billingCycle } = req.body;

  const subscription = await Subscription.create({
    user: req.user._id,
    name,
    cost,
    category,
    billingCycle,
  });

  res.status(201).json(subscription);
};

export const getSubscriptions = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = { user: req.user._id };

  if (req.query.category) {
    query.category = req.query.category;
  }

  if (req.query.billingCycle) {
    query.billingCycle = req.query.billingCycle;
  }

  if (req.query["cost[lte]"]) {
    query.cost = { ...query.cost, $lte: Number(req.query["cost[lte]"]) };
  }

  if (req.query["cost[gte]"]) {
    query.cost = { ...query.cost, $gte: Number(req.query["cost[gte]"]) };
  }

  if (req.query.q) {
    query.name = { $regex: req.query.q, $options: "i" };
  }

  let sortBy = "-createdAt";
  if (req.query.sort) {
    sortBy = req.query.sort.split(",").join(" ");
  }

  const subscriptions = await Subscription.find(query)
    .sort(sortBy)
    .skip(skip)
    .limit(limit);

  const total = await Subscription.countDocuments(query);

  res.status(200).json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    data: subscriptions,
  });
};

export const searchSubscriptions = async (req, res) => {
  const keyword = req.query.q || "";

  const subscriptions = await Subscription.find({
    user: req.user._id,
    name: { $regex: keyword, $options: "i" },
  });

  res.status(200).json(subscriptions);
};

export const getSubscriptionById = async (req, res) => {
  const subscription = await Subscription.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!subscription) {
    return res.status(404).json({ message: "Subscription not found" });
  }

  res.status(200).json(subscription);
};

export const updateSubscription = async (req, res) => {
  const subscription = await Subscription.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!subscription) {
    return res.status(404).json({ message: "Subscription not found" });
  }

  subscription.name = req.body.name || subscription.name;
  subscription.cost = req.body.cost ?? subscription.cost;
  subscription.category = req.body.category || subscription.category;
  subscription.billingCycle = req.body.billingCycle || subscription.billingCycle;

  const updatedSubscription = await subscription.save();
  res.status(200).json(updatedSubscription);
};

export const deleteSubscription = async (req, res) => {
  const subscription = await Subscription.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!subscription) {
    return res.status(404).json({ message: "Subscription not found" });
  }

  await subscription.deleteOne();
  res.status(200).json({ message: "Subscription deleted successfully" });
};