# SubGenie — AI Subscription Manager

SubGenie helps you manage recurring subscriptions — Netflix, Spotify, gym memberships, SaaS tools — and figure out which ones are actually worth keeping. You add subscriptions, log every time you use them, and SubGenie calculates cost-per-use, flags underused services, and tells you exactly how much you could save by cutting them. An AI layer (GPT-4o-mini) generates personalized savings suggestions and finds cheaper alternatives for any subscription. The Telegram bot is the primary daily driver — just talk to it naturally instead of opening the app.

---

## Features

- **Subscription CRUD** — add, edit, delete subscriptions with name, cost, category, and billing cycle
- **Usage tracking** — log every time you use a service; track history per subscription
- **Analytics** — monthly spend, cost-per-use per subscription, unused/low-usage flags
- **AI Advisor** — GPT-4o-mini analyzes your subscriptions and suggests what to cut (with estimated savings)
- **Compare Alternatives** — AI finds cheaper alternatives for any subscription with pros, cons, and a verdict
- **Telegram Bot (NLP-first)** — chat naturally; no commands needed for day-to-day use
- **Daily Reminders** — Telegram bot reminds you about unused subscriptions each day
- **Admin panel** — user management for admin accounts

---

## Telegram Bot

The bot understands natural language. Just talk to it like a friend:

| What you say | What happens |
|---|---|
| "just watched Netflix" | Logs usage for Netflix |
| "signed up for Spotify at $9.99/month" | Adds Spotify subscription |
| "remove my Hulu" | Asks for confirmation, then deletes |
| "show my subscriptions" | Lists all subscriptions with costs |
| "how much am I spending?" | Returns your total monthly spend |
| "give me a breakdown" | Full monthly report with cost-per-use |
| "should I cancel anything?" | Runs AI savings analysis |
| "find alternatives to Adobe" | AI compares cheaper options |
| "turn on daily reminders" | Enables unused-subscription reminders |

If the bot can't understand a message, it falls back with specific examples.

**Account commands** (slash commands still needed for security):

| Command | Description |
|---|---|
| `/start` | Welcome + setup |
| `/link email password` | Connect your SubGenie account |
| `/unlink` | Disconnect Telegram |
| `/help` | Usage examples |

---

## Database

SubGenie uses **MongoDB Atlas** (cloud-hosted NoSQL) with **Mongoose** as the ODM. There are four collections:

- **Users** — account info (name, email, hashed password, role)
- **Subscriptions** — each service a user tracks (name, cost, category, billing cycle)
- **UsageLogs** — every usage event logged against a subscription (date, action, notes)
- **TelegramUsers** — maps a Telegram chat ID to a SubGenie account, stores reminder preference

Subscriptions and UsageLogs reference the User document by ObjectId, so all data is scoped per user. Mongoose indexes are set on frequently queried fields (user, category, cost) to keep queries fast.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js 5 |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcryptjs |
| Templating | EJS + express-ejs-layouts |
| Styling | Tailwind CSS + Chart.js 4 |
| AI | OpenAI GPT-4o-mini |
| Bot | node-telegram-bot-api |

---

## Setup

**1. Clone and install**
```bash
git clone <repo-url>
cd subgenie
npm install
```

**2. Create `.env`**
```env
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token   # optional
OPENAI_API_KEY=your_openai_api_key           # optional
```

**3. Run**
```bash
npm start
# → http://localhost:8000
```

`TELEGRAM_BOT_TOKEN` and `OPENAI_API_KEY` are optional — the app runs without them, but bot and AI features are disabled.

---

## API Endpoints

All endpoints require `Authorization: Bearer <token>` unless marked public.

**Auth** (public)
- `POST /api/auth/register`
- `POST /api/auth/login`

**Subscriptions**
- `GET /api/subscriptions` — list (supports `q`, `category`, `billingCycle`, `sort`, `page`, `limit`)
- `POST /api/subscriptions`
- `PUT /api/subscriptions/:id`
- `DELETE /api/subscriptions/:id`

**Usage Logs**
- `GET/POST /api/usageLogs`
- `PUT/DELETE /api/usageLogs/:id`

**Analytics**
- `GET /api/analytics/summary`
- `GET /api/analytics/cost-per-use`
- `GET /api/analytics/insights`

**AI**
- `GET /api/ai/suggestions`
- `GET /api/ai/alternatives/:id`

---

## Web Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/dashboard` | Stats, chart, subscription table |
| `/subscriptions` | Full management with add/edit/delete/compare |
| `/insights` | AI advisor + usage alerts |
| `/usage/:id` | Per-subscription usage history |
| `/profile` | Account settings |

---

## Security

- Passwords hashed with bcryptjs
- JWT tokens for API auth, HTTP cookies for web sessions
- Input validation via express-validator
- `.env` excluded from Git

---


## Live Site link: https://subgenie-kxru.onrender.com/

## License

Academic / educational project.
