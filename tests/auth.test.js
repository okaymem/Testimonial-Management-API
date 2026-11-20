const request = require("supertest");
const app = require("./setup");
const expect = require("chai").expect;

describe("Auth API", function () {
  const testUser = {
    email: "test@example.com",
    password: "password123",
    businessName: "Test Business"
  };

  beforeEach(async function () {
    // Register fresh user for each test to avoid rate limiting
    await request(app).post("/api/auth/register").send({
      email: `test${Date.now()}@example.com`,
      password: testUser.password,
      businessName: testUser.businessName
    });
  });

  it("POST /api/auth/register - should register new user", async function () {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: `new${Date.now()}@test.com`, password: testUser.password, businessName: testUser.businessName })
      .expect(201);

    expect(res.body).to.have.property("code", 201);
    expect(res.body).to.have.property("status", "success");
    expect(res.body.data).to.have.property("user");
    expect(res.body.data.user).to.have.property("businessName", testUser.businessName);
    expect(res.body.data.user).to.have.property("userId").that.is.a("number");
    expect(res.body.data).to.have.property("token").that.is.a("string");
  });

  it("POST /api/auth/register - should fail with duplicate email", async function () {
    const email = `dup${Date.now()}@test.com`;
    await request(app).post("/api/auth/register").send({ email, password: testUser.password, businessName: testUser.businessName });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password: testUser.password, businessName: testUser.businessName })
      .expect(400);

    expect(res.body).to.have.property("status", "failure");
  });

  it("POST /api/auth/login - should login and return token", async function () {
    const email = `login${Date.now()}@test.com`;
    await request(app).post("/api/auth/register").send({ email, password: testUser.password, businessName: testUser.businessName });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: testUser.password })
      .expect(200);

    expect(res.body).to.have.property("code", 200);
    expect(res.body).to.have.property("status", "success");
    expect(res.body.data).to.have.property("token").that.is.a("string");
  });

  it("POST /api/auth/login - should fail with wrong password", async function () {
    const email = `wrong${Date.now()}@test.com`;
    await request(app).post("/api/auth/register").send({ email, password: testUser.password, businessName: testUser.businessName });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong" })
      .expect(401);

    expect(res.body).to.have.property("status", "failure");
  });
});