const mongoose = require("mongoose");
const { ROLES } = require("../lib/constants");

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      unique: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"]
    },
    password: {
      type: String,
      required: true
    },
    businessName: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: ROLES,
      default: "owner"
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
