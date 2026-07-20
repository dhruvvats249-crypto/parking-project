// Every model uses a UUID string as its _id (instead of Mongo's default
// ObjectId) so the rest of the app — and the frontend — can keep working
// with plain string ids exactly like before. This helper makes JSON output
// use `id` instead of `_id`, and drops Mongoose's internal `__v` field, so
// API responses look the same as they did with the old JSON-file store.
function applyIdTransform(schema) {
  schema.set("toJSON", {
    virtuals: false,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
  schema.set("toObject", {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
}

module.exports = { applyIdTransform };
