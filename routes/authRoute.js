const express = require("express");
const rateLimit = require("express-rate-limit");
const { register, login } = require("../controllers/authController");

const router = express.Router();

if (process.env.NODE_ENV !== "test") {
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { code: 429, status: "failure", message: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false
  });
  router.use(authLimiter);
}

router.post("/register", register);
router.post("/login", login);

module.exports = router;