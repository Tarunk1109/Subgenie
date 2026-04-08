import OpenAI from "openai";
import Subscription from "../models/Subscription.js";
import UsageLog from "../models/UsageLog.js";

const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const getAiSuggestions = async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({
      error: "OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.",
    });
  }

  const userId = req.user._id.toString();
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.status(200).json({ suggestions: cached.suggestions });
  }

  const monthStart = getMonthStart();
  const subscriptions = await Subscription.find({ user: req.user._id });

  if (subscriptions.length === 0) {
    return res.status(200).json({ suggestions: [] });
  }

  const subData = await Promise.all(
    subscriptions.map(async (sub) => {
      const useCount = await UsageLog.countDocuments({
        subscription: sub._id,
        action: "used",
        date: { $gte: monthStart },
      });
      const monthlyCost =
        sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost;
      return {
        name: sub.name,
        monthlyCost: Math.round(monthlyCost * 100) / 100,
        category: sub.category,
        billingCycle: sub.billingCycle,
        usesThisMonth: useCount,
        costPerUse: useCount > 0 ? Math.round((monthlyCost / useCount) * 100) / 100 : null,
      };
    })
  );

  const totalSpend = subData.reduce((s, d) => s + d.monthlyCost, 0);

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are a subscription cost optimization advisor. Analyze the user's subscription data and provide 3-5 actionable suggestions to save money. Return ONLY a JSON array where each item has: title (short action), detail (1-2 sentence explanation), estimatedSavings (number or null). No markdown, no code fences, just the JSON array.",
        },
        {
          role: "user",
          content: `My subscriptions (total $${totalSpend.toFixed(2)}/mo):\n${JSON.stringify(subData, null, 2)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "[]";
    let suggestions;
    try {
      suggestions = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      suggestions = match ? JSON.parse(match[0]) : [];
    }

    cache.set(userId, { suggestions, timestamp: Date.now() });

    res.status(200).json({ suggestions });
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(200).json({
      error: "Failed to get AI suggestions. Check your API key and billing.",
    });
  }
};

export const getAlternatives = async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({
      error: "OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.",
    });
  }

  const sub = await Subscription.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!sub) {
    return res.status(404).json({ error: "Subscription not found" });
  }

  const monthStart = getMonthStart();
  const useCount = await UsageLog.countDocuments({
    subscription: sub._id,
    action: "used",
    date: { $gte: monthStart },
  });

  const monthlyCost = sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost;
  const cacheKey = `alt_${sub._id}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.status(200).json(cached.data);
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            `You are a subscription alternatives advisor. The user has a subscription and wants cheaper or better alternatives. Return ONLY a JSON object with: ` +
            `"verdict" (one of "keep", "downgrade", "switch", "cancel"), ` +
            `"verdictReason" (1 sentence why), ` +
            `"alternatives" (array of 3-5 objects, each with: "name", "cost" (monthly price as number or 0 for free), "pros" (short string), "cons" (short string), "url" (website URL or null))` +
            `. No markdown, no code fences, just the JSON object.`,
        },
        {
          role: "user",
          content:
            `Subscription: ${sub.name}\nCategory: ${sub.category}\nCost: $${monthlyCost.toFixed(2)}/month (billed ${sub.billingCycle})\nUsage: ${useCount} times this month\n\nFind cheaper or better alternatives.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : { alternatives: [] };
    }

    const data = {
      subscription: {
        name: sub.name,
        category: sub.category,
        monthlyCost: Math.round(monthlyCost * 100) / 100,
        usesThisMonth: useCount,
      },
      verdict: result.verdict || "keep",
      verdictReason: result.verdictReason || "",
      alternatives: result.alternatives || [],
    };

    cache.set(cacheKey, { data, timestamp: Date.now() });
    res.status(200).json(data);
  } catch (err) {
    console.error("OpenAI alternatives error:", err.message);
    res.status(200).json({
      error: "Failed to find alternatives. Check your API key.",
    });
  }
};

export const getAlternativesRaw = async (userId, subName) => {
  const sub = await Subscription.findOne({
    user: userId,
    name: { $regex: `^${subName}$`, $options: "i" },
  });
  if (!sub) return null;

  const monthStart = getMonthStart();
  const useCount = await UsageLog.countDocuments({
    subscription: sub._id,
    action: "used",
    date: { $gte: monthStart },
  });
  const mc = sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost;

  if (!process.env.OPENAI_API_KEY) return { error: "API key not set" };

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            `You are a subscription alternatives advisor. Return ONLY a JSON object with: "verdict" ("keep"/"downgrade"/"switch"/"cancel"), "verdictReason" (1 sentence), "alternatives" (array of 3 objects: "name", "cost" (number), "pros", "cons"). No markdown.`,
        },
        {
          role: "user",
          content: `${sub.name} ($${mc.toFixed(2)}/mo, ${sub.category}, ${useCount} uses this month). Find alternatives.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : { alternatives: [] };
    }
  } catch {
    return { error: "AI request failed" };
  }
};

export const getAiSuggestionsRaw = async (userId) => {
  const monthStart = getMonthStart();
  const subscriptions = await Subscription.find({ user: userId });

  if (subscriptions.length === 0) return [];

  const subData = await Promise.all(
    subscriptions.map(async (sub) => {
      const useCount = await UsageLog.countDocuments({
        subscription: sub._id,
        action: "used",
        date: { $gte: monthStart },
      });
      const mc = sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost;
      return {
        name: sub.name,
        monthlyCost: Math.round(mc * 100) / 100,
        usesThisMonth: useCount,
        costPerUse: useCount > 0 ? Math.round((mc / useCount) * 100) / 100 : null,
      };
    })
  );

  if (!process.env.OPENAI_API_KEY) return [];

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are a subscription cost advisor. Give 3-5 short suggestions. Return ONLY a JSON array with: title, detail, estimatedSavings (number or null). No markdown.",
        },
        {
          role: "user",
          content: `Subscriptions:\n${JSON.stringify(subData)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "[]";
    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      return match ? JSON.parse(match[0]) : [];
    }
  } catch {
    return [];
  }
};
