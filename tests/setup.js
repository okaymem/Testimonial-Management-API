const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const { app } = require("../app");

let mongod;

before(async function () {
  this.timeout(10000);
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log("Test MongoDB connected");
});

after(async function () {
  this.timeout(5000);
  await mongoose.disconnect();
  await mongod.stop();
  console.log("Test MongoDB disconnected");
});

beforeEach(async function () {
  const collections = mongoose.connection.collections;
  // Only clear testimonials and settings, keep users for auth
  await collections.testimonials?.deleteMany({});
  await collections.testimonialsettings?.deleteMany({});
});

module.exports = app;