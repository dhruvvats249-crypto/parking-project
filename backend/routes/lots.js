const express = require("express");
const { v4: uuidv4 } = require("uuid");
const ParkingLot = require("../models/ParkingLot");
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const Subscription = require("../models/Subscription");
const { distanceKm } = require("../utils/geo");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Is a slot free for the given [start, end) window?
// Checked against overlapping active hourly bookings AND overlapping active monthly subscriptions.
// ISO 8601 strings compare correctly with $lt/$gt because their lexicographic
// order matches chronological order.
async function isSlotFree(slotId, start, end) {
  const bookingConflict = await Booking.exists({
    slot_id: slotId,
    status: "active",
    start_time: { $lt: end },
    end_time: { $gt: start },
  });
  if (bookingConflict) return false;

  const subscriptionConflict = await Subscription.exists({
    slot_id: slotId,
    status: "active",
    start_date: { $lt: end },
    end_date: { $gt: start },
  });
  return !subscriptionConflict;
}

async function lotWithAvailability(lot, at, until) {
  const slots = await Slot.find({ lot_id: lot._id, is_active: true });
  const slotsWithStatus = await Promise.all(
    slots.map(async (s) => {
      const available = await isSlotFree(s._id, at, until);
      return { ...s.toJSON(), available };
    })
  );
  const availableCount = slotsWithStatus.filter((s) => s.available).length;
  return {
    ...lot.toJSON(),
    slots: slotsWithStatus,
    total_slots: slots.length,
    available_slots: availableCount,
  };
}

async function searchNearbyLots({ lat, lng, radiusKm = 5, shadeOnly = false, maxPricePerHour = null, at, until }) {
  const now = new Date();
  const atISO = at || now.toISOString();
  const untilISO = until || new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const query = shadeOnly ? { has_shade: true } : {};
  const allLots = await ParkingLot.find(query);

  let lotsInRange = allLots
    .map((lot) => ({ lot, distance_km: distanceKm(lat, lng, lot.lat, lot.lng) }))
    .filter((entry) => entry.distance_km <= radiusKm);

  if (maxPricePerHour) {
    lotsInRange = lotsInRange.filter((entry) => entry.lot.price_per_hour <= maxPricePerHour);
  }
  lotsInRange.sort((a, b) => a.distance_km - b.distance_km);

  const result = await Promise.all(
    lotsInRange.map(async ({ lot, distance_km }) => {
      const withAvail = await lotWithAvailability(lot, atISO, untilISO);
      const { slots, ...summary } = withAvail;
      return { ...summary, distance_km: Math.round(distance_km * 100) / 100 };
    })
  );
  return result;
}

// GET /api/lots/nearby?lat=..&lng=..&radius_km=5&shade=true&at=ISO&until=ISO
router.get("/nearby", async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = req.query.radius_km ? parseFloat(req.query.radius_km) : 5;
    const shadeOnly = req.query.shade === "true";

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: "lat and lng query params are required" });
    }

    const result = await searchNearbyLots({
      lat,
      lng,
      radiusKm,
      shadeOnly,
      at: req.query.at,
      until: req.query.until,
    });

    res.json({ lots: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/lots/:id?at=ISO&until=ISO -> full slot grid with live availability
router.get("/:id", async (req, res, next) => {
  try {
    const lot = await ParkingLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ error: "Parking lot not found" });

    const now = new Date();
    const at = req.query.at || now.toISOString();
    const until = req.query.until || new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    res.json({ lot: await lotWithAvailability(lot, at, until) });
  } catch (err) {
    next(err);
  }
});

// POST /api/lots -> owner lists their own space
// body: { name, address, lat, lng, has_shade, price_per_hour, monthly_price, rows, cols }
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, address, lat, lng, has_shade, price_per_hour, monthly_price, rows, cols } = req.body;

    if (!name || !address || lat === undefined || lng === undefined || !price_per_hour || !rows || !cols) {
      return res.status(400).json({
        error: "name, address, lat, lng, price_per_hour, rows and cols are required",
      });
    }
    if (rows < 1 || cols < 1 || rows * cols > 500) {
      return res.status(400).json({ error: "rows/cols must be positive and the grid must be 500 slots or fewer" });
    }

    const lot = await ParkingLot.create({
      owner_id: req.user.id,
      name,
      address,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      has_shade: !!has_shade,
      price_per_hour: parseFloat(price_per_hour),
      monthly_price: monthly_price ? parseFloat(monthly_price) : null,
      rows: parseInt(rows, 10),
      cols: parseInt(cols, 10),
    });

    const slotDocs = [];
    for (let r = 0; r < lot.rows; r++) {
      for (let c = 0; c < lot.cols; c++) {
        slotDocs.push({
          _id: uuidv4(),
          lot_id: lot._id,
          label: `${String.fromCharCode(65 + r)}${c + 1}`, // A1, A2, B1, B2...
          row: r,
          col: c,
          has_shade: !!has_shade,
        });
      }
    }
    await Slot.insertMany(slotDocs);

    const now = new Date().toISOString();
    res.status(201).json({ lot: await lotWithAvailability(lot, now, now) });
  } catch (err) {
    next(err);
  }
});

// GET /api/lots/mine/list -> lots owned by the logged-in user
router.get("/mine/list", requireAuth, async (req, res, next) => {
  try {
    const lots = await ParkingLot.find({ owner_id: req.user.id });
    const now = new Date().toISOString();
    const result = await Promise.all(lots.map((l) => lotWithAvailability(l, now, now)));
    res.json({ lots: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.isSlotFree = isSlotFree;
module.exports.searchNearbyLots = searchNearbyLots;
