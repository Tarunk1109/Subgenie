
# SubGenie - Your AI Subscription Assistant

## 1. Introduction

SubGenie is a backend API designed to help users manage, monitor, and analyze their recurring subscriptions such as Netflix, Spotify, gym memberships, and similar services. The goal of the system is to give users better visibility into what they are paying for, how often they use those services, and whether a particular subscription is still worth keeping.

This project was developed as part of a phase-based academic full-stack application. In Phase 2, the focus is on building a secure, well-structured, fully functional backend API with authentication, authorization, CRUD operations, and advanced query capabilities.

The system allows users to:
- create an account and log in securely
- manage their own subscriptions
- record usage activity for subscriptions
- retrieve subscription data efficiently using search, filtering, sorting, and pagination
- access protected user profile endpoints
- work with a clean modular Express and MongoDB architecture

Although the current implementation focuses on backend APIs, the project is designed to support future extensions such as AI-generated subscription recommendations, Telegram bot integration, analytics dashboards, and automated usage tracking.

---

## 2. Project Objectives

The primary objectives of SubGenie are:

- to provide a secure backend for subscription management
- to implement authentication using JSON Web Tokens (JWT)
- to allow users to perform full CRUD operations on subscription resources
- to support usage tracking through usage log resources
- to implement advanced API query features including:
  - search
  - filtering
  - sorting
  - pagination
  - combined query support
- to ensure that private user data is accessible only to authorized users
- to maintain a scalable and maintainable project structure using modular backend design

---

## 3. Core Features

### 3.1 Authentication and Authorization
The application includes a complete authentication flow:
- user registration
- user login
- password hashing using bcryptjs
- JWT token generation
- protected private routes
- optional admin-only access for selected endpoints

### 3.2 Subscription Management
Each logged-in user can:
- create subscriptions
- view all of their subscriptions
- view a single subscription by ID
- update a subscription
- delete a subscription

Each subscription contains fields such as:
- name
- cost
- category
- billing cycle
- associated user

### 3.3 Usage Log Management
Each logged-in user can:
- create usage logs linked to a subscription
- fetch usage logs
- view individual usage log entries
- update usage logs
- delete usage logs

This makes it possible to later calculate analytics such as:
- frequency of use
- cost per use
- underutilized subscriptions

### 3.4 Advanced Query Features
The subscription API supports:
- keyword search
- filtering by category
- filtering by billing cycle
- filtering by price ranges
- sorting by cost or created date
- pagination
- combined queries with multiple parameters

### 3.5 User Profile
The project also includes protected user endpoints so a logged-in user can:
- fetch their profile
- update their profile

An admin-only endpoint can also be used to:
- fetch all users

---

## 4. Technology Stack

The project is built using the following technologies:

### Backend
- Node.js
- Express.js

### Database
- MongoDB Atlas
- Mongoose

### Authentication and Security
- JSON Web Token (JWT)
- bcryptjs
- express-validator
- dotenv
- cors

### Development and Testing Tools
- Thunder Client
- Postman
- Git
- GitHub
- Visual Studio Code

---

## 5. Project Structure

The project follows a modular structure so that responsibilities are separated clearly and the codebase remains easier to maintain and expand.

