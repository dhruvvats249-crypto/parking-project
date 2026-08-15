const express = require("express");
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");
const ParkingLot = require("../models/ParkingLot");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { isSlotFree } = require("./lots");
const { isAdminEmail } = require("../utils/admin");

const router = express.Router();

const MIN_BOOKING_MINUTES = 15;

function computePrice(pricePerHour, startISO, endISO) {
  const hours = (new Date(endISO) - new Date(startISO)) / (1000 * 60 * 60);
  return Math.round(hours * pricePerHour * 100) / 100;
}

async function emitSlotUpdate(req, lotId, slotId) {
  const io = req.app.get("io");
  if (io) {
    const now = new Date().toISOString();
    io.to(`lot:${lotId}`).emit("slot-status-changed", {
      lot_id: lotId,
      slot_id: slotId,
      available: await isSlotFree(slotId, now, now),
    });
  }
}

// POST /api/bookings  { lot_id, slot_id, start_time, end_time }
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { lot_id, slot_id, start_time, end_time, license_plate, guest_name, guest_email } = req.body;
    if (!lot_id || !slot_id || !start_time || !end_time) {
      return res.status(400).json({ error: "lot_id, slot_id, start_time and end_time are required" });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ error: "end_time must be after start_time" });
    }
    const minutes = (end - start) / (1000 * 60);
    if (minutes < MIN_BOOKING_MINUTES) {
      return res.status(400).json({ error: `Minimum booking length is ${MIN_BOOKING_MINUTES} minutes` });
    }
    if (start < new Date(Date.now() - 5 * 60 * 1000)) {
      return res.status(400).json({ error: "start_time cannot be in the past" });
    }

    const slot = await Slot.findOne({ _id: slot_id, lot_id });
    if (!slot || !slot.is_active) {
      return res.status(404).json({ error: "Slot not found" });
    }
    const lot = await ParkingLot.findById(lot_id);
    if (!lot) return res.status(404).json({ error: "Parking lot not found" });

    if (!(await isSlotFree(slot_id, start.toISOString(), end.toISOString()))) {
      return res.status(409).json({ error: "This slot is already booked for part of that time window" });
    }

    const price = computePrice(lot.price_per_hour, start.toISOString(), end.toISOString());
    const booking = await Booking.create({
      user_id: req.user.id,
      lot_id,
      slot_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      price,
      license_plate: license_plate || null,
      guest_name: guest_name || null,
      guest_email: guest_email || null,
    });

    await emitSlotUpdate(req, lot_id, slot_id);

    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/mine
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user_id: req.user.id }).sort({ start_time: -1 });

    const rows = await Promise.all(
      bookings.map(async (b) => {
        const lot = await ParkingLot.findById(b.lot_id);
        const slot = await Slot.findById(b.slot_id);
        return {
          ...b.toJSON(),
          lot_name: lot ? lot.name : "Unknown",
          lot_address: lot ? lot.address : "",
          slot_label: slot ? slot.label : "",
        };
      })
    );

    res.json({ bookings: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/cancel
router.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.user_id !== req.user.id) {
      return res.status(404).json({ error: "Booking not found" });
    }
    if (booking.status !== "active") {
      return res.status(400).json({ error: "Only active bookings can be cancelled" });
    }

    booking.status = "cancelled";
    await booking.save();

    await emitSlotUpdate(req, booking.lot_id, booking.slot_id);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id -> the booking's owner (renter), the lot's owner, or admin can view it.
// Used by the QR check-in page to show booking details before confirming.
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const lot = await ParkingLot.findById(booking.lot_id);
    const isRenter = booking.user_id === req.user.id;
    const isLotOwner = lot && lot.owner_id === req.user.id;
    const isAdmin = isAdminEmail(req.user.email);

    if (!isRenter && !isLotOwner && !isAdmin) {
      return res.status(403).json({ error: "You don't have permission to view this booking" });
    }

    const user = await User.findById(booking.user_id);
    const slot = await Slot.findById(booking.slot_id);

    res.json({
      booking: {
        ...booking.toJSON(),
        user_name: user ? user.name : "Unknown",
        lot_name: lot ? lot.name : "Unknown",
        lot_address: lot ? lot.address : "",
        slot_label: slot ? slot.label : "",
        can_check_in: isLotOwner || isAdmin,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/check-in -> only the lot's owner or admin can confirm arrival.
// Meant to be triggered by scanning the renter's QR code (or opening the check-in link).
router.post("/:id/check-in", requireAuth, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const lot = await ParkingLot.findById(booking.lot_id);
    const isLotOwner = lot && lot.owner_id === req.user.id;
    const isAdmin = isAdminEmail(req.user.email);

    if (!isLotOwner && !isAdmin) {
      return res.status(403).json({ error: "Only the lot owner can check this booking in" });
    }
    if (booking.status !== "active") {
      return res.status(400).json({ error: `This booking is ${booking.status}, not active` });
    }
    if (booking.checked_in) {
      return res.status(400).json({ error: `Already checked in at ${booking.checked_in_at}` });
    }

    booking.checked_in = true;
    booking.checked_in_at = new Date().toISOString();
    await booking.save();

    res.json({ ok: true, booking });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
