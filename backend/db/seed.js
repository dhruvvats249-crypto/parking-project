// Populates the database with a demo owner account and a few parking lots
// around Meerut, UP as an example. Edit the coordinates/names for your own city.
// Run with: npm run seed

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDB } = require("./mongo");
const User = require("../models/User");
const ParkingLot = require("../models/ParkingLot");
const Slot = require("../models/Slot");
const mongoose = require("mongoose");

async function ensureOwner() {
  const email = "owner@example.com";
  let owner = await User.findOne({ email });
  if (owner) return owner;

  owner = await User.create({
    name: "Demo Owner",
    email,
    password_hash: bcrypt.hashSync("password123", 10),
  });
  return owner;
}

async function createLot(owner, { name, address, lat, lng, has_shade, price_per_hour, monthly_price, rows, cols }) {
  const lot = await ParkingLot.create({
    owner_id: owner._id,
    name,
    address,
    lat,
    lng,
    has_shade: !!has_shade,
    price_per_hour,
    monthly_price: monthly_price || null,
    rows,
    cols,
  });

  const slotDocs = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const slotShade = r % 2 === 0 ? has_shade : false; // a bit of variety
      slotDocs.push({
        lot_id: lot._id,
        label: `${String.fromCharCode(65 + r)}${c + 1}`,
        row: r,
        col: c,
        has_shade: !!slotShade,
      });
    }
  }
  await Slot.insertMany(slotDocs);
  console.log(`Created lot "${name}" with ${rows * cols} slots`);
}

async function main() {
  await connectDB();
  const owner = await ensureOwner();

  const existingLotCount = await ParkingLot.countDocuments();
  if (existingLotCount === 0) {
    await createLot(owner, {
      name: "Meerut Central Mall Parking",
      address: "Delhi Road, Meerut, UP",
      lat: 28.9931,
      lng: 77.7104,
      has_shade: true,
      price_per_hour: 20,
      monthly_price: 1500,
      rows: 4,
      cols: 6,
    });

    await createLot(owner, {
      name: "Meerut Railway Station Parking",
      address: "Station Road, Meerut, UP",
      lat: 28.9845,
      lng: 77.7064,
      has_shade: false,
      price_per_hour: 15,
      monthly_price: 1000,
      rows: 3,
      cols: 8,
    });

    await createLot(owner, {
      name: "Sadar Bazar Open Lot",
      address: "Sadar Bazar, Meerut Cantt, UP",
      lat: 28.9963,
      lng: 77.6893,
      has_shade: true,
      price_per_hour: 10,
      monthly_price: null,
      rows: 2,
      cols: 5,
    });
  } else {
    console.log("Parking lots already exist, skipping lot creation.");
  }

  console.log("\nSeed complete. Demo owner login: owner@example.com / password123");
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