\`\`\`
subgenie/
│
├── bot/
│   └── telegramBot.js
│
├── config/
│   └── db.js
│
├── controllers/
│   ├── analyticsController.js
│   ├── authController.js
│   ├── subscriptionController.js
│   ├── usageLogController.js
│   ├── userController.js
│   └── viewController.js
│
├── middleware/
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│   └── viewAuthMiddleware.js
│
├── models/
│   ├── Subscription.js
│   ├── TelegramUser.js
│   ├── UsageLog.js
│   └── User.js
│
├── public/
│   ├── css/custom.css
│   └── js/main.js
│
├── routes/
│   ├── analyticsRoutes.js
│   ├── authRoutes.js
│   ├── subscriptionRoutes.js
│   ├── usageLogRoutes.js
│   ├── userRoutes.js
│   └── viewRoutes.js
│
├── utils/
│   └── generateToken.js
│
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── dashboard.ejs
│   ├── insights.ejs
│   ├── landing.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── subscriptions.ejs
│   └── usage.ejs
│
├── app.js
├── .env
├── .gitignore
├── package.json
└── README.md
\`\`\`

### Structure Explanation

#### config/
Contains configuration files. In this project, `db.js` is responsible for connecting the application to MongoDB Atlas.

#### controllers/
Contains the business logic for each route. Controllers receive requests, process data, interact with models, and return responses.

#### middleware/
Contains reusable middleware functions such as:
- authentication middleware
- authorization middleware
- not found handler
- global error handler

#### models/
Contains Mongoose schemas and models that define the structure of the application data.

#### routes/
Contains route definitions for each resource. Routes are connected to controller functions.

#### utils/
Contains utility/helper functions such as token generation.

#### app.js
The main application entry point. It initializes environment variables, connects the database, configures middleware, and mounts API routes.

#### .env
Stores environment-specific secrets and configuration values. This file must never be pushed to GitHub.

#### .gitignore
Prevents sensitive or unnecessary files such as `.env` and `node_modules` from being committed.

---

## 6. Installation and Setup

Follow these steps to run the project on a new laptop or machine.

### Step 1: Clone the repository
\`\`\`bash
git clone <your-repository-url>
cd subgenie
\`\`\`

### Step 2: Install dependencies
\`\`\`bash
npm install
\`\`\`

### Step 3: Configure environment variables
Create a `.env` file in the root directory and add the following:

\`\`\`env
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
\`\`\`

### Step 4: Start the server
\`\`\`bash
node app.js
\`\`\`

### Step 5: Verify the API is running
Open the following in your browser:

\`\`\`
http://localhost:8000
\`\`\`

If everything is configured correctly, the server should return a simple API running message.

---

## 7. MongoDB Atlas Configuration

This project uses MongoDB Atlas as the cloud database platform.

### Setup Process
1. Create a MongoDB Atlas cluster
2. Create a database user with read and write privileges
3. Add a network access rule to allow connections
4. Copy the connection string from Atlas
5. Add the connection string to the `.env` file as `MONGO_URI`

### Example
\`\`\`env
MONGO_URI=mongodb+srv://username:password@cluster-name.mongodb.net/subgenieDB
\`\`\`

### Important Notes
- do not include spaces in the username or password
- avoid committing `.env` to GitHub
- if credentials are exposed, immediately reset them in MongoDB Atlas

---

## 8. Environment Variables

The following environment variables are required:

### PORT
Defines the port on which the Express server runs.

Example:
\`\`\`env
PORT=8000
\`\`\`

### MONGO_URI
Stores the connection string used by Mongoose to connect to MongoDB Atlas.

Example:
\`\`\`env
MONGO_URI=mongodb+srv://username:password@cluster-name.mongodb.net/subgenieDB
\`\`\`

### JWT_SECRET
Used to sign and verify JWT tokens.

Example:
\`\`\`env
JWT_SECRET=supersecretkey123
\`\`\`

### TELEGRAM_BOT_TOKEN (Optional)
Used by the Telegram bot integration. If not set, the bot is simply disabled and the web app works normally.

Example:
\`\`\`env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
\`\`\`

---

## 9. Authentication Flow

The authentication flow works as follows:

### Registration
A new user sends a POST request to the registration endpoint with:
- name
- email
- password

The server:
- validates the input
- checks whether the user already exists
- hashes the password using bcryptjs
- stores the user in the database
- generates a JWT token
- returns the token along with the new user information

### Login
An existing user sends a POST request with:
- email
- password

The server:
- validates the credentials
- checks the email in the database
- compares the password with the hashed password
- generates a JWT token if credentials are valid
- returns the token

### Accessing Protected Routes
To access a protected route, the user must include the token in the request header:

\`\`\`
Authorization: Bearer <token>
\`\`\`

The authentication middleware:
- extracts the token
- verifies it using `JWT_SECRET`
- finds the corresponding user
- attaches the user object to the request
- allows access only if the token is valid

---

## 10. API Endpoints

## 10.1 Authentication Routes

### Register User
**POST** `/api/auth/register`

Registers a new user.

#### Request Body
\`\`\`json
{
  "name": "Tarun",
  "email": "tarun@example.com",
  "password": "123456"
}
\`\`\`

#### Response
Returns:
- user ID
- name
- email
- role
- JWT token

---

### Login User
**POST** `/api/auth/login`

Authenticates an existing user.

#### Request Body
\`\`\`json
{
  "email": "tarun@example.com",
  "password": "123456"
}
\`\`\`

#### Response
Returns:
- user ID
- name
- email
- role
- JWT token

---

## 10.2 User Routes

### Get Logged-In User Profile
**GET** `/api/users/profile`

Protected route. Returns the currently authenticated user's profile.

### Update Logged-In User Profile
**PUT** `/api/users/profile`

Protected route. Updates the current user's profile information.

### Get All Users
**GET** `/api/users`

Protected route. Admin-only route to fetch all users.

---

## 10.3 Subscription Routes

### Get All Subscriptions
**GET** `/api/subscriptions`

Protected route. Returns all subscriptions belonging to the logged-in user.

### Get Single Subscription
**GET** `/api/subscriptions/:id`

Protected route. Returns one subscription by ID.

### Create Subscription
**POST** `/api/subscriptions`

Protected route. Creates a new subscription.

#### Request Body
\`\`\`json
{
  "name": "Netflix",
  "cost": 15,
  "category": "Entertainment",
  "billingCycle": "monthly"
}
\`\`\`

### Update Subscription
**PUT** `/api/subscriptions/:id`

Protected route. Updates an existing subscription.

### Delete Subscription
**DELETE** `/api/subscriptions/:id`

Protected route. Deletes a subscription.

### Search Subscriptions
**GET** `/api/subscriptions/search?q=netflix`

Protected route. Searches subscriptions by keyword.

---

## 10.4 Usage Log Routes

### Get All Usage Logs
**GET** `/api/usageLogs`

Protected route. Returns all usage logs for the logged-in user.

### Get Single Usage Log
**GET** `/api/usageLogs/:id`

Protected route. Returns a single usage log by ID.

### Create Usage Log
**POST** `/api/usageLogs`

Protected route. Creates a usage log associated with a subscription.

#### Request Body
\`\`\`json
{
  "subscription": "SUBSCRIPTION_ID",
  "action": "used",
  "notes": "Watched a movie"
}
\`\`\`

### Update Usage Log
**PUT** `/api/usageLogs/:id`

Protected route. Updates a usage log entry.

### Delete Usage Log
**DELETE** `/api/usageLogs/:id`

Protected route. Deletes a usage log entry.

---

## 11. Query Features

One of the major Phase 2 requirements is advanced query support. This project includes search, filter, sort, pagination, and combined query behavior.

### 11.1 Search
Searches resources by relevant text fields.

Example:
\`\`\`
GET /api/subscriptions/search?q=netflix
\`\`\`

### 11.2 Filtering
Filters results by selected attributes.

Examples:
\`\`\`
GET /api/subscriptions?category=Entertainment
GET /api/subscriptions?billingCycle=monthly
GET /api/subscriptions?cost[lte]=20
GET /api/subscriptions?cost[gte]=10
\`\`\`

### 11.3 Sorting
Sorts results by one or more fields.

Examples:
\`\`\`
GET /api/subscriptions?sort=-createdAt
GET /api/subscriptions?sort=cost
\`\`\`

### 11.4 Pagination
Breaks results into pages to avoid large responses.

Example:
\`\`\`
GET /api/subscriptions?page=2&limit=5
\`\`\`

### 11.5 Combined Queries
Supports multiple query parameters at the same time.

Example:
\`\`\`
GET /api/subscriptions?q=netflix&category=Entertainment&sort=-cost&page=1&limit=5
\`\`\`

This allows the frontend or client to build flexible data views efficiently.

---

## 12. Sample Testing Data

### Register
\`\`\`json
{
  "name": "Tarun",
  "email": "tarun@example.com",
  "password": "123456"
}
\`\`\`

### Login
\`\`\`json
{
  "email": "tarun@example.com",
  "password": "123456"
}
\`\`\`

### Create Subscription
\`\`\`json
{
  "name": "Netflix",
  "cost": 15,
  "category": "Entertainment",
  "billingCycle": "monthly"
}
\`\`\`

### Create Usage Log
\`\`\`json
{
  "subscription": "PUT_SUBSCRIPTION_ID_HERE",
  "action": "used",
  "notes": "Watched a movie"
}
\`\`\`

---

## 13. How to Test with Thunder Client

This API can be tested using Thunder Client inside Visual Studio Code.

### Recommended Testing Order
1. Register a user
2. Log in with that user
3. Copy the JWT token from the response
4. Add the token to the `Authorization` header as:
   `Bearer <token>`
5. Test protected endpoints such as profile, subscriptions, and usage logs

### Key Things to Test
- successful registration
- successful login
- unauthorized access without token
- creating subscriptions
- updating subscriptions
- deleting subscriptions
- searching subscriptions
- filtering subscriptions
- sorting subscriptions
- pagination
- creating usage logs
- updating user profile

---

## 14. Security Practices

The project includes the following security-related practices:

### Password Hashing
Passwords are never stored in plain text. They are hashed using bcryptjs before being saved in the database.

### JWT Authentication
Private routes are protected using JWT middleware. Only authorized users with valid tokens can access protected resources.

### Environment Variables
Sensitive configuration such as the database URI and JWT secret are stored in `.env`.

### Input Validation
The API validates user input using express-validator to reduce invalid or unsafe input.

### CORS
CORS is enabled so frontend access can be controlled appropriately.

### Git Hygiene
The project uses `.gitignore` to exclude:
- node_modules
- .env

This prevents unnecessary files and secrets from being committed.

---

## 15. Mongoose Data Models

### User Model
Represents the registered users of the system.

Main fields:
- name
- email
- password
- role

### Subscription Model
Represents a recurring subscription owned by a user.

Main fields:
- user
- name
- cost
- category
- billingCycle

### UsageLog Model
Represents a usage activity entry linked to a subscription.

Main fields:
- user
- subscription
- date
- action
- notes

These schemas are designed so the data is normalized and each user sees only their own resources.

---

## 16. Challenges Faced During Development

### MongoDB Connection Errors
At the beginning of setup, issues occurred due to incorrect connection strings, missing URI schemes, and environment variable loading problems. These were resolved by correctly loading dotenv before the database connection and using the exact MongoDB Atlas driver connection string.

### Port Conflicts
Port 5000 was found to be already occupied by a system process on macOS. This was resolved by switching the application to port 8000.

### Git Mistakes
`node_modules` and `.env` were initially at risk of being committed. This was fixed by creating a `.gitignore` file and removing tracked sensitive/unnecessary files from Git.

### MongoDB Atlas Configuration
There was initial confusion regarding cluster setup, database access, and network access. This was resolved by properly configuring database users, network IP access, and the cluster connection string.

---

## 17. Analytics API

The analytics layer provides computed insights on top of the raw subscription and usage data.

### Endpoints

#### Get Summary
**GET** `/api/analytics/summary`

Protected route. Returns aggregated stats for the current month.

Response includes:
- totalSubscriptions
- totalMonthlySpend (yearly subscriptions are normalized to monthly)
- usesThisMonth
- avgCostPerUse

#### Get Cost Per Use
**GET** `/api/analytics/cost-per-use`

Protected route. Returns a per-subscription breakdown with cost-per-use, sorted worst-value first.

#### Get Insights
**GET** `/api/analytics/insights`

Protected route. Returns flagged subscriptions with recommendations. Flags include:
- `unused` — no usage logs this month
- `low_usage` — fewer than 4 uses this month
- `high_cost_per_use` — cost per use exceeds 50% of subscription price

Each insight includes a human-readable recommendation and potential savings calculation.

---

## 18. EJS Dashboard

SubGenie includes a full server-rendered web interface built with EJS templates and styled with Tailwind CSS via CDN.

### Pages

| Route | Page |
|-------|------|
| `/` | Landing page with feature overview |
| `/login` | Login form |
| `/register` | Registration form |
| `/dashboard` | Main dashboard with summary cards, spending chart, recent activity |
| `/subscriptions` | Subscription management (add, delete, log usage) |
| `/usage/:subscriptionId` | Usage history for a specific subscription |
| `/insights` | Insights and recommendations with savings potential |
| `/logout` | Clears session and redirects to landing |

### Authentication

The dashboard uses HTTP-only cookies to store JWT tokens. The `viewAuthMiddleware.js` middleware reads the cookie and authenticates the user for protected pages. The API endpoints continue to use Bearer token authentication as before.

### Features

- Summary cards showing total spend, subscription count, uses, and average cost-per-use
- Doughnut chart (Chart.js) showing spending by category
- Subscription cards with quick-action buttons (log use, view history, delete)
- Color-coded usage indicators (green for well-used, yellow for low, red for unused)
- Modal form for adding new subscriptions
- Toast notifications for success/error feedback

---

## 19. Telegram Bot

SubGenie includes a Telegram bot that allows users to manage subscriptions and log usage directly from Telegram.

### Setup

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` and follow the prompts to create your bot
3. Copy the bot token provided by BotFather
4. Add it to your `.env` file as `TELEGRAM_BOT_TOKEN`
5. Restart the server — the bot starts automatically if the token is present

### Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and setup instructions |
| `/link email password` | Link your Telegram account to SubGenie |
| `/add Name Cost Category [monthly/yearly]` | Add a new subscription |
| `/use SubscriptionName` | Log a usage event |
| `/list` | List all subscriptions with costs |
| `/report` | Get monthly cost-per-use report with warnings |
| `/help` | Show available commands |

### How It Works

The bot runs inside the same Node.js process as the web server using long-polling. It directly queries MongoDB through Mongoose models (not HTTP calls to the API). Users must first link their Telegram account to their SubGenie account using the `/link` command with their email and password.

A `TelegramUser` model maps Telegram chat IDs to SubGenie user accounts, enabling secure per-user data access.

---

## 20. Future Enhancements

Planned improvements include:

- AI-powered spending optimization recommendations
- email alerts for upcoming renewals
- payment integration for direct subscription management
- mobile app
- reminder systems for renewals and billing alerts
- admin dashboards for overall usage monitoring
- optional password reset and email verification

---

## 21. Academic Deliverable Coverage

This project satisfies the key Phase 2 requirements:

- secure backend API tailored to the project idea
- JWT-based authentication
- protected user-specific endpoints
- CRUD operations for project resources
- advanced query support
- environment-based secret management
- testing support using Thunder Client or Postman
- maintainable modular architecture

---

## 22. Team Collaboration Note

This project was developed in a collaborative team environment. Although responsibilities may be divided during development, the structure and implementation are intended to support shared understanding across the team. The modular design helps each team member work on routes, controllers, models, and middleware without tightly coupling the system.

---

## 23. License

This project is developed for academic and educational purposes only.



