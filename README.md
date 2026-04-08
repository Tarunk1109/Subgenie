# SubGenie — Subscription Intelligence Platform

## 1. Introduction

SubGenie is a full-stack web application that helps users manage, monitor, and optimize their recurring subscription expenses. It combines a REST API, a server-rendered dashboard, AI-powered savings analysis, and a Telegram bot into a single platform.

Users can track subscriptions like Netflix, Spotify, gym memberships, and SaaS tools. They log how often they use each service, and SubGenie calculates cost-per-use, flags underused subscriptions, and uses OpenAI GPT-4o-mini to generate personalized money-saving recommendations — including finding cheaper alternatives for any subscription.

The system is accessible through three interfaces:
- **Web Dashboard** — full subscription management with charts, insights, and AI advisor
- **REST API** — for programmatic access and testing via Postman/Thunder Client
- **Telegram Bot** — manage subscriptions, log usage, get AI suggestions, and receive daily reminders directly from Telegram

---

## 2. Core Features

### 2.1 Authentication and Authorization
- User registration and login with email/password
- Password hashing using bcryptjs
- JWT token generation (7-day expiry)
- Protected API routes via Bearer token
- Protected web pages via HTTP cookie-based sessions
- Role-based access control (user and admin roles)

### 2.2 Subscription Management
- Create, read, update, and delete subscriptions
- Each subscription has: name, cost, category, billing cycle (monthly/yearly)
- Edit subscriptions from the web UI via a modal form
- Advanced query support: search, filter by category/cycle/price, sort, paginate

### 2.3 Usage Tracking
- Log usage events for any subscription
- Track usage history per subscription
- Each log records: date, action (used/not_used), optional notes

### 2.4 Analytics and Insights
- **Summary** — total monthly spend, subscription count, total uses, average cost-per-use
- **Cost-per-use breakdown** — per-subscription analysis sorted worst-value-first
- **Insight flags** — automatically detects unused, low-usage, and high-cost-per-use subscriptions
- **Recommendations** — human-readable suggestions for each flagged subscription
- **Potential savings** — calculates money saved by cancelling unused subscriptions

### 2.5 AI-Powered Features (OpenAI GPT-4o-mini)
- **AI Advisor** — analyzes all subscriptions and usage data to generate 3-5 personalized savings suggestions with estimated dollar amounts
- **Compare Alternatives** — for any subscription, AI finds 3-5 cheaper or better alternatives with pros, cons, pricing, and a verdict (keep/downgrade/switch/cancel)
- Results are cached for 1 hour per user to minimize API calls
- Available on both web dashboard and Telegram bot

### 2.6 Web Dashboard
- Professional SaaS-style UI with Inter font, slate/indigo color palette
- Server-rendered pages using EJS templates styled with Tailwind CSS
- Summary stat cards with left-border color accents
- Spending-by-category doughnut chart (Chart.js)
- Subscription table with inline actions (log use, history, edit, find alternatives, delete)
- AI Advisor section on Insights page
- Alternatives comparison modal with verdict and detailed alternative cards
- Toast notifications for all user actions
- Responsive layout for desktop and mobile

### 2.7 Telegram Bot
Full subscription management via chat commands:

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and setup instructions |
| `/help` | List all available commands |
| `/link email password` | Link Telegram to SubGenie account |
| `/unlink` | Disconnect Telegram from account |
| `/add Name Cost Category [monthly/yearly]` | Add subscription (supports quoted multi-word names) |
| `/use Name` | Log a usage event |
| `/delete Name` | Delete a subscription and its logs |
| `/list` | List all subscriptions with costs |
| `/report` | Monthly cost-per-use report with warnings |
| `/suggest` | AI-powered savings suggestions |
| `/compare Name` | Find cheaper alternatives for a subscription |
| `/remind on/off` | Toggle daily unused-subscription reminders |

The bot supports multi-word subscription names using quotes: `/add "Amazon Prime" 14.99 Entertainment`

### 2.8 Reminder System
- Users enable reminders via `/remind on` in Telegram
- The system periodically checks for users with reminders enabled
- Sends a message listing all subscriptions with zero usage this month
- Reminders suggest logging usage or considering cancellation

---

## 3. Technology Stack

