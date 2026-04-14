import { expect } from "chai";
import request from "supertest";
import app from "../app.js";

// Shared test state
let token = "";
let subId  = "";
const email    = `analytics_${Date.now()}@example.com`;
const password = "TestPass123";

// Helper: register and return token
async function setupUser() {
  const res = await request(app).post("/api/auth/register").send({
    name: "Analytics User",
    email,
    password,
  });
  return res.body.token;
}

// Helper: create subscription and return id
async function setupSubscription(t) {
  const res = await request(app)
    .post("/api/subscriptions")
    .set("Authorization", `Bearer ${t}`)
    .send({ name: "Test Analytics Sub", cost: 20, category: "Testing", billingCycle: "monthly" });
  return res.body._id;
}

// ─── Analytics: Summary ──────────────────────────────────────────────────────
describe("GET /api/analytics/summary", () => {
  before(async () => {
    token = await setupUser();
    subId = await setupSubscription(token);
    // Log one usage so avgCostPerUse can be computed
    await request(app)
      .post("/api/usageLogs")
      .set("Authorization", `Bearer ${token}`)
      .send({ subscription: subId, action: "used" });
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get("/api/analytics/summary");
    expect(res.status).to.equal(401);
  });

  it("should return a summary object with required fields", async () => {
    const res = await request(app)
      .get("/api/analytics/summary")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("totalSubscriptions");
    expect(res.body).to.have.property("totalMonthlySpend");
    expect(res.body).to.have.property("usesThisMonth");
    expect(res.body).to.have.property("avgCostPerUse");
  });

  it("should reflect the subscription created in setup", async () => {
    const res = await request(app)
      .get("/api/analytics/summary")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.totalSubscriptions).to.be.at.least(1);
    expect(res.body.totalMonthlySpend).to.be.at.least(20);
  });
});

