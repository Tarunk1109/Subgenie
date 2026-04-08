import TelegramBot from "node-telegram-bot-api";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import TelegramUser from "../models/TelegramUser.js";
import Subscription from "../models/Subscription.js";
import UsageLog from "../models/UsageLog.js";
import { getAiSuggestionsRaw, getAlternativesRaw } from "../controllers/aiController.js";

let bot;

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function getLinkedUser(chatId) {
  const link = await TelegramUser.findOne({
    telegramChatId: String(chatId),
  }).populate("user", "-password");
  return link?.user || null;
}

function send(chatId, text) {
  return bot.sendMessage(chatId, text).catch((err) => {
    console.error("Telegram send error:", err.message);
  });
}

function parseName(input) {
  const quoted = input.match(/^["'](.+?)["']\s*(.*)/);
  if (quoted) return { name: quoted[1], rest: quoted[2] };
  const parts = input.split(/\s+/);
  return { name: parts[0], rest: parts.slice(1).join(" ") };
}

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("TELEGRAM_BOT_TOKEN not set — bot disabled");
    return;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log("Telegram bot started");

  // /start
  bot.onText(/\/start/, async (msg) => {
    const name = msg.from.first_name || "there";
    await send(
      msg.chat.id,
      `Hey ${name}, welcome to SubGenie.\n\n` +
        `Link your account first:\n` +
        `/link your@email.com password\n\n` +
        `Commands:\n` +
        `/add Name Cost Category [monthly/yearly]\n` +
        `/add "Amazon Prime" 14.99 Entertainment\n` +
        `/use Netflix\n` +
        `/list\n` +
        `/report\n` +
        `/suggest — AI savings tips\n` +
        `/compare Name — find cheaper alternatives\n` +
        `/remind on/off — daily reminders\n` +
        `/delete Name\n` +
        `/unlink — disconnect account\n` +
        `/help`
    );
  });

  // /help
  bot.onText(/\/help/, async (msg) => {
    await send(
      msg.chat.id,
      `SubGenie Commands\n\n` +
        `/link email password — Link account\n` +
        `/add Name Cost Category [cycle] — Add (use quotes for multi-word names)\n` +
        `/use Name — Log usage\n` +
        `/delete Name — Remove subscription\n` +
        `/list — All subscriptions\n` +
        `/report — Monthly cost-per-use report\n` +
        `/suggest — AI savings suggestions\n` +
        `/compare Name — Find cheaper alternatives\n` +
        `/remind on|off — Toggle daily reminders\n` +
        `/unlink — Disconnect Telegram\n` +
        `/help — This message`
    );
  });

  // /link email password
  bot.onText(/\/link\s+(\S+)\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const email = match[1].toLowerCase();
    const password = match[2];

    try {
      const existing = await TelegramUser.findOne({ telegramChatId: String(chatId) });
      if (existing) return send(chatId, "Already linked. Use /unlink first to reconnect.");

      const user = await User.findOne({ email });
      if (!user) return send(chatId, "No account with that email. Register on the web app first.");

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return send(chatId, "Incorrect password.");

      await TelegramUser.create({ telegramChatId: String(chatId), user: user._id });
      await send(chatId, `Linked! Welcome, ${user.name}. Try /list or /help.`);
    } catch (err) {
      console.error("Link error:", err.message);
      await send(chatId, "Something went wrong. Try again.");
    }
  });

  // /unlink
  bot.onText(/\/unlink/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const result = await TelegramUser.findOneAndDelete({ telegramChatId: String(chatId) });
      if (result) {
        await send(chatId, "Account unlinked. Use /link to reconnect.");
      } else {
        await send(chatId, "No linked account found.");
      }
    } catch (err) {
      console.error("Unlink error:", err.message);
      await send(chatId, "Failed to unlink. Try again.");
    }
  });

  // /add — supports quoted multi-word names
  bot.onText(/\/add\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = await getLinkedUser(chatId);
    if (!user) return send(chatId, "Link your account first: /link email password");

    const { name, rest } = parseName(match[1].trim());
    const parts = rest.split(/\s+/).filter(Boolean);

    if (!name || parts.length < 2) {
      return send(chatId, 'Usage: /add Name Cost Category [monthly/yearly]\nFor multi-word: /add "Amazon Prime" 14.99 Entertainment');
    }

    const cost = parseFloat(parts[0]);
    const category = parts[1];
    const billingCycle = parts[2]?.toLowerCase() === "yearly" ? "yearly" : "monthly";

    if (isNaN(cost) || cost < 0) return send(chatId, "Cost must be a valid positive number.");

    try {
      const sub = await Subscription.create({ user: user._id, name, cost, category, billingCycle });
      await send(chatId, `Added "${sub.name}" — $${sub.cost.toFixed(2)}/${sub.billingCycle} (${sub.category})`);
    } catch (err) {
      console.error("Add error:", err.message);
      await send(chatId, "Failed to add. Check your input.");
    }
  });

  // /delete Name
  bot.onText(/\/delete\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = await getLinkedUser(chatId);
    if (!user) return send(chatId, "Link your account first: /link email password");

    const { name } = parseName(match[1].trim());

    try {
      const sub = await Subscription.findOne({
        user: user._id,
        name: { $regex: `^${name}$`, $options: "i" },
      });

      if (!sub) return send(chatId, `"${name}" not found. Use /list to see your subscriptions.`);

      await UsageLog.deleteMany({ subscription: sub._id });
      await sub.deleteOne();
      await send(chatId, `Deleted "${sub.name}" and its usage logs.`);
    } catch (err) {
      console.error("Delete error:", err.message);
      await send(chatId, "Failed to delete. Try again.");
    }
  });

  // /use Name
  bot.onText(/\/use\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = await getLinkedUser(chatId);
    if (!user) return send(chatId, "Link your account first: /link email password");

    const { name } = parseName(match[1].trim());

    try {
      const sub = await Subscription.findOne({
        user: user._id,
        name: { $regex: `^${name}$`, $options: "i" },
      });

      if (!sub) {
        const suggestions = await Subscription.find({
          user: user._id,
          name: { $regex: name, $options: "i" },
        }).limit(5);
        if (suggestions.length > 0) {
          const list = suggestions.map((s) => `  ${s.name}`).join("\n");
          return send(chatId, `"${name}" not found. Did you mean:\n${list}`);
        }
        return send(chatId, `"${name}" not found. Use /list to see subscriptions.`);
      }

      await UsageLog.create({ user: user._id, subscription: sub._id, action: "used" });
      await send(chatId, `Logged usage for "${sub.name}"`);
    } catch (err) {
      console.error("Use error:", err.message);
      await send(chatId, "Failed to log usage.");
    }
  });

  // /list
  bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getLinkedUser(chatId);
    if (!user) return send(chatId, "Link your account first: /link email password");

    try {
      const subs = await Subscription.find({ user: user._id }).sort("name");
      if (subs.length === 0) return send(chatId, "No subscriptions. Use /add to create one.");

      let total = 0;
      const lines = subs.map((s) => {
        const mc = s.billingCycle === "yearly" ? s.cost / 12 : s.cost;
        total += mc;
        return `  ${s.name} — $${s.cost.toFixed(2)}/${s.billingCycle} (${s.category})`;
      });

      await send(chatId, `Subscriptions (${subs.length}):\n\n${lines.join("\n")}\n\nTotal: $${total.toFixed(2)}/mo`);
    } catch (err) {
      console.error("List error:", err.message);
      await send(chatId, "Failed to fetch subscriptions.");
    }
  });

  // /report
  bot.onText(/\/report/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getLinkedUser(chatId);
    if (!user) return send(chatId, "Link your account first: /link email password");

    try {
      const monthStart = getMonthStart();
      const subs = await Subscription.find({ user: user._id });
      if (subs.length === 0) return send(chatId, "No subscriptions to report on.");

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

        lines.push(`  ${sub.name}: ${useCount} uses — ${cpu ? "$" + cpu.toFixed(2) : "N/A"}/use`);
        if (useCount === 0) warnings.push(`  ${sub.name} — UNUSED ($${mc.toFixed(2)}/mo)`);
        else if (useCount < 4) warnings.push(`  ${sub.name} — only ${useCount} use(s)`);
      }

      let msg2 = `Monthly Report\n` +
        `Total: $${totalSpend.toFixed(2)}/mo | ${totalUses} uses | Avg: ${totalUses > 0 ? "$" + (totalSpend / totalUses).toFixed(2) : "N/A"}/use\n\n` +
        lines.join("\n");

      if (warnings.length > 0) msg2 += `\n\nWarnings:\n${warnings.join("\n")}`;
      await send(chatId, msg2);
    } catch (err) {
      console.error("Report error:", err.message);
      await send(chatId, "Failed to generate report.");
    }
  });

  // /suggest — AI suggestions
  bot.onText(/\/suggest/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getLinkedUser(chatId);
    if (!user) return send(chatId, "Link your account first: /link email password");

    await send(chatId, "Analyzing your subscriptions...");

    try {
      const suggestions = await getAiSuggestionsRaw(user._id);
      if (suggestions.length === 0) {
        return send(chatId, "No suggestions available. Add more subscriptions and usage data first.");
      }

      const lines = suggestions.map((s, i) => {
        const savings = s.estimatedSavings ? ` (save ~$${s.estimatedSavings})` : "";
        return `${i + 1}. ${s.title || s.suggestion}${savings}\n   ${s.detail || s.reason || ""}`;
      });

      await send(chatId, `AI Suggestions:\n\n${lines.join("\n\n")}`);
    } catch (err) {
      console.error("Suggest error:", err.message);
      await send(chatId, "Failed to get suggestions. Try again later.");
    }
  });

  // /compare Name — find alternatives
  bot.onText(/\/compare\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = await getLinkedUser(chatId);
    if (!user) return send(chatId, "Link your account first: /link email password");

    const { name } = parseName(match[1].trim());
    await send(chatId, `Finding alternatives for "${name}"...`);

    try {
      const result = await getAlternativesRaw(user._id, name);

      if (!result) return send(chatId, `"${name}" not found. Use /list to see subscriptions.`);
      if (result.error) return send(chatId, `Error: ${result.error}`);

      const verdictMap = { keep: "KEEP", downgrade: "DOWNGRADE", switch: "SWITCH", cancel: "CANCEL" };
      let msg2 = `Alternatives for "${name}"\n`;
      msg2 += `Verdict: ${verdictMap[result.verdict] || result.verdict}\n`;
      if (result.verdictReason) msg2 += `${result.verdictReason}\n`;

      const alts = result.alternatives || [];
      if (alts.length > 0) {
        msg2 += `\nAlternatives:\n`;
        alts.forEach((a, i) => {
          const price = a.cost === 0 ? "Free" : `$${Number(a.cost).toFixed(2)}/mo`;
          msg2 += `\n${i + 1}. ${a.name} (${price})`;
          if (a.pros) msg2 += `\n   + ${a.pros}`;
          if (a.cons) msg2 += `\n   - ${a.cons}`;
        });
      }

      await send(chatId, msg2);
    } catch (err) {
      console.error("Compare error:", err.message);
      await send(chatId, "Failed to find alternatives. Try again later.");
    }
  });

  // /remind on|off
  bot.onText(/\/remind\s*(on|off)?/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const toggle = match[1]?.toLowerCase();

    try {
      const link = await TelegramUser.findOne({ telegramChatId: String(chatId) });
      if (!link) return send(chatId, "Link your account first: /link email password");

      if (!toggle) {
        const status = link.remindersEnabled ? "ON" : "OFF";
        return send(chatId, `Reminders are ${status}.\nUse /remind on or /remind off to change.`);
      }

      link.remindersEnabled = toggle === "on";
      await link.save();
      await send(chatId, `Daily reminders ${toggle === "on" ? "enabled" : "disabled"}.`);
    } catch (err) {
      console.error("Remind error:", err.message);
      await send(chatId, "Failed to update reminder setting.");
    }
  });

  // Reminder loop — runs every 12 hours
  setInterval(async () => {
    try {
      await sendReminders();
    } catch (err) {
      console.error("Reminder loop error:", err.message);
    }
  }, 12 * 60 * 60 * 1000);

  // Send initial reminders after 30s startup delay
  setTimeout(() => sendReminders().catch(() => {}), 30000);

  bot.on("polling_error", (err) => {
    console.error("Telegram polling error:", err.code, err.message);
  });
}

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
        unused.push(`  ${sub.name} ($${mc.toFixed(2)}/mo)`);
      }
    }

    if (unused.length > 0) {
      await send(
        link.telegramChatId,
        `Reminder: ${unused.length} subscription(s) unused this month:\n\n${unused.join("\n")}\n\nLog usage with /use Name or consider cancelling.`
      );
    }
  }
}