| Layer | Technologies |
|-------|-------------|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js 5 |
| Database | MongoDB Atlas, Mongoose 9 |
| Authentication | JSON Web Tokens, bcryptjs |
| Validation | express-validator |
| Templating | EJS |
| Styling | Tailwind CSS (CDN), Inter font (Google Fonts) |
| Charts | Chart.js 4 |
| AI | OpenAI SDK (GPT-4o-mini) |
| Bot | node-telegram-bot-api |
| Utilities | dotenv, cors, cookie-parser |

---

## 4. Project Structure

```
subgenie/
│
├── bot/
│   └── telegramBot.js          # Telegram bot with all commands and reminder system
│
├── config/
│   └── db.js                   # MongoDB Atlas connection
│
├── controllers/
│   ├── aiController.js          # AI suggestions + compare alternatives (OpenAI)
│   ├── analyticsController.js   # Summary, cost-per-use, insights
│   ├── authController.js        # Register, login
│   ├── subscriptionController.js # Subscription CRUD
│   ├── usageLogController.js    # Usage log CRUD
│   ├── userController.js        # User profile, admin list
│   └── viewController.js        # EJS page rendering + form handling
│
├── middleware/
│   ├── authMiddleware.js        # JWT protect + admin-only for API
│   ├── errorMiddleware.js       # 404 and global error handlers
│   └── viewAuthMiddleware.js    # Cookie-based auth for web pages
│
├── models/
│   ├── Subscription.js          # name, cost, category, billingCycle, user
│   ├── TelegramUser.js          # telegramChatId, user, remindersEnabled
│   ├── UsageLog.js              # subscription, date, action, notes, user
│   └── User.js                  # name, email, password, role
│
├── public/
│   ├── css/custom.css           # Animations, badge styles, stat card accents
│   └── js/main.js               # Client-side JS: CRUD, AI calls, chart, modals
│
├── routes/
│   ├── aiRoutes.js              # /api/ai/suggestions, /api/ai/alternatives/:id
│   ├── analyticsRoutes.js       # /api/analytics/*
│   ├── authRoutes.js            # /api/auth/register, /api/auth/login
│   ├── subscriptionRoutes.js    # /api/subscriptions/*
│   ├── usageLogRoutes.js        # /api/usageLogs/*
│   ├── userRoutes.js            # /api/users/*
│   └── viewRoutes.js            # / (landing), /dashboard, /subscriptions, etc.
│
├── utils/
│   └── generateToken.js         # JWT token generation helper
│
├── views/
│   ├── partials/
│   │   ├── header.ejs           # Navbar, Tailwind CDN, Chart.js, Inter font
│   │   └── footer.ejs           # Footer, main.js script
│   ├── dashboard.ejs            # Summary cards, chart, activity, subscription table
│   ├── insights.ejs             # AI advisor, savings potential, flagged subscriptions
│   ├── landing.ejs              # Hero, how-it-works, features
│   ├── login.ejs                # Login form
│   ├── register.ejs             # Registration form
│   ├── subscriptions.ejs        # Subscription table, add/edit modal, alternatives modal
│   └── usage.ejs                # Per-subscription usage history
│
├── app.js                       # Entry point: Express setup, routes, bot startup
├── .env                         # Environment variables (not committed)
├── .gitignore                   # Excludes node_modules, .env
├── package.json
└── README.md
```

---

## 5. Installation and Setup

### Step 1: Clone the repository
```bash
git clone <your-repository-url>
cd subgenie
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Configure environment variables
Create a `.env` file in the root directory:

```env
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENAI_API_KEY=your_openai_api_key
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (defaults to 8000) |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token from @BotFather. If omitted, bot is disabled. |
| `OPENAI_API_KEY` | No | OpenAI API key for AI features. If omitted, AI buttons show a "not configured" message. |

### Step 4: Start the server
```bash
npm start
```

### Step 5: Open the app
```
http://localhost:8000
```

---

## 6. MongoDB Atlas Configuration

1. Create a MongoDB Atlas cluster at https://cloud.mongodb.com
2. Create a database user with read/write privileges
3. Under Network Access, add `0.0.0.0/0` to allow connections from anywhere (for development)
4. Copy the connection string and add it to `.env` as `MONGO_URI`

