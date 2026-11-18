const { v4: uuidv4 } = require("uuid");
const Testimonial = require("../models/testimonial");
const { sendSuccess, sendError, STATUS_TRANSITIONS } = require("../lib/constants");
const {
  createTestimonialSchema,
  updateTestimonialSchema,
  statusUpdateSchema,
  shareSchema,
  listQuerySchema,
  parseOrError
} = require("../validators/testimonial");

const getOwnedTestimonial = async (testimonialId, userId) => {
  const testimonial = await Testimonial.findOne({ testimonialId });
  if (!testimonial) {
    return { error: { code: 404, message: "Testimonial not found" } };
  }
  if (testimonial.userId !== userId) {
    return { error: { code: 403, message: "Access forbidden" } };
  }
  return { testimonial };
};

const createTestimonial = async (req, res) => {
  try {
    const parsed = parseOrError(createTestimonialSchema, req.body || {});
    if (parsed.error) {
      return sendError(res, { code: 400, message: parsed.error });
    }

    const testimonial = await Testimonial.create({
      testimonialId: uuidv4(),
      userId: req.user.userId,
      status: "draft",
      ...parsed.data
    });

    return sendSuccess(res, {
      code: 201,
      message: "Testimonial created successfully",
      data: testimonial
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const details = Object.values(error.errors || {})
        .map((e) => e.message)
        .join(", ");
      return sendError(res, { code: 400, message: details || "Validation error" });
    }
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to create testimonial" });
  }
};

const listTestimonials = async (req, res) => {
  try {
    const parsed = parseOrError(listQuerySchema, req.query || {});
    if (parsed.error) {
      return sendError(res, { code: 400, message: parsed.error });
    }

    const { status, sort } = parsed.data;
    const page = parsed.data.page || 1;
    const limit = parsed.data.limit || 10;

    const filter = { userId: req.user.userId, isDeleted: false };
    if (status) {
      filter.status = status;
    }

    const sortField = sort || "createdAt";
    const sortOption = { [sortField]: -1 };

    const total = await Testimonial.countDocuments(filter);
    const testimonials = await Testimonial.find(filter)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);

    const pages = total === 0 ? 0 : Math.ceil(total / limit);

    return sendSuccess(res, {
      code: 200,
      message: "Data retrieved successfully",
      data: testimonials,
      pagination: { total, page, limit, pages }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to retrieve testimonials" });
  }
};

const getTestimonial = async (req, res) => {
  try {
    const { testimonialId } = req.params;
    const { testimonial, error } = await getOwnedTestimonial(testimonialId, req.user.userId);
    if (error) {
      return sendError(res, error);
    }
    if (testimonial.isDeleted) {
      return sendError(res, { code: 404, message: "Testimonial not found" });
    }

    return sendSuccess(res, {
      code: 200,
      message: "Data retrieved successfully",
      data: testimonial
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to retrieve testimonial" });
  }
};

const updateTestimonial = async (req, res) => {
  try {
    const parsed = parseOrError(updateTestimonialSchema, req.body || {});
    if (parsed.error) {
      return sendError(res, { code: 400, message: parsed.error });
    }

    const { testimonialId } = req.params;
    const { testimonial, error } = await getOwnedTestimonial(testimonialId, req.user.userId);
    if (error) {
      return sendError(res, error);
    }
    if (testimonial.isDeleted) {
      return sendError(res, { code: 404, message: "Testimonial not found" });
    }

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
      return sendError(res, { code: 400, message: "No valid fields provided for update" });
    }

    Object.assign(testimonial, updates);
    await testimonial.save();

    return sendSuccess(res, {
      code: 200,
      message: "Testimonial updated successfully",
      data: testimonial
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const details = Object.values(error.errors || {})
        .map((e) => e.message)
        .join(", ");
      return sendError(res, { code: 400, message: details || "Validation error" });
    }
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to update testimonial" });
  }
};

const updateStatus = async (req, res) => {
  try {
    const parsed = parseOrError(statusUpdateSchema, req.body || {});
    if (parsed.error) {
      return sendError(res, { code: 400, message: parsed.error });
    }

    const { testimonialId } = req.params;
    const { testimonial, error } = await getOwnedTestimonial(testimonialId, req.user.userId);
    if (error) {
      return sendError(res, error);
    }
    if (testimonial.isDeleted) {
      return sendError(res, { code: 404, message: "Testimonial not found" });
    }

    const nextStatus = parsed.data.status;
    const currentStatus = testimonial.status;
    const allowed = STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(nextStatus)) {
      return sendError(res, {
        code: 400,
        message: `Cannot transition from ${currentStatus} to ${nextStatus}`
      });
    }

    testimonial.status = nextStatus;
    if (nextStatus === "shared") {
      testimonial.sharedAt = new Date();
    }

    await testimonial.save();

    return sendSuccess(res, {
      code: 200,
      message: "Testimonial status updated successfully",
      data: testimonial
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const details = Object.values(error.errors || {})
        .map((e) => e.message)
        .join(", ");
      return sendError(res, { code: 400, message: details || "Validation error" });
    }
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to update testimonial status" });
  }
};

const deleteTestimonial = async (req, res) => {
  try {
    const { testimonialId } = req.params;
    const { testimonial, error } = await getOwnedTestimonial(testimonialId, req.user.userId);
    if (error) {
      return sendError(res, error);
    }

    if (!testimonial.isDeleted) {
      testimonial.isDeleted = true;
      testimonial.deletedAt = new Date();
      await testimonial.save();
    }

    return sendSuccess(res, {
      code: 200,
      message: "Testimonial deleted successfully",
      data: testimonial
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to delete testimonial" });
  }
};

const shareTestimonial = async (req, res) => {
  try {
    const parsed = parseOrError(shareSchema, req.body || {});
    if (parsed.error) {
      return sendError(res, { code: 400, message: parsed.error });
    }

    const { testimonialId } = req.params;
    const { testimonial, error } = await getOwnedTestimonial(testimonialId, req.user.userId);
    if (error) {
      return sendError(res, error);
    }
    if (testimonial.isDeleted) {
      return sendError(res, { code: 404, message: "Testimonial not found" });
    }

    if (testimonial.status !== "completed" && testimonial.status !== "shared") {
      return sendError(res, {
        code: 400,
        message: `Cannot share testimonial with status ${testimonial.status}`
      });
    }

    const { channels } = parsed.data;
    const existing = Array.isArray(testimonial.sharedChannels) ? testimonial.sharedChannels : [];
    testimonial.sharedChannels = Array.from(new Set([...existing, ...channels]));

    if (testimonial.status === "completed") {
      testimonial.status = "shared";
    }
    if (!testimonial.sharedAt) {
      testimonial.sharedAt = new Date();
    }

    await testimonial.save();

    return sendSuccess(res, {
      code: 200,
      message: "Testimonial shared successfully",
      data: testimonial
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const details = Object.values(error.errors || {})
        .map((e) => e.message)
        .join(", ");
      return sendError(res, { code: 400, message: details || "Validation error" });
    }
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to share testimonial" });
  }
};

module.exports = {
  createTestimonial,
  listTestimonials,
  getTestimonial,
  updateTestimonial,
  updateStatus,
  deleteTestimonial,
  shareTestimonial
};
