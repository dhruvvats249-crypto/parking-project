const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { applyIdTransform } = require("./plugins");

const slotSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  lot_id: { type: String, required: true, index: true },
  label: { type: String, required: true },
  row: { type: Number, required: true },
  col: { type: Number, required: true },
  has_shade: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
});

applyIdTransform(slotSchema);

module.exports = mongoose.model("Slot", slotSchema);