Example:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/subgenieDB
```

---

## 7. Telegram Bot Setup

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` and follow the prompts to name your bot
3. Copy the token provided by BotFather
4. Add it to `.env` as `TELEGRAM_BOT_TOKEN`
5. Restart the server — the bot starts automatically

To use the bot:
1. Open your bot in Telegram
2. Send `/start`
3. Link your account: `/link your@email.com yourpassword`
4. Start managing subscriptions with `/add`, `/use`, `/list`, `/report`, etc.

---

## 8. OpenAI Setup

1. Get an API key from https://platform.openai.com/api-keys
2. Add it to `.env` as `OPENAI_API_KEY`
3. Restart the server

The AI features use GPT-4o-mini for cost-effective inference. Two AI capabilities are available:
- **AI Advisor** (Insights page or `/suggest` on Telegram) — analyzes all subscriptions and provides savings suggestions
- **Compare Alternatives** (Subscriptions page or `/compare Name` on Telegram) — finds cheaper alternatives for a specific subscription

---

## 9. API Endpoints

All API endpoints require a JWT token in the `Authorization: Bearer <token>` header unless noted otherwise.

### 9.1 Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login and receive JWT token |

### 9.2 Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/profile` | Yes | Get current user's profile |
| PUT | `/api/users/profile` | Yes | Update current user's profile |
| GET | `/api/users` | Admin | Get all users |

### 9.3 Subscriptions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/subscriptions` | Yes | List subscriptions (supports search, filter, sort, pagination) |
| GET | `/api/subscriptions/search?q=keyword` | Yes | Search by name |
| GET | `/api/subscriptions/:id` | Yes | Get single subscription |
| POST | `/api/subscriptions` | Yes | Create subscription |
| PUT | `/api/subscriptions/:id` | Yes | Update subscription |
| DELETE | `/api/subscriptions/:id` | Yes | Delete subscription |

**Query parameters for GET `/api/subscriptions`:**
- `q` — search by name
- `category` — filter by category
- `billingCycle` — filter by monthly/yearly
- `cost[lte]` / `cost[gte]` — filter by price range
- `sort` — sort fields (e.g., `-cost`, `createdAt`)
- `page` / `limit` — pagination

### 9.4 Usage Logs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/usageLogs` | Yes | List usage logs |
| GET | `/api/usageLogs/:id` | Yes | Get single log |
| POST | `/api/usageLogs` | Yes | Create usage log |
| PUT | `/api/usageLogs/:id` | Yes | Update usage log |
| DELETE | `/api/usageLogs/:id` | Yes | Delete usage log |

### 9.5 Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics/summary` | Yes | Monthly summary stats |
| GET | `/api/analytics/cost-per-use` | Yes | Per-subscription cost analysis |
| GET | `/api/analytics/insights` | Yes | Flagged subscriptions with recommendations |