// ─── Analytics: Cost-per-use ─────────────────────────────────────────────────
describe("GET /api/analytics/cost-per-use", () => {
  let localToken = "";
  let localSubId = "";
  const localEmail = `costperuse_${Date.now()}@example.com`;

  before(async () => {
    const regRes = await request(app).post("/api/auth/register").send({
      name: "CostPerUse User", email: localEmail, password,
    });
    localToken = regRes.body.token;
    const subRes = await request(app)
      .post("/api/subscriptions")
      .set("Authorization", `Bearer ${localToken}`)
      .send({ name: "CPUTest", cost: 15, category: "Testing", billingCycle: "monthly" });
    localSubId = subRes.body._id;
    await request(app)
      .post("/api/usageLogs")
      .set("Authorization", `Bearer ${localToken}`)
      .send({ subscription: localSubId, action: "used" });
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get("/api/analytics/cost-per-use");
    expect(res.status).to.equal(401);
  });

  it("should return an array", async () => {
    const res = await request(app)
      .get("/api/analytics/cost-per-use")
      .set("Authorization", `Bearer ${localToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
  });

  it("each item should have the required fields", async () => {
    const res = await request(app)
      .get("/api/analytics/cost-per-use")
      .set("Authorization", `Bearer ${localToken}`);
    if (res.body.length > 0) {
      const item = res.body[0];
      expect(item).to.have.property("name");
      expect(item).to.have.property("monthlyCost");
      expect(item).to.have.property("useCount");
      expect(item).to.have.property("costPerUse");
    }
  });
});

// ─── Analytics: Insights ─────────────────────────────────────────────────────
describe("GET /api/analytics/insights", () => {
  let localToken = "";
  const localEmail = `insights_${Date.now()}@example.com`;

  before(async () => {
    const regRes = await request(app).post("/api/auth/register").send({
      name: "Insights User", email: localEmail, password,
    });
    localToken = regRes.body.token;
    await request(app)
      .post("/api/subscriptions")
      .set("Authorization", `Bearer ${localToken}`)
      .send({ name: "UnusedService", cost: 30, category: "Testing", billingCycle: "monthly" });
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get("/api/analytics/insights");
    expect(res.status).to.equal(401);
  });

  it("should return insights structure", async () => {
    const res = await request(app)
      .get("/api/analytics/insights")
      .set("Authorization", `Bearer ${localToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("total");
    expect(res.body).to.have.property("potentialSavings");
    expect(res.body).to.have.property("insights");
    expect(res.body.insights).to.be.an("array");
  });

  it("unused subscription should appear in insights", async () => {
    const res = await request(app)
      .get("/api/analytics/insights")
      .set("Authorization", `Bearer ${localToken}`);
    const unused = res.body.insights.filter(i => i.flags.includes("unused"));
    expect(unused.length).to.be.at.least(1);
  });
});

// ─── Usage Logs CRUD ─────────────────────────────────────────────────────────
describe("Usage Logs", () => {
  let localToken = "";
  let localSubId = "";
  let logId      = "";
  const localEmail = `usagelogs_${Date.now()}@example.com`;

  before(async () => {
    const regRes = await request(app).post("/api/auth/register").send({
      name: "UsageLog User", email: localEmail, password,
    });
    localToken = regRes.body.token;
    const subRes = await request(app)
      .post("/api/subscriptions")
      .set("Authorization", `Bearer ${localToken}`)
      .send({ name: "LogTestSub", cost: 10, category: "Testing", billingCycle: "monthly" });
    localSubId = subRes.body._id;
  });

  it("POST /api/usageLogs — 401 without token", async () => {
    const res = await request(app).post("/api/usageLogs").send({ subscription: localSubId });
    expect(res.status).to.equal(401);
  });

  it("POST /api/usageLogs — creates a log", async () => {
    const res = await request(app)
      .post("/api/usageLogs")
      .set("Authorization", `Bearer ${localToken}`)
      .send({ subscription: localSubId, action: "used" });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property("_id");
    expect(res.body.action).to.equal("used");
    logId = res.body._id;
  });

  it("GET /api/usageLogs — returns paginated logs", async () => {
    const res = await request(app)
      .get("/api/usageLogs")
      .set("Authorization", `Bearer ${localToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("data");
    expect(res.body).to.have.property("total");
    expect(res.body.data).to.be.an("array");
    expect(res.body.data.length).to.be.at.least(1);
  });

  it("GET /api/usageLogs — filter by subscription", async () => {
    const res = await request(app)
      .get(`/api/usageLogs?subscription=${localSubId}`)
      .set("Authorization", `Bearer ${localToken}`);
    expect(res.status).to.equal(200);
    expect(res.body.data.every(l =>
      (l.subscription._id || l.subscription) === localSubId
    )).to.equal(true);
  });

  it("GET /api/usageLogs/:id — returns single log", async () => {
    const res = await request(app)
      .get(`/api/usageLogs/${logId}`)
      .set("Authorization", `Bearer ${localToken}`);
    expect(res.status).to.equal(200);
    expect(res.body._id).to.equal(logId);
  });

  it("DELETE /api/usageLogs/:id — deletes the log", async () => {
    const res = await request(app)
      .delete(`/api/usageLogs/${logId}`)
      .set("Authorization", `Bearer ${localToken}`);
    expect(res.status).to.equal(200);
    expect(res.body.message).to.include("deleted");
  });
});

// ─── User profile ─────────────────────────────────────────────────────────────
describe("GET /api/users/profile", () => {
  let profileToken = "";
  const profileEmail = `profile_${Date.now()}@example.com`;

  before(async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Profile User", email: profileEmail, password,
    });
    profileToken = res.body.token;
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get("/api/users/profile");
    expect(res.status).to.equal(401);
  });

  it("should return user object without password", async () => {
    const res = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${profileToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("_id");
    expect(res.body).to.have.property("name");
    expect(res.body).to.have.property("email");
    expect(res.body).to.have.property("role");
    expect(res.body).to.not.have.property("password");
    expect(res.body.email).to.equal(profileEmail);
  });
});
