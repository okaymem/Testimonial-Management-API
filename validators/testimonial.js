const { z } = require("zod");
const { TESTIMONIAL_STATUSES, SHARE_CHANNELS } = require("../lib/constants");

const formatZodError = (error) => {
  const issues = error && (error.issues || error.errors);
  if (!issues || !issues.length) return "Validation error";
  return issues
    .map((e) => {
      const path = e.path && e.path.length ? `${e.path.join(".")}: ` : "";
      return `${path}${e.message}`;
    })
    .join(", ");
};

const parseOrError = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { error: formatZodError(result.error) };
  }
  return { data: result.data };
};

const nonEmptyString = (field) =>
  z
    .string({ required_error: `${field} is required`, invalid_type_error: `${field} must be a string` })
    .trim()
    .min(1, `${field} is required`);

const optionalEmail = z
  .string({ invalid_type_error: "customerEmail must be a string" })
  .trim()
  .email("Invalid customerEmail format")
  .optional();

const ratingSchema = z
  .number({ invalid_type_error: "rating must be a number" })
  .int("rating must be an integer")
  .min(1, "rating must be between 1 and 5")
  .max(5, "rating must be between 1 and 5");

const createTestimonialSchema = z
  .object({
    customerName: nonEmptyString("customerName"),
    customerEmail: optionalEmail,
    customerPhone: z.string({ invalid_type_error: "customerPhone must be a string" }).trim().optional(),
    videoUrl: z.string({ invalid_type_error: "videoUrl must be a string" }).trim().optional(),
    rating: ratingSchema.optional(),
    text: z.string({ invalid_type_error: "text must be a string" }).optional(),
    consentGiven: z.boolean({ invalid_type_error: "consentGiven must be a boolean" }).optional()
  })
  .strip();

const updateTestimonialSchema = z
  .object({
    customerName: nonEmptyString("customerName").optional(),
    customerEmail: optionalEmail,
    customerPhone: z.string({ invalid_type_error: "customerPhone must be a string" }).trim().optional(),
    videoUrl: z.string({ invalid_type_error: "videoUrl must be a string" }).trim().optional(),
    rating: ratingSchema.optional(),
    text: z.string({ invalid_type_error: "text must be a string" }).optional(),
    consentGiven: z.boolean({ invalid_type_error: "consentGiven must be a boolean" }).optional()
  })
  .strip();

const statusUpdateSchema = z
  .object({
    status: z.enum(TESTIMONIAL_STATUSES, {
      required_error: "status is required",
      invalid_type_error: "status must be a string",
      invalid_enum_value: `status must be one of: ${TESTIMONIAL_STATUSES.join(", ")}`
    })
  })
  .strip();

const shareSchema = z
  .object({
    channels: z
      .array(
        z.enum(SHARE_CHANNELS, {
          invalid_type_error: "channel must be a string",
          invalid_enum_value: `channel must be one of: ${SHARE_CHANNELS.join(", ")}`
        }),
        { required_error: "channels is required", invalid_type_error: "channels must be an array" }
      )
      .min(1, "channels must contain at least one channel")
  })
  .strip();

const listQuerySchema = z
  .object({
    status: z
      .enum(TESTIMONIAL_STATUSES, {
        invalid_enum_value: `status must be one of: ${TESTIMONIAL_STATUSES.join(", ")}`
      })
      .optional(),
    page: z.coerce
      .number({ invalid_type_error: "page must be a number" })
      .int("page must be an integer")
      .min(1, "page must be at least 1")
      .optional(),
    limit: z.coerce
      .number({ invalid_type_error: "limit must be a number" })
      .int("limit must be an integer")
      .min(1, "limit must be at least 1")
      .optional(),
    sort: z.string({ invalid_type_error: "sort must be a string" }).trim().optional()
  })
  .strip();

const searchQuerySchema = z
  .object({
    q: z.string({ invalid_type_error: "q must be a string" }).trim().optional(),
    createdAfter: z
      .string({ invalid_type_error: "createdAfter must be a string" })
      .datetime({ message: "createdAfter must be a valid ISO date string" })
      .optional(),
    createdBefore: z
      .string({ invalid_type_error: "createdBefore must be a string" })
      .datetime({ message: "createdBefore must be a valid ISO date string" })
      .optional(),
    minRating: z.coerce
      .number({ invalid_type_error: "minRating must be a number" })
      .int("minRating must be an integer")
      .min(1, "minRating must be between 1 and 5")
      .max(5, "minRating must be between 1 and 5")
      .optional(),
    maxRating: z.coerce
      .number({ invalid_type_error: "maxRating must be a number" })
      .int("maxRating must be an integer")
      .min(1, "maxRating must be between 1 and 5")
      .max(5, "maxRating must be between 1 and 5")
      .optional(),
    page: z.coerce
      .number({ invalid_type_error: "page must be a number" })
      .int("page must be an integer")
      .min(1, "page must be at least 1")
      .optional(),
    limit: z.coerce
      .number({ invalid_type_error: "limit must be a number" })
      .int("limit must be an integer")
      .min(1, "limit must be at least 1")
      .optional(),
    sort: z.string({ invalid_type_error: "sort must be a string" }).trim().optional()
  })
  .strip()
  .refine(
    (data) => {
      if (data.createdAfter && data.createdBefore) {
        return new Date(data.createdAfter) <= new Date(data.createdBefore);
      }
      return true;
    },
    { message: "createdAfter must be before or equal to createdBefore", path: ["createdAfter"] }
  )
  .refine(
    (data) => {
      if (data.minRating && data.maxRating) {
        return data.minRating <= data.maxRating;
      }
      return true;
    },
    { message: "minRating must be less than or equal to maxRating", path: ["minRating"] }
  );