### 9.6 AI
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/ai/suggestions` | Yes | AI-generated savings suggestions |
| GET | `/api/ai/alternatives/:id` | Yes | AI-generated alternatives for a subscription |

---

## 10. Web Dashboard Pages

| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Landing page — hero, how-it-works, features | No |
| `/login` | Login form | No |
| `/register` | Registration form | No |
| `/dashboard` | Summary cards, spending chart, recent activity, subscription table | Yes |
| `/subscriptions` | Subscription management table with add/edit/delete/alternatives | Yes |
| `/usage/:subscriptionId` | Usage history for a specific subscription | Yes |
| `/insights` | AI advisor, potential savings, flagged subscriptions | Yes |
| `/logout` | Clears session cookie and redirects to landing | No |

---

## 11. Mongoose Data Models

### User
| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| email | String | Required, unique, lowercase |
| password | String | Required, hashed with bcryptjs |
| role | String | "user" or "admin", default "user" |
| timestamps | Auto | createdAt, updatedAt |

### Subscription
| Field | Type | Notes |
|-------|------|-------|
| user | ObjectId | References User |
| name | String | Required |
| cost | Number | Required, min 0 |
| category | String | Required |
| billingCycle | String | "monthly" or "yearly" |
| timestamps | Auto | createdAt, updatedAt |

### UsageLog
| Field | Type | Notes |
|-------|------|-------|
| user | ObjectId | References User |
| subscription | ObjectId | References Subscription |
| date | Date | Default: now |
| action | String | "used" or "not_used" |
| notes | String | Optional |
| timestamps | Auto | createdAt, updatedAt |

### TelegramUser
| Field | Type | Notes |
|-------|------|-------|
| telegramChatId | String | Unique, required |
| user | ObjectId | References User |
| remindersEnabled | Boolean | Default: false |
| timestamps | Auto | createdAt, updatedAt |

---

## 12. Authentication Flow

### Web Dashboard
1. User registers or logs in via form
2. Server generates JWT and stores it in a browser cookie
3. `viewAuthMiddleware.js` reads the cookie on each page request
4. Protected pages redirect to `/login` if no valid token is found

### API
1. Client sends POST to `/api/auth/login` with email and password
2. Server returns JWT token in the response body
3. Client includes `Authorization: Bearer <token>` header on all subsequent requests
4. `authMiddleware.js` validates the token and attaches the user to the request

### Telegram Bot
1. User sends `/link email password` to the bot
2. Bot verifies credentials against the database
3. On success, creates a `TelegramUser` record mapping chat ID to user account
4. All subsequent commands use this mapping to identify the user

---

## 13. Testing with Thunder Client or Postman

### Recommended Order
1. **Register** — POST `/api/auth/register` with name, email, password
2. **Login** — POST `/api/auth/login` with email, password
3. Copy the JWT token from the response
4. Set header: `Authorization: Bearer <token>`
5. **Create subscription** — POST `/api/subscriptions`
6. **Log usage** — POST `/api/usageLogs`
7. **Check analytics** — GET `/api/analytics/summary`
8. **Get AI suggestions** — GET `/api/ai/suggestions`
9. **Find alternatives** — GET `/api/ai/alternatives/:subscriptionId`

### Sample Data

Register:
```json
{
  "name": "Tarun",
  "email": "tarun@example.com",
  "password": "123456"
}
```

Create subscription:
```json
{
  "name": "Netflix",
  "cost": 15.99,
  "category": "Entertainment",
  "billingCycle": "monthly"
}
```

Log usage:
```json
{
  "subscription": "SUBSCRIPTION_ID",
  "action": "used",
  "notes": "Watched a movie"
}
```

---

## 14. Security Practices

- **Password hashing** — bcryptjs with salt rounds, never stored in plain text
- **JWT authentication** — tokens required for all private routes
- **Input validation** — express-validator on registration and profile update
- **Environment variables** — secrets stored in `.env`, never committed to Git
- **CORS** — enabled for cross-origin frontend access
- **Cookie security** — sameSite: lax for CSRF protection
- **Git hygiene** — `.gitignore` excludes `node_modules/` and `.env`

---

## 15. Challenges and Solutions

| Challenge | Solution |
|-----------|----------|
| MongoDB connection errors | Load dotenv before database connection; use exact Atlas connection string |
| Port 5000 conflict on macOS | Switched to port 8000 |
| Telegram MarkdownV2 escaping crashes | Switched to plain text messages with error-safe send wrapper |
| Telegram 409 Conflict errors | Ensured only one bot instance runs at a time; kill old processes before restarting |
| Cookie httpOnly blocking JS API calls | Set httpOnly: false so client-side JS can read token for API requests |
| OpenAI response parsing | Fallback regex extraction for JSON arrays/objects in case of unexpected formatting |

---

## 16. Future Enhancements

- Email alerts for upcoming renewal dates
- Subscription auto-detection from bank SMS
- Spending forecast with budget limit alerts
- Subscription sharing / family split cost tracker
- Renewal calendar view
- Gamification with savings streaks and badges
- Natural language subscription entry
- Deployment to cloud platform (Render, Railway, or Fly.io)
- Password reset via email
- Dark mode toggle

---

## 17. Academic Deliverable Coverage

This project satisfies the following requirements:
- Secure backend API tailored to the project idea
- JWT-based authentication and authorization
- Protected user-specific endpoints
- Full CRUD operations for project resources (subscriptions, usage logs)
- Advanced query support (search, filter, sort, pagination, combined queries)
- Environment-based secret management
- Full-stack web interface with server-rendered pages
- AI integration using OpenAI API
- Telegram bot integration with chat-based interaction
- Analytics and insights engine
- Testing support using Thunder Client or Postman
- Maintainable modular MVC architecture

---

## 18. License

This project is developed for academic and educational purposes.
