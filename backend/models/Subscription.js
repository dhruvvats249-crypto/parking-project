const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { applyIdTransform } = require("./plugins");

const subscriptionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  user_id: { type: String, required: true, index: true },
  lot_id: { type: String, required: true, index: true },
  slot_id: { type: String, required: true, index: true },
  start_date: { type: String, required: true },
  end_date: { type: String, required: true },
  monthly_price: { type: Number, required: true },
  status: { type: String, default: "active" }, // active | cancelled | expired
  license_plate: { type: String, default: null },
  guest_name: { type: String, default: null },
  guest_email: { type: String, default: null },
  created_at: { type: String, default: () => new Date().toISOString() },
});

applyIdTransform(subscriptionSchema);

module.exports = mongoose.model("Subscription", subscriptionSchema);
