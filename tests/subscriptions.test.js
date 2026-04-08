import { expect } from "chai";
import request from "supertest";
import app from "../app.js";

let token;
let subId;
const email = `subtest_${Date.now()}@example.com`;

before(async () => {
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Sub Tester", email, password: "Test123456" });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Test123456" });

  token = res.body.token;
});

describe("GET /api/subscriptions", () => {
  it("should return 401 without token", async () => {
    const res = await request(app).get("/api/subscriptions");
    expect(res.status).to.equal(401);
  });

  it("should return 200 with data array when authenticated", async () => {
    const res = await request(app)
      .get("/api/subscriptions")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("data").that.is.an("array");
  });
});

describe("POST /api/subscriptions", () => {
  it("should return 201 with _id when valid", async () => {
    const res = await request(app)
      .post("/api/subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "TestFlix", cost: 9.99, category: "Entertainment", billingCycle: "monthly" });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property("_id");
    subId = res.body._id;
  });
});

describe("GET /api/subscriptions/:id", () => {
  it("should return 200 with correct subscription", async () => {
    const res = await request(app)
      .get(`/api/subscriptions/${subId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(200);
    expect(res.body.name).to.equal("TestFlix");
  });
});

describe("PUT /api/subscriptions/:id", () => {
  it("should return 200 with updated name", async () => {
    const res = await request(app)
      .put(`/api/subscriptions/${subId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "TestFlixUpdated" });
    expect(res.status).to.equal(200);
    expect(res.body.name).to.equal("TestFlixUpdated");
  });
});

describe("GET /api/subscriptions/search", () => {
  it("should return matching subscriptions", async () => {
    const res = await request(app)
      .get("/api/subscriptions/search?q=TestFlix")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array").that.is.not.empty;
  });
});

describe("DELETE /api/subscriptions/:id", () => {
  it("should return 200 with deleted message", async () => {
    const res = await request(app)
      .delete(`/api/subscriptions/${subId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(200);
    expect(res.body.message).to.include("deleted");
  });
});
