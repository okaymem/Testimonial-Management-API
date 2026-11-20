const request = require("supertest");
const app = require("./setup");
const expect = require("chai").expect;

describe("Bonus Endpoints", function () {
  let token;

  before(async function () {
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: `bonus${Date.now()}@test.com`, password: "pass123", businessName: "Bonus Test" });
    token = registerRes.body.data.token;
  });

  beforeEach(async function () {
    const mongoose = require("mongoose");
    await mongoose.connection.collections.testimonials.deleteMany({});

    await request(app).post("/api/testimonials").set("Authorization", `Bearer ${token}`).send({ customerName: "Alice", rating: 5, text: "Amazing!" });
    await request(app).post("/api/testimonials").set("Authorization", `Bearer ${token}`).send({ customerName: "Bob", rating: 4, text: "Good" });
    await request(app).post("/api/testimonials").set("Authorization", `Bearer ${token}`).send({ customerName: "Charlie", rating: 3, text: "OK" });
  });

  describe("Search", function () {
    it("GET /api/testimonials/search?q=alice - should find by name", async function () {
      const res = await request(app)
        .get("/api/testimonials/search?q=alice")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).to.be.an("array").with.lengthOf(1);
      expect(res.body.data[0]).to.have.property("customerName", "Alice");
    });

    it("GET /api/testimonials/search?minRating=4 - should filter by rating", async function () {
      const res = await request(app)
        .get("/api/testimonials/search?minRating=4")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).to.have.lengthOf(2);
      res.body.data.forEach(t => expect(t.rating).to.be.gte(4));
    });

    it("should validate minRating > maxRating", async function () {
      const res = await request(app)
        .get("/api/testimonials/search?minRating=5&maxRating=3")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);

      expect(res.body).to.have.property("status", "failure");
    });
  });

  describe("Bulk Status", function () {
    let ids;

    beforeEach(async function () {
      const res1 = await request(app).post("/api/testimonials").set("Authorization", `Bearer ${token}`).send({ customerName: "T1" });
      const res2 = await request(app).post("/api/testimonials").set("Authorization", `Bearer ${token}`).send({ customerName: "T2" });
      const res3 = await request(app).post("/api/testimonials").set("Authorization", `Bearer ${token}`).send({ customerName: "T3" });
      ids = [res1.body.data.testimonialId, res2.body.data.testimonialId, res3.body.data.testimonialId];
    });

    it("POST /api/testimonials/bulk/status - should update valid transitions", async function () {
      const res = await request(app)
        .post("/api/testimonials/bulk/status")
        .set("Authorization", `Bearer ${token}`)
        .send({ testimonialIds: ids.slice(0, 2), status: "recording" })
        .expect(200);

      expect(res.body.data.updated).to.have.lengthOf(2);
      expect(res.body.data.failed).to.have.lengthOf(0);
    });

    it("should report failed for invalid transitions", async function () {
      await request(app).patch(`/api/testimonials/${ids[0]}/status`).set("Authorization", `Bearer ${token}`).send({ status: "recording" });

      const res = await request(app)
        .post("/api/testimonials/bulk/status")
        .set("Authorization", `Bearer ${token}`)
        .send({ testimonialIds: [ids[0], ids[1]], status: "completed" })
        .expect(200);

      expect(res.body.data.updated).to.have.lengthOf(0);
      expect(res.body.data.failed).to.have.lengthOf(2);
      const messages = res.body.data.errors.map(e => e.message);
      expect(messages.some(m => m.includes("Cannot transition"))).to.be.true;
    });

    it("should report failed for non-existent IDs", async function () {
      const res = await request(app)
        .post("/api/testimonials/bulk/status")
        .set("Authorization", `Bearer ${token}`)
        .send({ testimonialIds: ["fake-id", ids[0]], status: "recording" })
        .expect(200);

      expect(res.body.data.failed).to.include("fake-id");
      expect(res.body.data.errors[0].message).to.include("not found");
    });
  });

  describe("Export CSV", function () {
    it("GET /api/testimonials/export - should return CSV", async function () {
      const res = await request(app)
        .get("/api/testimonials/export")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.headers["content-type"]).to.include("text/csv");
      expect(res.headers["content-disposition"]).to.include("attachment");
      expect(res.text).to.include("testimonialId,customerName,customerEmail");
      expect(res.text.split("\n")).to.have.length.gte(4);
    });

    it("should support fields parameter", async function () {
      const res = await request(app)
        .get("/api/testimonials/export?fields=testimonialId,customerName,rating")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const lines = res.text.trim().split("\n");
      expect(lines[0]).to.equal("testimonialId,customerName,rating");
    });

    it("should filter by status", async function () {
      const listRes = await request(app).get("/api/testimonials").set("Authorization", `Bearer ${token}`);
      await request(app).patch(`/api/testimonials/${listRes.body.data[0].testimonialId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "recording" });

      const res = await request(app)
        .get("/api/testimonials/export?status=recording")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const lines = res.text.trim().split("\n");
      expect(lines).to.have.lengthOf(2);
    });
  });
});