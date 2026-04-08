import Subscription from "../models/Subscription.js";
import UsageLog from "../models/UsageLog.js";

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const getSummary = async (req, res) => {
  const userId = req.user._id;
  const monthStart = getMonthStart();

  const subscriptions = await Subscription.find({ user: userId });
  const totalSubscriptions = subscriptions.length;
  const totalMonthlySpend = subscriptions.reduce((sum, sub) => {
    return sum + (sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost);
  }, 0);

  const usesThisMonth = await UsageLog.countDocuments({
    user: userId,
    action: "used",
    date: { $gte: monthStart },
  });

  const avgCostPerUse =
    usesThisMonth > 0
      ? Math.round((totalMonthlySpend / usesThisMonth) * 100) / 100
      : null;

  res.status(200).json({
    totalSubscriptions,
    totalMonthlySpend: Math.round(totalMonthlySpend * 100) / 100,
    usesThisMonth,
    avgCostPerUse,
  });
};

export const getCostPerUse = async (req, res) => {
  const userId = req.user._id;
  const monthStart = getMonthStart();

  const subscriptions = await Subscription.find({ user: userId });

  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      const useCount = await UsageLog.countDocuments({
        subscription: sub._id,
        action: "used",
        date: { $gte: monthStart },
      });

      const monthlyCost =
        sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost;
      const costPerUse =
        useCount > 0 ? Math.round((monthlyCost / useCount) * 100) / 100 : null;

      return {
        _id: sub._id,
        name: sub.name,
        category: sub.category,
        billingCycle: sub.billingCycle,
        monthlyCost: Math.round(monthlyCost * 100) / 100,
        useCount,
        costPerUse,
      };
    })
  );

  results.sort((a, b) => {
    if (a.costPerUse === null) return -1;
    if (b.costPerUse === null) return 1;
    return b.costPerUse - a.costPerUse;
  });

  res.status(200).json(results);
};

export const getInsights = async (req, res) => {
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
        recommendation = `${sub.name} costs $${costPerUse.toFixed(2)} per use — over half the subscription price each time. Consider alternatives.`;
      }
    }

    if (flags.length > 0) {
      insights.push({
        _id: sub._id,
        name: sub.name,
        category: sub.category,
        monthlyCost: Math.round(monthlyCost * 100) / 100,
        useCount,
        costPerUse: costPerUse ? Math.round(costPerUse * 100) / 100 : null,
        flags,
        recommendation,
      });
    }
  }

  insights.sort((a, b) => {
    const priority = { unused: 0, high_cost_per_use: 1, low_usage: 2 };
    const aP = Math.min(...a.flags.map((f) => priority[f] ?? 3));
    const bP = Math.min(...b.flags.map((f) => priority[f] ?? 3));
    return aP - bP;
  });

  res.status(200).json({
    total: insights.length,
    potentialSavings: Math.round(
      insights
        .filter((i) => i.flags.includes("unused"))
        .reduce((sum, i) => sum + i.monthlyCost, 0) * 100
    ) / 100,
    insights,
  });
};
