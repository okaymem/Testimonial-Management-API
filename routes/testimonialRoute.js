const express = require("express");
const auth = require("../middleware/auth");
const {
  createTestimonial,
  listTestimonials,
  searchTestimonials,
  getTestimonial,
  updateTestimonial,
  updateStatus,
  bulkUpdateStatus,
  deleteTestimonial,
  shareTestimonial,
  getSettings,
  upsertSettings,
  getAnalytics
} = require("../controllers/testimonialController");

const router = express.Router();

router.use(auth);

router.post("/", createTestimonial);
router.get("/", listTestimonials);
router.get("/search", searchTestimonials);

router.get("/settings", getSettings);
router.post("/settings", upsertSettings);
router.get("/analytics", getAnalytics);

router.patch("/:testimonialId/status", updateStatus);
router.post("/bulk/status", bulkUpdateStatus);
router.post("/:testimonialId/share", shareTestimonial);

router.get("/:testimonialId", getTestimonial);
router.put("/:testimonialId", updateTestimonial);
router.delete("/:testimonialId", deleteTestimonial);

module.exports = router;
