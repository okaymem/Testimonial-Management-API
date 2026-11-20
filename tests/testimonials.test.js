const request = require("supertest");
const app = require("./setup");
const expect = require("chai").expect;

describe("Testimonials CRUD", function () {
  let token;
  let testimonialId;

  before(async function () {
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: `crud${Date.now()}@test.com`, password: "pass123", businessName: "CRUD Test" });
    token = registerRes.body.data.token;
  });

  beforeEach(async function () {
    // Clean up testimonials only, keep user
    const mongoose = require("mongoose");
    await mongoose.connection.collections.testimonials.deleteMany({});
  });

  it("POST /api/testimonials - should create testimonial", async function () {
    const res = await request(app)
      .post("/api/testimonials")
      .set("Authorization", `Bearer ${token}`)
      .send({ customerName: "John Doe", customerEmail: "john@test.com", rating: 5, text: "Great!" })
      .expect(201);

    expect(res.body).to.have.property("code", 201);
    expect(res.body.data).to.have.property("customerName", "John Doe");
    expect(res.body.data).to.have.property("status", "draft");
    expect(res.body.data).to.have.property("testimonialId");
    testimonialId = res.body.data.testimonialId;
  });

  it("GET /api/testimonials - should list user testimonials", async function () {
    await request(app).post("/api/testimonials").set("Authorization", `Bearer ${token}`).send({ customerName: "Test 1" });
    await request(app).post("/api/testimonials").set("Authorization", `Bearer ${token}`).send({ customerName: "Test 2" });

    const res = await request(app)
      .get("/api/testimonials")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).to.have.property("code", 200);
    expect(res.body.data).to.be.an("array").with.lengthOf(2);
    expect(res.body).to.have.property("pagination");
    expect(res.body.pagination).to.have.property("total", 2);
  });

  it("GET /api/testimonials/:id - should get single testimonial", async function () {
    const createRes = await request(app)
      .post("/api/testimonials")
      .set("Authorization", `Bearer ${token}`)
      .send({ customerName: "Single Test" });
    const id = createRes.body.data.testimonialId;

    const res = await request(app)
      .get(`/api/testimonials/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).to.have.property("code", 200);
    expect(res.body.data).to.have.property("testimonialId", id);
    expect(res.body.data).to.have.property("customerName", "Single Test");
  });

  it("PUT /api/testimonials/:id - should update testimonial", async function () {
    const createRes = await request(app)
      .post("/api/testimonials")
      .set("Authorization", `Bearer ${token}`)
      .send({ customerName: "Before Update" });
    const id = createRes.body.data.testimonialId;

    const res = await request(app)
      .put(`/api/testimonials/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ customerName: "After Update", rating: 4 })
      .expect(200);

    expect(res.body).to.have.property("code", 200);
    expect(res.body.data).to.have.property("customerName", "After Update");
    expect(res.body.data).to.have.property("rating", 4);
  });

  it("DELETE /api/testimonials/:id - should soft delete testimonial", async function () {
    const createRes = await request(app)
      .post("/api/testimonials")
      .set("Authorization", `Bearer ${token}`)
      .send({ customerName: "To Delete" });
    const id = createRes.body.data.testimonialId;

    const res = await request(app)
      .delete(`/api/testimonials/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).to.have.property("code", 200);
    expect(res.body.data).to.have.property("isDeleted", true);

    await request(app)
      .get(`/api/testimonials/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("should not allow access to other user testimonials", async function () {
    const otherRes = await request(app)
      .post("/api/auth/register")
      .send({ email: `other${Date.now()}@test.com`, password: "pass123", businessName: "Other" });
    const otherToken = otherRes.body.data.token;

    const createRes = await request(app)
      .post("/api/testimonials")
      .set("Authorization", `Bearer ${token}`)
      .send({ customerName: "My Testimonial" });
    const id = createRes.body.data.testimonialId;

    await request(app)
      .get(`/api/testimonials/${id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(403);
  });
});