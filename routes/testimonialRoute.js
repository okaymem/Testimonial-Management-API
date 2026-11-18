const express = require("express");
const auth = require("../middleware/auth");
const { sendError } = require("../lib/constants");

const router = express.Router();

router.use(auth);

const notImplemented = (req, res) => {
  return sendError(res, { code: 501, message: "Not implemented" });
};

router.post("/", notImplemented);
router.get("/", notImplemented);

router.get("/settings", notImplemented);
router.post("/settings", notImplemented);
router.get("/analytics", notImplemented);

router.patch("/:testimonialId/status", notImplemented);
router.post("/:testimonialId/share", notImplemented);

router.get("/:testimonialId", notImplemented);
router.put("/:testimonialId", notImplemented);
router.delete("/:testimonialId", notImplemented);

module.exports = router;
