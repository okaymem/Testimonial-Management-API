const request = require("supertest");
const app = require("./setup");
const expect = require("chai").expect;

describe("Status Transitions", function () {
  let token;
  let testimonialId;

  before(async function () {
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: `status${Date.now()}@test.com`, password: "pass123", businessName: "Status Test" });
    token = registerRes.body.data.token;
  });

  beforeEach(async function () {
    const mongoose = require("mongoose");
    await mongoose.connection.collections.testimonials.deleteMany({});

    const createRes = await request(app)
      .post("/api/testimonials")
      .set("Authorization", `Bearer ${token}`)
      .send({ customerName: "Status Test" });
    testimonialId = createRes.body.data.testimonialId;
  });

  it("should allow valid transition: draft -> recording", async function () {
    const res = await request(app)
      .patch(`/api/testimonials/${testimonialId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "recording" })
      .expect(200);

    expect(res.body).to.have.property("code", 200);
    expect(res.body.data).to.have.property("status", "recording");
  });

  it("should allow valid transition: recording -> processing", async function () {
    await request(app)
      .patch(`/api/testimonials/${testimonialId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "recording" });

    const res = await request(app)
      .patch(`/api/testimonials/${testimonialId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "processing" })
      .expect(200);

    expect(res.body.data).to.have.property("status", "processing");
  });

  it("should allow valid transition: processing -> completed", async function () {
    await request(app).patch(`/api/testimonials/${testimonialId}/status`).set("Authorization", `Bearer ${token}`).send({ status: "recording" });
    await request(app).patch(`/api/testimonials/${testimonialId}/status`).set("Authorization", `Bearer ${token}`).send({ status: "processing" });

    const res = await request(app)
      .patch(`/api/testimonials/${testimonialId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "completed" })
      .expect(200);

    expect(res.body.data).to.have.property("status", "completed");
  });

  it("should allow valid transition: completed -> shared", async function () {
    await request(app).patch(`/api/testimonials/${testimonialId}/status`).set("Authorization", `Bearer ${token}`).send({ status: "recording" });
    await request(app).patch(`/api/testimonials/${testimonialId}/status`).set("Authorization", `Bearer ${token}`).send({ status: "processing" });
    await request(app).patch(`/api/testimonials/${testimonialId}/status`).set("Authorization", `Bearer ${token}`).send({ status: "completed" });

    const res = await request(app)
      .patch(`/api/testimonials/${testimonialId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "shared" })
      .expect(200);

    expect(res.body.data).to.have.property("status", "shared");
    expect(res.body.data).to.have.property("sharedAt");
  });

  it("should REJECT invalid transition: draft -> completed", async function () {
    const res = await request(app)
      .patch(`/api/testimonials/${testimonialId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "completed" })
      .expect(400);

    expect(res.body).to.have.property("status", "failure");
    expect(res.body.message).to.include("Cannot transition from draft to completed");
  });

  it("should REJECT invalid transition: recording -> shared", async function () {
    await request(app)
      .patch(`/api/testimonials/${testimonialId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "recording" });

    const res = await request(app)
      .patch(`/api/testimonials/${testimonialId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "shared" })
      .expect(400);

    expect(res.body).to.have.property("status", "failure");
    expect(res.body.message).to.include("Cannot transition from recording to shared");
  });

  it("should REJECT invalid transition: shared -> draft (backwards)", async function () {
    await request(app).patch(`/api/testimonials/${testimonialId}/status`).set("Authorization", `Bearer ${token}`).send({ status: "recording" });
    await request(app).patch(`/api/testimonials/${testimonialId}/status`).set("Authorization", `Bearer ${token}`).send({ status: "processing" });
    await request(app).patch(`/api/testimonials/${testimonialId}/status`).set("Authorization", `Bearer ${token}`).send({ status: "completed" });
    await request(app).patch(`/api/testimonials/${testimonialId}/status`).set("Authorization", `Bearer ${token}`).send({ status: "shared" });

    const res = await request(app)
      .patch(`/api/testimonials/${testimonialId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "draft" })
      .expect(400);

    expect(res.body).to.have.property("status", "failure");
    expect(res.body.message).to.include("Cannot transition from shared to draft");
  });
});