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

const sendSuccess = (res, { code = 200, message = "Success", data = null, pagination }) => {
  const payload = { code, status: "success", message, data };
  if (pagination) payload.pagination = pagination;
  return res.status(code).json(payload);
};

const sendError = (res, { code = 500, message = "Internal server error" }) => {
  return res.status(code).json({ code, status: "failure", message });
};

module.exports = {
  ROLES,
  TESTIMONIAL_STATUSES,
  SHARE_CHANNELS,
  STATUS_TRANSITIONS,
  sendSuccess,
  sendError
};