const bulkStatusSchema = z
  .object({
    testimonialIds: z
      .array(z.string({ invalid_type_error: "testimonialIds must be strings" }), {
        required_error: "testimonialIds is required",
        invalid_type_error: "testimonialIds must be an array"
      })
      .min(1, "testimonialIds must contain at least one id"),
    status: z.enum(TESTIMONIAL_STATUSES, {
      required_error: "status is required",
      invalid_type_error: "status must be a string",
      invalid_enum_value: `status must be one of: ${TESTIMONIAL_STATUSES.join(", ")}`
    })
  })
  .strip();

const contactConsentSchema = z
  .object({
    enabled: z.boolean({ invalid_type_error: "contactConsent.enabled must be a boolean" }).optional(),
    text: z.string({ invalid_type_error: "contactConsent.text must be a string" }).optional()
  })
  .strip();

const settingsSchema = z
  .object({
    isEnabled: z.boolean({ invalid_type_error: "isEnabled must be a boolean" }).optional(),
    defaultVideoLength: z
      .number({ invalid_type_error: "defaultVideoLength must be a number" })
      .int("defaultVideoLength must be an integer")
      .positive("defaultVideoLength must be positive")
      .optional(),
    videoLengthOptions: z
      .array(
        z
          .number({ invalid_type_error: "videoLengthOptions must contain numbers" })
          .int("videoLengthOptions values must be integers")
          .positive("videoLengthOptions values must be positive"),
        { invalid_type_error: "videoLengthOptions must be an array" }
      )
      .optional(),
    questionnaire: z
      .array(z.string({ invalid_type_error: "questionnaire must contain strings" }), {
        invalid_type_error: "questionnaire must be an array"
      })
      .optional(),
    sendingOptions: z
      .array(z.string({ invalid_type_error: "sendingOptions must contain strings" }), {
        invalid_type_error: "sendingOptions must be an array"
      })
      .optional(),
    thankYouMessage: z
      .string({ invalid_type_error: "thankYouMessage must be a string" })
      .optional(),
    contactConsent: contactConsentSchema.optional()
  })
  .strip();

const analyticsQuerySchema = z
  .object({
    startDate: z
      .string({ invalid_type_error: "startDate must be a string" })
      .datetime({ message: "startDate must be a valid ISO date string" })
      .optional(),
    endDate: z
      .string({ invalid_type_error: "endDate must be a string" })
      .datetime({ message: "endDate must be a valid ISO date string" })
      .optional()
  })
  .strip();

const exportQuerySchema = z
  .object({
    q: z.string({ invalid_type_error: "q must be a string" }).trim().optional(),
    createdAfter: z
      .string({ invalid_type_error: "createdAfter must be a string" })
      .datetime({ message: "createdAfter must be a valid ISO date string" })
      .optional(),
    createdBefore: z
      .string({ invalid_type_error: "createdBefore must be a string" })
      .datetime({ message: "createdBefore must be a valid ISO date string" })
      .optional(),
    minRating: z.coerce
      .number({ invalid_type_error: "minRating must be a number" })
      .int("minRating must be an integer")
      .min(1, "minRating must be between 1 and 5")
      .max(5, "minRating must be between 1 and 5")
      .optional(),
    maxRating: z.coerce
      .number({ invalid_type_error: "maxRating must be a number" })
      .int("maxRating must be an integer")
      .min(1, "maxRating must be between 1 and 5")
      .max(5, "maxRating must be between 1 and 5")
      .optional(),
    status: z
      .enum(TESTIMONIAL_STATUSES, {
        invalid_enum_value: `status must be one of: ${TESTIMONIAL_STATUSES.join(", ")}`
      })
      .optional(),
    fields: z.string({ invalid_type_error: "fields must be a string" }).trim().optional()
  })
  .strip()
  .refine(
    (data) => {
      if (data.createdAfter && data.createdBefore) {
        return new Date(data.createdAfter) <= new Date(data.createdBefore);
      }
      return true;
    },
    { message: "createdAfter must be before or equal to createdBefore", path: ["createdAfter"] }
  )
  .refine(
    (data) => {
      if (data.minRating && data.maxRating) {
        return data.minRating <= data.maxRating;
      }
      return true;
    },
    { message: "minRating must be less than or equal to maxRating", path: ["minRating"] }
  );

module.exports = {
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
};
