const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { applyIdTransform } = require("./plugins");

const parkingLotSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  owner_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  has_shade: { type: Boolean, default: false },
  price_per_hour: { type: Number, required: true },
  monthly_price: { type: Number, default: null },
  rows: { type: Number, required: true },
  cols: { type: Number, required: true },
  created_at: { type: String, default: () => new Date().toISOString() },
});

applyIdTransform(parkingLotSchema);

module.exports = mongoose.model("ParkingLot", parkingLotSchema);
