import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import TelegramUser from "../models/TelegramUser.js";
import Subscription from "../models/Subscription.js";
import UsageLog from "../models/UsageLog.js";
import { getAiSuggestionsRaw, getAlternativesRaw } from "../controllers/aiController.js";

let bot;

// ─── In-memory conversation state per chatId ─────────────────────────────────
// Shape: { step, data: { name, cost, category, billingCycle, targetSub, email } }
const convState = new Map();

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function getLinkedUser(chatId) {
  const link = await TelegramUser.findOne({ telegramChatId: String(chatId) }).populate("user", "-password");
  return link?.user || null;
}

function send(chatId, text, opts = {}) {
  return bot.sendMessage(chatId, text, opts).catch((err) => {
    console.error("Telegram send error:", err.message);
  });
}

// ─── NLP Intent Parser ───────────────────────────────────────────────────────
async function parseIntent(text, subscriptionNames, conversationContext = null) {
  if (!process.env.OPENAI_API_KEY) return null;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const nameList = subscriptionNames.length ? subscriptionNames.join(", ") : "none yet";

  const contextNote = conversationContext
    ? `\nConversation context: ${conversationContext}`
    : "";

  const systemPrompt = `You are SubGenie, a friendly subscription management assistant on Telegram. A user is chatting with you casually — figure out what they want and respond naturally.${contextNote}

User's current subscriptions: ${nameList}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "intent": <see below>,
  "subscription": "<name — exact match from list, new service name, or null>",
  "cost": <monthly cost as number, or null>,
  "category": "<Entertainment|Productivity|Health|Finance|Education|Shopping|Other, or null>",
  "billingCycle": "monthly" | "yearly" | null,
  "remindersToggle": "on" | "off" | null,
  "confidence": <0.0 to 1.0>,
  "naturalReply": "<your short, warm, 1-sentence reply to send back to the user>"
}

Intent values:
- "log_usage"         — user used/watched/listened to/played/opened/read a subscription
- "add_subscription"  — user bought/subscribed to/signed up for/got a new service
- "delete_subscription" — user wants to cancel/remove/delete a subscription
- "list_subscriptions" — user wants to see all their subscriptions
- "get_report"        — user wants spending stats, cost per use, or monthly summary
- "get_suggestions"   — user wants AI tips, savings advice, what to cut
- "compare_service"   — user wants alternatives or comparisons for a service
- "toggle_reminders"  — user wants to turn reminders on or off
- "query_spend"       — user asking total monthly spend (simpler than full report)
- "unknown"           — message is unrelated, greetings, or too ambiguous

Rules:
- For "log_usage": subscription must closely match a name from the list; use fuzzy matching.
- For "add_subscription": extract name, cost (if mentioned), billingCycle (default monthly), infer category.
- For "delete_subscription": subscription must match a name from the list.
- For "compare_service": subscription should match a name from the list or be a service name the user mentions.
- naturalReply should feel human — like a smart friend, not a bot. Confirm what you're doing or ask the one missing thing.
- If confidence < 0.7 for log_usage or delete_subscription, set intent to "unknown" and ask for clarification in naturalReply.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.2,
      max_tokens: 200,
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    // Strip markdown code fences if GPT adds them despite instructions
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("NLP parse error:", err.message);
    return null;
  }
}

// ─── Fuzzy subscription finder ───────────────────────────────────────────────
function findSub(subs, name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return (
    subs.find((s) => s.name.toLowerCase() === lower) ||
    subs.find((s) => s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase()))
  );
}

// ─── Format subscription list ────────────────────────────────────────────────
function formatSubList(subs) {
  let total = 0;
  const lines = subs.map((s, i) => {
    const mc = s.billingCycle === "yearly" ? s.cost / 12 : s.cost;
    total += mc;
    return `${i + 1}. ${s.name} — $${s.cost.toFixed(2)}/${s.billingCycle} (${s.category})`;
  });
  return `Your subscriptions (${subs.length}):\n\n${lines.join("\n")}\n\nTotal: $${total.toFixed(2)}/mo`;
}

// ─── Handle all intents ──────────────────────────────────────────────────────
async function handleIntent(chatId, user, parsed, subs) {
  const { intent, subscription, cost, category, billingCycle, remindersToggle, naturalReply, confidence } = parsed;

  switch (intent) {

    // ── Log usage ──────────────────────────────────────────────────────────
    case "log_usage": {
      const sub = findSub(subs, subscription);
      if (!sub) {
        return send(chatId,
          `I couldn't find "${subscription}" in your subscriptions. ` +
          (subs.length ? `You have: ${subs.map((s) => s.name).join(", ")}` : "You don't have any subscriptions yet — tell me what you signed up for!")
        );
      }
      await UsageLog.create({ user: user._id, subscription: sub._id, action: "used" });
      return send(chatId, naturalReply || `Logged! I've noted your usage of ${sub.name} 👍`);
    }

    // ── Add subscription ───────────────────────────────────────────────────
    case "add_subscription": {
      if (!subscription) {
        return send(chatId, "What's the name of the service you signed up for?");
      }

      const resolvedCategory = category || "Other";
      const resolvedCycle = billingCycle === "yearly" ? "yearly" : "monthly";

      if (cost === null || cost === undefined) {
        // Ask for cost conversationally, save partial state
        convState.set(chatId, {
          step: "awaiting_cost",
          data: { name: subscription, category: resolvedCategory, billingCycle: resolvedCycle },
        });
        return send(chatId,
          naturalReply ||
          `Nice, got it — ${subscription}! How much does it cost per ${resolvedCycle === "yearly" ? "year" : "month"}?`
        );
      }

      const sub = await Subscription.create({
        user: user._id,
        name: subscription,
        cost,
        category: resolvedCategory,
        billingCycle: resolvedCycle,
      });
      const cycleLabel = sub.billingCycle === "yearly" ? "year" : "month";
      return send(chatId,
        naturalReply ||
        `Done! Added ${sub.name} — $${sub.cost.toFixed(2)}/${cycleLabel} under ${sub.category}.`
      );
    }

    // ── Delete subscription ────────────────────────────────────────────────
    case "delete_subscription": {
      const sub = findSub(subs, subscription);
      if (!sub) {
        return send(chatId,
          `I couldn't find "${subscription}" to remove. ` +
          (subs.length ? `Your subscriptions are: ${subs.map((s) => s.name).join(", ")}` : "You don't have any subscriptions yet.")
        );
      }
      // Ask for confirmation
      convState.set(chatId, { step: "awaiting_delete_confirm", data: { targetSub: sub } });
      return send(chatId,
        `Just to confirm — you want to delete **${sub.name}** ($${(sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost).toFixed(2)}/mo)? Reply yes or no.`,
        { parse_mode: "Markdown" }
      );
    }

    // ── List subscriptions ─────────────────────────────────────────────────
    case "list_subscriptions": {
      if (subs.length === 0) {
        return send(chatId, "You don't have any subscriptions yet. Just tell me what you sign up for and I'll track it!");
      }
      return send(chatId, formatSubList(subs));
    }

    // ── Get report ─────────────────────────────────────────────────────────
    case "get_report": {
      const monthStart = getMonthStart();
      const lines = [];
      const warnings = [];
      let totalSpend = 0;
      let totalUses = 0;

      for (const sub of subs) {
        const useCount = await UsageLog.countDocuments({
          subscription: sub._id,
          action: "used",
          date: { $gte: monthStart },
        });
        const mc = sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost;
        const cpu = useCount > 0 ? mc / useCount : null;
        totalSpend += mc;
        totalUses += useCount;
        lines.push(`  ${sub.name}: ${useCount} uses — ${cpu ? "$" + cpu.toFixed(2) + "/use" : "unused"}`);
        if (useCount === 0) warnings.push(`  ${sub.name} ($${mc.toFixed(2)}/mo)`);
        else if (useCount < 3) warnings.push(`  ${sub.name} — only ${useCount} use(s) this month`);
      }

      let report =
        `📊 Monthly Report\n` +
        `Total: $${totalSpend.toFixed(2)}/mo | ${totalUses} uses | Avg: ${totalUses > 0 ? "$" + (totalSpend / totalUses).toFixed(2) : "N/A"}/use\n\n` +
        lines.join("\n");

      if (warnings.length > 0) {
        report += `\n\n⚠️ Worth reviewing:\n${warnings.join("\n")}`;
      }
      return send(chatId, report);
    }

    // ── Get suggestions ────────────────────────────────────────────────────
    case "get_suggestions": {
      await send(chatId, "Let me analyze your subscriptions...");
      const suggestions = await getAiSuggestionsRaw(user._id);
      if (!suggestions || suggestions.length === 0) {
        return send(chatId, "Everything looks pretty good! Add more usage data over time for better insights.");
      }
      const lines = suggestions.map((s, i) => {
        const savings = s.estimatedSavings ? ` (save ~$${s.estimatedSavings})` : "";
        return `${i + 1}. ${s.title || s.suggestion}${savings}\n   ${s.detail || s.reason || ""}`;
      });
      return send(chatId, `💡 AI Suggestions:\n\n${lines.join("\n\n")}`);
    }

    // ── Compare service ────────────────────────────────────────────────────
    case "compare_service": {
      const serviceName = subscription || "";
      if (!serviceName) return send(chatId, "Which service would you like me to find alternatives for?");
      await send(chatId, `Looking for alternatives to ${serviceName}...`);

      const result = await getAlternativesRaw(user._id, serviceName);
      if (!result) return send(chatId, `I couldn't find ${serviceName} in your subscriptions. Let me know the exact name.`);
      if (result.error) return send(chatId, `Hmm, something went wrong: ${result.error}`);

      const verdictEmoji = { keep: "✅", downgrade: "⬇️", switch: "🔄", cancel: "❌" };
      let msg = `${verdictEmoji[result.verdict] || "🤔"} **${serviceName}** — Verdict: ${result.verdict?.toUpperCase()}\n`;
      if (result.verdictReason) msg += `${result.verdictReason}\n`;

      const alts = result.alternatives || [];
      if (alts.length > 0) {
        msg += `\nAlternatives:\n`;
        alts.forEach((a, i) => {
          const price = a.cost === 0 ? "Free" : `$${Number(a.cost).toFixed(2)}/mo`;
          msg += `\n${i + 1}. ${a.name} (${price})`;
          if (a.pros) msg += `\n   ✓ ${a.pros}`;
          if (a.cons) msg += `\n   ✗ ${a.cons}`;
        });
      }
      return send(chatId, msg, { parse_mode: "Markdown" });
    }

    // ── Toggle reminders ───────────────────────────────────────────────────
    case "toggle_reminders": {
      const toggle = remindersToggle;
      if (!toggle) {
        const link = await TelegramUser.findOne({ telegramChatId: String(chatId) });
        const status = link?.remindersEnabled ? "on" : "off";
        return send(chatId, `Your daily reminders are currently ${status}. Just tell me to turn them on or off!`);
      }
      const link = await TelegramUser.findOne({ telegramChatId: String(chatId) });
      if (link) {
        link.remindersEnabled = toggle === "on";
        await link.save();
      }
      return send(chatId,
        toggle === "on"
          ? "Done! I'll remind you daily about unused subscriptions."
          : "Got it, I'll stop sending daily reminders."
      );
    }

    // ── Query spend ────────────────────────────────────────────────────────
    case "query_spend": {
      let total = 0;
      subs.forEach((s) => { total += s.billingCycle === "yearly" ? s.cost / 12 : s.cost; });
      return send(chatId,
        `You're spending **$${total.toFixed(2)}/month** across ${subs.length} subscription${subs.length !== 1 ? "s" : ""}. ` +
        `Want the full breakdown with usage stats?`,
        { parse_mode: "Markdown" }
      );
    }

    // ── Unknown ────────────────────────────────────────────────────────────
    default: {
      return send(chatId,
        naturalReply ||
        "I'm not sure what you mean. You can tell me things like:\n" +
        "• \"just watched Netflix\"\n" +
        "• \"signed up for Spotify at $10\"\n" +
        "• \"how much am I spending?\"\n" +
        "• \"show my subscriptions\"\n" +
        "• \"should I cancel anything?\""
      );
    }
  }
}

