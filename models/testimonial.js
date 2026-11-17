const mongoose = require("mongoose");
const { TESTIMONIAL_STATUSES, SHARE_CHANNELS } = require("../lib/constants");

const testimonialSchema = new mongoose.Schema(
  {
    testimonialId: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: Number,
      required: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    customerEmail: {
      type: String,
      trim: true
    },
    customerPhone: {
      type: String,
      trim: true
    },
    videoUrl: {
      type: String,
      trim: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    text: {
      type: String
    },
    status: {
      type: String,
      enum: TESTIMONIAL_STATUSES,
      default: "draft",
      required: true
    },
    consentGiven: {
      type: Boolean,
      default: false
    },
    sharedAt: {
      type: Date
    },
    sharedChannels: {
      type: [
        {
          type: String,
          enum: SHARE_CHANNELS
        }
      ],
      default: []
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

testimonialSchema.index({ testimonialId: 1 }, { unique: true });
testimonialSchema.index({ userId: 1 });
testimonialSchema.index({ status: 1 });
testimonialSchema.index({ userId: 1, isDeleted: 1 });

module.exports = mongoose.model("Testimonial", testimonialSchema);
