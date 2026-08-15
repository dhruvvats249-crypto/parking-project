const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { applyIdTransform } = require("./plugins");

const userSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  created_at: { type: String, default: () => new Date().toISOString() },
});

applyIdTransform(userSchema);

module.exports = mongoose.model("User", userSchema);
