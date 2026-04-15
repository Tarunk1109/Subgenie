import OpenAI from "openai";
import Subscription from "../models/Subscription.js";
import UsageLog from "../models/UsageLog.js";

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function findSub(subs, name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return (
    subs.find((s) => s.name.toLowerCase() === lower) ||
    subs.find((s) =>
      s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase())
    )
  );
}

async function parseIntent(text, subscriptionNames) {
  if (!process.env.OPENAI_API_KEY) return null;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const nameList = subscriptionNames.length ? subscriptionNames.join(", ") : "none yet";

  const systemPrompt = `You are SubGenie, a friendly AI assistant embedded in a subscription management web app. The user is chatting with you inside the app dashboard.

User's current subscriptions: ${nameList}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "intent": <see below>,
  "subscription": "<name or null>",
  "cost": <number or null>,
  "category": "<Entertainment|Productivity|Health|Finance|Education|Shopping|Other or null>",
  "billingCycle": "monthly" | "yearly" | null,
  "remindersToggle": "on" | "off" | null,
  "confidence": <0.0 to 1.0>,
  "reply": "<your warm, conversational reply to send back>"
}

Intent values:
- "log_usage"           — user used/watched/listened/opened a subscription
- "add_subscription"    — user bought/signed up for/got a new service
- "delete_subscription" — user wants to cancel/remove/delete a subscription
- "list_subscriptions"  — user wants to see their subscriptions
- "get_report"          — user wants spending stats or monthly summary
- "query_spend"         — user asking total monthly cost
- "get_suggestions"     — user wants AI savings tips
- "greeting"            — hello, hi, hey, how are you
- "unknown"             — unrelated or too ambiguous

Rules:
- For log_usage / delete_subscription: match subscription name from the list (fuzzy ok).
- For add_subscription: extract name, cost if mentioned, infer category.
- reply should be warm and human — like a smart friend, not a bot.
- For greeting: introduce yourself briefly and list what you can do.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.3,
      max_tokens: 250,
    });

    const raw = response.choices[0]?.message?.content?.trim() || "";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Chat NLP error:", err.message);
    return null;
  }
}

export const handleChat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ reply: "Please type a message." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        reply: "AI features are not configured on this server. Please add your OPENAI_API_KEY.",
      });
    }

    const userId = req.user._id;
    const subs = await Subscription.find({ user: userId }).sort("name");
    const subNames = subs.map((s) => s.name);

    const parsed = await parseIntent(message.trim(), subNames);

    if (!parsed) {
      return res.status(200).json({
        reply: "I didn't quite catch that. Try something like: \"just watched Netflix\", \"add Spotify at $9.99\", or \"how much am I spending?\"",
      });
    }

    const { intent, subscription, cost, category, billingCycle, reply, confidence } = parsed;

    // ── Greeting ──────────────────────────────────────────────────────────────
    if (intent === "greeting") {
      return res.status(200).json({ reply });
    }

    // ── Log usage ─────────────────────────────────────────────────────────────
    if (intent === "log_usage") {
      const sub = findSub(subs, subscription);
      if (!sub) {
        return res.status(200).json({
          reply: `I couldn't find "${subscription}" in your subscriptions. You have: ${subNames.join(", ") || "none yet"}.`,
        });
      }
      await UsageLog.create({ user: userId, subscription: sub._id, action: "used" });
      return res.status(200).json({ reply: reply || `Logged your usage of ${sub.name}!` });
    }

    // ── Add subscription ──────────────────────────────────────────────────────
    if (intent === "add_subscription") {
      if (!subscription) {
        return res.status(200).json({ reply: "What's the name of the service you want to add?" });
      }
      if (cost === null || cost === undefined) {
        return res.status(200).json({
          reply: reply || `Got it — ${subscription}! How much does it cost per month?`,
          pendingAction: "awaiting_cost",
          pendingData: { name: subscription, category: category || "Other", billingCycle: billingCycle || "monthly" },
        });
      }
      const sub = await Subscription.create({
        user: userId,
        name: subscription,
        cost,
        category: category || "Other",
        billingCycle: billingCycle || "monthly",
      });
      return res.status(200).json({
        reply: reply || `Added ${sub.name} — $${sub.cost.toFixed(2)}/${sub.billingCycle} under ${sub.category}!`,
        reload: true,
      });
    }

    // ── Delete subscription ───────────────────────────────────────────────────
    if (intent === "delete_subscription") {
      const sub = findSub(subs, subscription);
      if (!sub) {
        return res.status(200).json({
          reply: `I couldn't find "${subscription}". Your subscriptions: ${subNames.join(", ") || "none"}.`,
        });
      }
      return res.status(200).json({
        reply: `Are you sure you want to delete **${sub.name}** ($${(sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost).toFixed(2)}/mo)? Type "yes" to confirm.`,
        pendingAction: "awaiting_delete_confirm",
        pendingData: { subId: sub._id.toString(), subName: sub.name },
      });
    }

    // ── List subscriptions ────────────────────────────────────────────────────
    if (intent === "list_subscriptions") {
      if (!subs.length) {
        return res.status(200).json({ reply: "You don't have any subscriptions yet. Tell me what you're signed up for!" });
      }
      let total = 0;
      const lines = subs.map((s, i) => {
        const mc = s.billingCycle === "yearly" ? s.cost / 12 : s.cost;
        total += mc;
        return `${i + 1}. ${s.name} — $${s.cost.toFixed(2)}/${s.billingCycle} (${s.category})`;
      });
      return res.status(200).json({
        reply: `Here are your ${subs.length} subscriptions:\n\n${lines.join("\n")}\n\nTotal: $${total.toFixed(2)}/mo`,
      });
    }

    // ── Query spend ───────────────────────────────────────────────────────────
    if (intent === "query_spend") {
      let total = 0;
      subs.forEach((s) => { total += s.billingCycle === "yearly" ? s.cost / 12 : s.cost; });
      return res.status(200).json({
        reply: `You're spending **$${total.toFixed(2)}/month** across ${subs.length} subscription${subs.length !== 1 ? "s" : ""}. Want the full breakdown?`,
      });
    }

    // ── Get report ────────────────────────────────────────────────────────────
    if (intent === "get_report") {
      const monthStart = getMonthStart();
      let totalSpend = 0, totalUses = 0;
      const lines = [];
      for (const sub of subs) {
        const useCount = await UsageLog.countDocuments({ subscription: sub._id, action: "used", date: { $gte: monthStart } });
        const mc = sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost;
        totalSpend += mc;
        totalUses += useCount;
        const cpu = useCount > 0 ? `$${(mc / useCount).toFixed(2)}/use` : "unused";
        lines.push(`${sub.name}: ${useCount} uses — ${cpu}`);
      }
      return res.status(200).json({
        reply: `📊 This month: $${totalSpend.toFixed(2)} total, ${totalUses} uses\n\n${lines.join("\n")}`,
      });
    }

    // ── Get suggestions (redirects to insights page) ──────────────────────────
    if (intent === "get_suggestions") {
      return res.status(200).json({
        reply: "Head over to the Insights page — I've got your full AI analysis there with savings suggestions and flagged subscriptions!",
        redirect: "/insights",
      });
    }

    // ── Unknown ───────────────────────────────────────────────────────────────
    return res.status(200).json({
      reply: reply || "I can help you log usage, add or remove subscriptions, check your spending, or get a monthly report. What would you like to do?",
    });

  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(200).json({ reply: "Something went wrong on my end. Try again in a moment." });
  }
};