// ─── Handle pending conversation state ───────────────────────────────────────
async function handleConversationState(chatId, user, text, state) {
  const { step, data } = state;

  // ── Awaiting cost after partial add_subscription ──
  if (step === "awaiting_cost") {
    const costMatch = text.match(/[\d]+\.?[\d]*/);
    const cost = costMatch ? parseFloat(costMatch[0]) : NaN;

    if (isNaN(cost) || cost < 0) {
      return send(chatId, "That doesn't look like a valid amount. How much does it cost per month? (e.g. 9.99)");
    }

    convState.delete(chatId);
    const sub = await Subscription.create({
      user: user._id,
      name: data.name,
      cost,
      category: data.category,
      billingCycle: data.billingCycle,
    });
    const cycleLabel = sub.billingCycle === "yearly" ? "year" : "month";
    return send(chatId, `Perfect! Added ${sub.name} — $${sub.cost.toFixed(2)}/${cycleLabel} under ${sub.category} 🎉`);
  }

  // ── Awaiting delete confirmation ──
  if (step === "awaiting_delete_confirm") {
    const lower = text.toLowerCase().trim();
    const confirmed = ["yes", "yeah", "yep", "sure", "ok", "okay", "do it", "confirm", "delete it", "remove it"].some((w) => lower.includes(w));
    const denied = ["no", "nope", "cancel", "stop", "don't", "never mind", "nevermind"].some((w) => lower.includes(w));

    convState.delete(chatId);

    if (confirmed) {
      const sub = data.targetSub;
      await UsageLog.deleteMany({ subscription: sub._id });
      await sub.deleteOne();
      return send(chatId, `Done, removed ${sub.name} and all its usage history.`);
    }
    if (denied) {
      return send(chatId, "No worries, I'll keep it as is.");
    }
    // Unclear response — treat as cancelled
    return send(chatId, "I'll leave it as is. Let me know if you change your mind.");
  }

  // Unknown state — clear it and process normally
  convState.delete(chatId);
  return null;
}

