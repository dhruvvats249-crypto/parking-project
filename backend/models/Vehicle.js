const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { applyIdTransform } = require("./plugins");

const vehicleSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  user_id: { type: String, required: true, ref: "User" },
  label: { type: String, required: true }, // e.g. "Blue Tesla Model 3"
  plate: { type: String, required: true },
  is_primary: { type: Boolean, default: false },
  created_at: { type: String, default: () => new Date().toISOString() },
});

applyIdTransform(vehicleSchema);

module.exports = mongoose.model("Vehicle", vehicleSchema);
