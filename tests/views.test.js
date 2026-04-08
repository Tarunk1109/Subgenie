import { expect } from "chai";
import request from "supertest";
import app from "../app.js";

describe("Redirect unauthenticated users to /login", () => {
  it("GET /dashboard should redirect to /login", async () => {
    const res = await request(app).get("/dashboard");
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal("/login");
  });

  it("GET /subscriptions should redirect to /login", async () => {
    const res = await request(app).get("/subscriptions");
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal("/login");
  });

  it("GET /insights should redirect to /login", async () => {
    const res = await request(app).get("/insights");
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal("/login");
  });

  it("GET /profile should redirect to /login", async () => {
    const res = await request(app).get("/profile");
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal("/login");
  });

  it("GET /admin should redirect to /login", async () => {
    const res = await request(app).get("/admin");
    expect(res.status).to.equal(302);
    expect(res.headers.location).to.equal("/login");
  });
});

describe("Public pages render correctly", () => {
  it("GET / should return 200", async () => {
    const res = await request(app).get("/");
    expect(res.status).to.equal(200);
  });

  it("GET /login should return 200", async () => {
    const res = await request(app).get("/login");
    expect(res.status).to.equal(200);
  });

  it("GET /register should return 200", async () => {
    const res = await request(app).get("/register");
    expect(res.status).to.equal(200);
  });
});

describe("Form submission error handling", () => {
  it("POST /login with empty body should show error", async () => {
    const res = await request(app).post("/login").send({});
    expect(res.status).to.equal(200);
    expect(res.text).to.include("Invalid email or password");
  });

  it("POST /register with short password should show error", async () => {
    const res = await request(app)
      .post("/register")
      .send({ name: "Test", email: "t@t.com", password: "12", confirmPassword: "12" });
    expect(res.status).to.equal(200);
    expect(res.text).to.include("at least 6 characters");
  });

  it("POST /register with mismatched passwords should show error", async () => {
    const res = await request(app)
      .post("/register")
      .send({ name: "Test", email: "t@t.com", password: "123456", confirmPassword: "654321" });
    expect(res.status).to.equal(200);
    expect(res.text).to.include("do not match");
  });
});