export async function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("TELEGRAM_BOT_TOKEN not set — bot disabled");
    return;
  }

  bot = new TelegramBot(token, { polling: false });

  // Kick out any lingering polling session before starting (fixes 409 on Render redeploy)
  try {
    await bot.deleteWebhook({ drop_pending_updates: true });
  } catch (_) {}

  bot.startPolling({ restart: false });
  console.log("Telegram bot started");

  // ── /start ──────────────────────────────────────────────────────────────
  bot.onText(/\/start/, async (msg) => {
    const name = msg.from.first_name || "there";
    const user = await getLinkedUser(msg.chat.id);
    if (user) {
      const subs = await Subscription.find({ user: user._id });
      return send(msg.chat.id,
        `Hey ${user.name}! You're linked and tracking ${subs.length} subscription${subs.length !== 1 ? "s" : ""}.\n\n` +
        `Just chat naturally — tell me what you used, what you signed up for, or ask anything about your spending!`
      );
    }
    await send(msg.chat.id,
      `Hey ${name}! I'm SubGenie — your AI subscription tracker 🧞\n\n` +
      `First, link your account:\n` +
      `/link your@email.com yourpassword\n\n` +
      `After that, just talk to me like a friend:\n` +
      `"just watched Netflix"\n` +
      `"signed up for Spotify at $9.99/month"\n` +
      `"how much am I spending?"\n` +
      `"should I cancel anything?"`
    );
  });

  // ── /help ───────────────────────────────────────────────────────────────
  bot.onText(/\/help/, async (msg) => {
    await send(msg.chat.id,
      `SubGenie — just talk to me naturally!\n\n` +
      `Examples:\n` +
      `💬 "just watched Netflix"\n` +
      `💬 "signed up for Spotify at $9.99"\n` +
      `💬 "how much am I spending this month?"\n` +
      `💬 "show all my subscriptions"\n` +
      `💬 "should I cancel anything?"\n` +
      `💬 "find alternatives to Adobe"\n` +
      `💬 "remove my Hulu subscription"\n` +
      `💬 "turn on daily reminders"\n\n` +
      `Account commands:\n` +
      `/link email password — Connect your SubGenie account\n` +
      `/unlink — Disconnect this Telegram\n` +
      `/start — Welcome message`
    );
  });

  // ── /link email password ────────────────────────────────────────────────
  bot.onText(/\/link\s+(\S+)\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const email = match[1].toLowerCase();
    const password = match[2];

    try {
      const existing = await TelegramUser.findOne({ telegramChatId: String(chatId) });
      if (existing) return send(chatId, "You're already linked! Use /unlink first if you want to switch accounts.");

      const user = await User.findOne({ email });
      if (!user) return send(chatId, "No account found with that email. Make sure you've registered on the SubGenie web app first.");

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return send(chatId, "Wrong password. Try again.");

      await TelegramUser.create({ telegramChatId: String(chatId), user: user._id });
      const subs = await Subscription.find({ user: user._id });
      await send(chatId,
        `Linked! Welcome, ${user.name} 🎉\n\n` +
        (subs.length
          ? `You've got ${subs.length} subscription${subs.length !== 1 ? "s" : ""} tracked. Just talk to me naturally!`
          : `You don't have any subscriptions yet. Tell me what you're signed up for and I'll start tracking!`)
      );
    } catch (err) {
      console.error("Link error:", err.message);
      await send(chatId, "Something went wrong. Try again.");
    }
  });

  // ── /unlink ─────────────────────────────────────────────────────────────
  bot.onText(/\/unlink/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const result = await TelegramUser.findOneAndDelete({ telegramChatId: String(chatId) });
      convState.delete(chatId);
      if (result) {
        await send(chatId, "Unlinked. Use /link to reconnect whenever you're ready.");
      } else {
        await send(chatId, "No linked account found.");
      }
    } catch (err) {
      console.error("Unlink error:", err.message);
      await send(chatId, "Failed to unlink. Try again.");
    }
  });

  // ── Main message handler — NLP-first ────────────────────────────────────
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith("/")) return;

    const user = await getLinkedUser(chatId);

    // Unlinked user — nudge them to link
    if (!user) {
      return send(chatId,
        "You'll need to link your SubGenie account first. Use:\n/link your@email.com yourpassword\n\nDon't have an account? Sign up at the SubGenie web app."
      );
    }

    try {
      // ── Handle pending conversation state first ──
      const state = convState.get(chatId);
      if (state) {
        const handled = await handleConversationState(chatId, user, text, state);
        if (handled !== null) return;
        // If null returned, fall through to normal NLP
      }

      const subs = await Subscription.find({ user: user._id }).sort("name");
      const subNames = subs.map((s) => s.name);

      // ── NLP parse ──
      const parsed = await parseIntent(text, subNames);

      if (!parsed) {
        // OpenAI not configured — fall back to hint
        return send(chatId,
          "I couldn't process that. Make sure OPENAI_API_KEY is configured, or try being more specific:\n" +
          "• \"used Netflix\" to log usage\n" +
          "• \"show my subscriptions\" to see your list\n" +
          "• \"how much am I spending\" for a total"
        );
      }

      await handleIntent(chatId, user, parsed, subs);

    } catch (err) {
      console.error("Message handler error:", err.message);
      await send(chatId, "Something went wrong on my end. Try again in a moment.");
    }
  });

  bot.on("polling_error", (err) => {
    console.error("Telegram polling error:", err.code, err.message);
  });

  // ── Daily reminder loop ──────────────────────────────────────────────────
  setInterval(() => sendReminders().catch(console.error), 12 * 60 * 60 * 1000);
  setTimeout(() => sendReminders().catch(() => {}), 30_000);
}

// ─── Send daily reminders ────────────────────────────────────────────────────
async function sendReminders() {
  if (!bot) return;
  const monthStart = getMonthStart();
  const enabledUsers = await TelegramUser.find({ remindersEnabled: true }).populate("user", "-password");

  for (const link of enabledUsers) {
    if (!link.user) continue;
    const subs = await Subscription.find({ user: link.user._id });
    const unused = [];

    for (const sub of subs) {
      const useCount = await UsageLog.countDocuments({
        subscription: sub._id,
        action: "used",
        date: { $gte: monthStart },
      });
      if (useCount === 0) {
        const mc = sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost;
        unused.push(`  • ${sub.name} ($${mc.toFixed(2)}/mo)`);
      }
    }

    if (unused.length > 0) {
      await send(
        link.telegramChatId,
        `Hey! Just a heads-up — ${unused.length} subscription${unused.length !== 1 ? "s" : ""} unused this month:\n\n${unused.join("\n")}\n\nLog your usage or tell me to remove any you're done with!`
      );
    }
  }
}
