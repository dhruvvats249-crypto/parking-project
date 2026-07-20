const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { applyIdTransform } = require("./plugins");

const bookingSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  user_id: { type: String, required: true, index: true },
  lot_id: { type: String, required: true, index: true },
  slot_id: { type: String, required: true, index: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, default: "active" }, // active | completed | cancelled
  checked_in: { type: Boolean, default: false },
  checked_in_at: { type: String, default: null },
  license_plate: { type: String, default: null },
  guest_name: { type: String, default: null },
  guest_email: { type: String, default: null },
  created_at: { type: String, default: () => new Date().toISOString() },
});

applyIdTransform(bookingSchema);

module.exports = mongoose.model("Booking", bookingSchema);
