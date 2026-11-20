const { v4: uuidv4 } = require("uuid");
const Testimonial = require("../models/testimonial");
const TestimonialSettings = require("../models/testimonialSettings");
const { sendSuccess, sendError, STATUS_TRANSITIONS, TESTIMONIAL_STATUSES } = require("../lib/constants");
const {
  createTestimonialSchema,
  updateTestimonialSchema,
  statusUpdateSchema,
  shareSchema,
  listQuerySchema,
  searchQuerySchema,
  bulkStatusSchema,
  exportQuerySchema,
  settingsSchema,
  analyticsQuerySchema,
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

const searchTestimonials = async (req, res) => {
  try {
    const parsed = parseOrError(searchQuerySchema, req.query || {});
    if (parsed.error) {
      return sendError(res, { code: 400, message: parsed.error });
    }

    const { q, createdAfter, createdBefore, minRating, maxRating, sort } = parsed.data;
    const page = parsed.data.page || 1;
    const limit = parsed.data.limit || 10;

    const filter = { userId: req.user.userId, isDeleted: false };

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { customerName: regex },
        { text: regex }
      ];
    }

    if (createdAfter || createdBefore) {
      filter.createdAt = {};
      if (createdAfter) filter.createdAt.$gte = new Date(createdAfter);
      if (createdBefore) filter.createdAt.$lte = new Date(createdBefore);
    }

    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating.$gte = minRating;
      if (maxRating) filter.rating.$lte = maxRating;
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
    return sendError(res, { code: 500, message: "Failed to search testimonials" });
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

const bulkUpdateStatus = async (req, res) => {
  try {
    const parsed = parseOrError(bulkStatusSchema, req.body || {});
    if (parsed.error) {
      return sendError(res, { code: 400, message: parsed.error });
    }

    const { testimonialIds, status: nextStatus } = parsed.data;
    const userId = req.user.userId;

    const testimonials = await Testimonial.find({
      testimonialId: { $in: testimonialIds },
      userId,
      isDeleted: false
    });

    const foundIds = new Set(testimonials.map((t) => t.testimonialId));
    const notFound = testimonialIds.filter((id) => !foundIds.has(id));

    const updated = [];
    const failed = [];
    const errors = [];

    for (const testimonial of testimonials) {
      const currentStatus = testimonial.status;
      const allowed = STATUS_TRANSITIONS[currentStatus] || [];

      if (!allowed.includes(nextStatus)) {
        failed.push(testimonial.testimonialId);
        errors.push({
          testimonialId: testimonial.testimonialId,
          message: `Cannot transition from ${currentStatus} to ${nextStatus}`
        });
        continue;
      }

      testimonial.status = nextStatus;
      if (nextStatus === "shared") {
        testimonial.sharedAt = new Date();
      }

      await testimonial.save();
      updated.push(testimonial.testimonialId);
    }

    for (const id of notFound) {
      failed.push(id);
      errors.push({
        testimonialId: id,
        message: "Testimonial not found or access forbidden"
      });
    }

    return sendSuccess(res, {
      code: 200,
      message: "Bulk status update completed",
      data: {
        updated,
        failed,
        errors
      }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to bulk update status" });
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

const getSettings = async (req, res) => {
  try {
    const settings = await TestimonialSettings.findOne({ userId: req.user.userId });
    return sendSuccess(res, {
      code: 200,
      message: "Data retrieved successfully",
      data: settings || null
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to retrieve settings" });
  }
};

const upsertSettings = async (req, res) => {
  try {
    const parsed = parseOrError(settingsSchema, req.body || {});
    if (parsed.error) {
      return sendError(res, { code: 400, message: parsed.error });
    }

    const updates = { ...parsed.data };
    if (Object.keys(updates).length === 0) {
      return sendError(res, { code: 400, message: "No valid fields provided for update" });
    }

    if (updates.contactConsent && typeof updates.contactConsent === "object") {
      const set = { userId: req.user.userId };
      for (const [key, value] of Object.entries(updates)) {
        if (key === "contactConsent") continue;
        set[key] = value;
      }
      if (Object.prototype.hasOwnProperty.call(updates.contactConsent, "enabled")) {
        set["contactConsent.enabled"] = updates.contactConsent.enabled;
      }
      if (Object.prototype.hasOwnProperty.call(updates.contactConsent, "text")) {
        set["contactConsent.text"] = updates.contactConsent.text;
      }
      const settings = await TestimonialSettings.findOneAndUpdate(
        { userId: req.user.userId },
        { $set: set },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
      return sendSuccess(res, {
        code: 200,
        message: "Settings saved successfully",
        data: settings
      });
    }

    const settings = await TestimonialSettings.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { userId: req.user.userId, ...updates } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(res, {
      code: 200,
      message: "Settings saved successfully",
      data: settings
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const details = Object.values(error.errors || {})
        .map((e) => e.message)
        .join(", ");
      return sendError(res, { code: 400, message: details || "Validation error" });
    }
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to save settings" });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const parsed = parseOrError(analyticsQuerySchema, req.query || {});
    if (parsed.error) {
      return sendError(res, { code: 400, message: parsed.error });
    }

    const { startDate, endDate } = parsed.data || {};
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return sendError(res, { code: 400, message: "startDate must be before or equal to endDate" });
    }

    const match = { userId: req.user.userId, isDeleted: false };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const [result] = await Testimonial.aggregate([
      { $match: match },
      {
        $facet: {
          total: [{ $count: "count" }],
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          rating: [
            { $match: { rating: { $ne: null } } },
            { $group: { _id: null, avg: { $avg: "$rating" } } }
          ]
        }
      }
    ]);

    const total = result && result.total[0] ? result.total[0].count : 0;
    const byStatus = {};
    for (const status of TESTIMONIAL_STATUSES) {
      byStatus[status] = 0;
    }
    if (result && Array.isArray(result.byStatus)) {
      for (const item of result.byStatus) {
        if (item && item._id) {
          byStatus[item._id] = item.count;
        }
      }
    }

    let averageRating = null;
    if (result && result.rating[0] && result.rating[0].avg != null) {
      averageRating = Math.round(result.rating[0].avg * 100) / 100;
    }

    return sendSuccess(res, {
      code: 200,
      message: "Data retrieved successfully",
      data: {
        overview: { total, byStatus, averageRating },
        period: {
          startDate: startDate ? new Date(startDate).toISOString() : null,
          endDate: endDate ? new Date(endDate).toISOString() : null
        }
      }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, { code: 500, message: "Failed to retrieve analytics" });
  }
};

const exportTestimonials = async (req, res) => {
  try {
    const parsed = parseOrError(exportQuerySchema, req.query || {});
    if (parsed.error) {
      return sendError(res, { code: 400, message: parsed.error });
    }

    const { q, createdAfter, createdBefore, minRating, maxRating, status, fields } = parsed.data;

    const filter = { userId: req.user.userId, isDeleted: false };

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { customerName: regex },
        { text: regex }
      ];
    }

    if (createdAfter || createdBefore) {
      filter.createdAt = {};
      if (createdAfter) filter.createdAt.$gte = new Date(createdAfter);
      if (createdBefore) filter.createdAt.$lte = new Date(createdBefore);
    }

    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating.$gte = minRating;
      if (maxRating) filter.rating.$lte = maxRating;
    }

    if (status) filter.status = status;

    const allColumns = [
      "testimonialId", "customerName", "customerEmail", "customerPhone",
      "rating", "text", "status", "consentGiven", "sharedChannels",
      "createdAt", "updatedAt"
    ];
    const columns = fields
      ? fields.split(",").map((f) => f.trim()).filter((f) => allColumns.includes(f))
      : allColumns;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="testimonials-${new Date().toISOString().split("T")[0]}.csv"`);

    const { stringify } = require("csv-stringify");
    const stringifier = stringify({ header: true, columns });
    stringifier.pipe(res);

    const cursor = Testimonial.find(filter).sort({ createdAt: -1 }).cursor();

    for await (const doc of cursor) {
      const row = {
        testimonialId: doc.testimonialId,
        customerName: doc.customerName,
        customerEmail: doc.customerEmail || "",
        customerPhone: doc.customerPhone || "",
        rating: doc.rating != null ? String(doc.rating) : "",
        text: doc.text || "",
        status: doc.status,
        consentGiven: doc.consentGiven === true ? "true" : "false",
        sharedChannels: (doc.sharedChannels || []).join(";"),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString()
      };
      const filteredRow = {};
      columns.forEach((c) => { filteredRow[c] = row[c]; });
      stringifier.write(filteredRow);
    }

    stringifier.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      return sendError(res, { code: 500, message: "Failed to export testimonials" });
    }
  }
};

module.exports = {
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
  getAnalytics,
  exportTestimonials
};