// Handles multi-step confirmation actions (delete confirm, awaiting cost)
export const handleChatAction = async (req, res) => {
  try {
    const { action, data, message } = req.body;
    const userId = req.user._id;

    // ── Confirm delete ────────────────────────────────────────────────────────
    if (action === "awaiting_delete_confirm") {
      const lower = message.toLowerCase().trim();
      const yes = ["yes", "yeah", "yep", "sure", "ok", "confirm", "do it", "delete it"].some((w) => lower.includes(w));
      if (yes) {
        const sub = await Subscription.findOne({ _id: data.subId, user: userId });
        if (sub) {
          await UsageLog.deleteMany({ subscription: sub._id });
          await sub.deleteOne();
          return res.status(200).json({ reply: `Done! Removed ${data.subName} and its usage history.`, reload: true });
        }
      }
      return res.status(200).json({ reply: "No worries, keeping it as is." });
    }

    // ── Awaiting cost for add ─────────────────────────────────────────────────
    if (action === "awaiting_cost") {
      const costMatch = message.match(/[\d]+\.?[\d]*/);
      const cost = costMatch ? parseFloat(costMatch[0]) : NaN;
      if (isNaN(cost) || cost < 0) {
        return res.status(200).json({ reply: "That doesn't look like a valid amount. How much per month? (e.g. 9.99)", pendingAction: action, pendingData: data });
      }
      const sub = await Subscription.create({
        user: userId,
        name: data.name,
        cost,
        category: data.category || "Other",
        billingCycle: data.billingCycle || "monthly",
      });
      return res.status(200).json({
        reply: `Done! Added ${sub.name} — $${sub.cost.toFixed(2)}/${sub.billingCycle} 🎉`,
        reload: true,
      });
    }

    return res.status(400).json({ reply: "Unknown action." });
  } catch (err) {
    console.error("Chat action error:", err.message);
    res.status(200).json({ reply: "Something went wrong. Try again." });
  }
};
