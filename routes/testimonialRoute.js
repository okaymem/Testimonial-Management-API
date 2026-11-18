const express = require("express");
const auth = require("../middleware/auth");
const {
  createTestimonial,
  listTestimonials,
  getTestimonial,
  updateTestimonial,
  updateStatus,
  deleteTestimonial,
  shareTestimonial,
  getSettings,
  upsertSettings
} = require("../controllers/testimonialController");

const router = express.Router();

router.use(auth);

router.post("/", createTestimonial);
router.get("/", listTestimonials);

router.get("/settings", getSettings);
router.post("/settings", upsertSettings);

router.patch("/:testimonialId/status", updateStatus);
router.post("/:testimonialId/share", shareTestimonial);

router.get("/:testimonialId", getTestimonial);
router.put("/:testimonialId", updateTestimonial);
router.delete("/:testimonialId", deleteTestimonial);

module.exports = router;
