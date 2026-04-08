import { expect } from "chai";
import request from "supertest";
import app from "../app.js";

const uniqueEmail = `testuser_${Date.now()}@example.com`;
const testPassword = "Test123456";

describe("POST /api/auth/register", () => {
  it("should return 400 when body is empty", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(res.status).to.equal(400);
  });

  it("should return 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: "notanemail", password: testPassword });
    expect(res.status).to.equal(400);
  });

  it("should return 400 when password is too short", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: uniqueEmail, password: "12" });
    expect(res.status).to.equal(400);
  });

  it("should return 201 with token when data is valid", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email: uniqueEmail, password: testPassword });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property("token");
  });

  it("should return 400 for duplicate email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email: uniqueEmail, password: testPassword });
    expect(res.status).to.equal(400);
  });
});

describe("POST /api/auth/login", () => {
  it("should return 401 when email does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: `nonexistent_${Date.now()}@test.com`, password: "whatever" });
    expect(res.status).to.equal(401);
  });

  it("should return 401 when password is wrong", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: uniqueEmail, password: "wrongpassword" });
    expect(res.status).to.equal(401);
  });

  it("should return 200 with token when credentials are correct", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: uniqueEmail, password: testPassword });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("token");
  });
});
