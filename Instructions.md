# 📊 Digital Declutter Assistant

## 🧠 Project Overview
Digital Declutter Assistant is a full-stack web application designed to help users manage and optimize their subscription expenses such as Netflix, Spotify, gym memberships, and more. Users can track subscriptions, log usage, calculate cost-per-use, and receive insights on whether they are getting value for money. The system identifies underused subscriptions and suggests ways to reduce unnecessary spending. It also includes a planned Telegram bot for chat-based interaction.

---

## 🎯 Core Features

### Subscription Management
- Add, update, delete subscriptions
- Fields: name, cost, category, billing cycle

### Usage Tracking
- Log usage events
- Maintain usage history per subscription

### Cost Analysis
- Calculate cost per use:
  cost_per_use = total_cost / number_of_uses

### Insights & Recommendations
- Detect low-value subscriptions
- Suggest cancellation or optimization

### Dashboard
- Show total spending
- Show usage stats
- Highlight underused subscriptions

### Authentication
- Secure login and signup using JWT

### Telegram Bot (Planned)
- Add subscriptions via chat
- Log usage via chat
- Get reports via chat

---

## 🛠️ Tech Stack

Backend:
- Node.js
- Express.js

Frontend:
- EJS (Template Engine)

Database:
- MongoDB Atlas
- Mongoose

Authentication:
- JSON Web Tokens (JWT)

Tools:
- Postman
- GitHub

---

## 📁 Project Structure

/models → Mongoose schemas  
/routes → API routes  
/controllers → Business logic  
/config → DB connection  
/views → EJS templates  
/public → Static files  
app.js → Main server  
.env → Environment variables  

---

## 🧾 Database Schema

User:
{
  name: String,
  email: String,
  password: String
}

Subscription:
{
  user: ObjectId,
  name: String,
  cost: Number,
  category: String,
  billingCycle: String,
  createdAt: Date
}

Usage Log:
{
  user: ObjectId,
  subscription: ObjectId,
  date: Date,
  action: String
}

---

## ⚙️ Setup Instructions

1. Clone repo
git clone <repo-url>
cd project-folder

2. Install dependencies
npm install

3. Create .env file
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret

4. Run server
node app.js

5. Open browser
http://localhost:8000

---

## 🌐 MongoDB Atlas Setup

- Create cluster
- Create database: subscriptionDB
- Create collection: subscriptions
- Create DB user (read/write)
- Allow network access (0.0.0.0/0)
- Add connection string to .env

---

## 🧪 API Endpoints

Auth:
POST /api/auth/register
POST /api/auth/login

Subscriptions:
GET /api/subscriptions
POST /api/subscriptions
PUT /api/subscriptions/:id
DELETE /api/subscriptions/:id

Usage:
POST /api/usage
GET /api/usage/:subscriptionId

---

## 🤖 Telegram Bot Integration

Flow:
Telegram Bot → Express API → MongoDB

Sample Commands:
/add Netflix 15 monthly
/use Spotify
/report

Features:
- Add subscription
- Log usage
- Get insights

---

## 📅 Milestones

Week 1: Setup project, MongoDB, dataset  
Week 2: Build APIs  
Week 3: Build dashboard  
Week 4: Testing and documentation  

---

## 🚧 Challenges & Solutions

MongoDB Issue:
- Fixed .env and dotenv config

Port Conflict:
- Changed to port 8000

GitHub Issue:
- Removed node_modules
- Added .gitignore

MongoDB Atlas:
- Used Data Explorer

---

## 🧠 Skills Used

- Full Stack Development
- REST API Design
- MongoDB & Mongoose
- JWT Authentication
- MVC Architecture
- Debugging

---

## 🧩 AI Prompts for IDE

Backend:
Create an Express.js API for subscription management with CRUD operations using MongoDB.

Auth:
Implement JWT authentication with login and register routes.

Cost Analysis:
Write logic to calculate cost-per-use and identify low-value subscriptions.

Dashboard:
Create an EJS dashboard showing subscription analytics.

Telegram Bot:
Create a Telegram bot in Node.js that connects to the backend API.

---

## 🚀 Future Improvements

- AI recommendations
- Email alerts
- Payment integration
- Mobile app

---

## 📌 Summary

Digital Declutter Assistant is a smart web application that helps users track subscriptions, analyze usage, and reduce unnecessary expenses using a full-stack architecture with Node.js, Express, MongoDB, and EJS.