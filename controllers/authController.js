const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { sendSuccess, sendError } = require("../lib/constants");

const emailRegex = /^\S+@\S+\.\S+$/;

const signToken = (user) => {
  return jwt.sign(
    { userId: user.userId, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || "7d" }
  );
};

const sanitizeUser = (user) => {
  const { password, _id, __v, ...safe } = user.toObject();
  return safe;
};

const register = async (req, res) => {
  try {
    const { email, password, businessName } = req.body || {};

    if (!email || !password || !businessName) {
      return sendError(res, {
        code: 400,
        message: "email, password and businessName are required"
      });
    }

    if (typeof email !== "string" || !emailRegex.test(email.trim())) {
      return sendError(res, { code: 400, message: "Invalid email format" });
    }

    if (typeof password !== "string" || password.length === 0) {
      return sendError(res, { code: 400, message: "Password must be a non-empty string" });
    }

    if (typeof businessName !== "string" || businessName.trim().length === 0) {
      return sendError(res, {
        code: 400,
        message: "businessName must be a non-empty string"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return sendError(res, { code: 400, message: "Email is already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const lastUser = await User.findOne().sort({ userId: -1 }).select("userId");
    const nextUserId = lastUser ? lastUser.userId + 1 : 1;

    const user = await User.create({
      userId: nextUserId,
      email: normalizedEmail,
      password: hashedPassword,
      businessName: businessName.trim()
    });

    const token = signToken(user);

    return sendSuccess(res, {
      code: 201,
      message: "User registered successfully",
      data: { user: sanitizeUser(user), token }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = error.keyValue ? Object.keys(error.keyValue).join(", ") : "field";
      return sendError(res, { code: 400, message: `Duplicate value for ${field}` });
    }
    if (error.name === "ValidationError") {
      const details = Object.values(error.errors || {})
        .map((e) => e.message)
        .join(", ");
      return sendError(res, { code: 400, message: details || "Validation error" });
    }
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to register user" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return sendError(res, { code: 400, message: "email and password are required" });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return sendError(res, {
        code: 400,
        message: "email and password must be strings"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return sendError(res, { code: 401, message: "Invalid email or password" });
    }

    if (user.isActive === false) {
      return sendError(res, { code: 403, message: "Account is deactivated" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, { code: 401, message: "Invalid email or password" });
    }

    const token = signToken(user);

    return sendSuccess(res, {
      code: 200,
      message: "Login successful",
      data: { token }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to login" });
  }
};

module.exports = {
  register,
  login
};
