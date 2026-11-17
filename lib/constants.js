const ROLES = ["owner", "staff"];

const TESTIMONIAL_STATUSES = [
  "draft",
  "recording",
  "processing",
  "completed",
  "shared"
];

const SHARE_CHANNELS = ["email", "sms", "facebook", "instagram"];

const STATUS_TRANSITIONS = {
  draft: ["recording"],
  recording: ["processing"],
  processing: ["completed"],
  completed: ["shared"],
  shared: []
};

module.exports = {
  ROLES,
  TESTIMONIAL_STATUSES,
  SHARE_CHANNELS,
  STATUS_TRANSITIONS
};
