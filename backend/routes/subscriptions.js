const express = require("express");
const Subscription = require("../models/Subscription");
const ParkingLot = require("../models/ParkingLot");
const Slot = require("../models/Slot");
const { requireAuth } = require("../middleware/auth");
const { isSlotFree } = require("./lots");

const router = express.Router();

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

// POST /api/subscriptions  { lot_id, slot_id, start_date, months }
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { lot_id, slot_id, start_date, months } = req.body;
    if (!lot_id || !slot_id || !start_date || !months) {
      return res.status(400).json({ error: "lot_id, slot_id, start_date and months are required" });
    }
    const monthsNum = parseInt(months, 10);
    if (!Number.isInteger(monthsNum) || monthsNum < 1 || monthsNum > 12) {
      return res.status(400).json({ error: "months must be an integer between 1 and 12" });
    }

    const lot = await ParkingLot.findById(lot_id);
    if (!lot) return res.status(404).json({ error: "Parking lot not found" });
    if (!lot.monthly_price) {
      return res.status(400).json({ error: "This parking lot does not offer monthly subscriptions" });
    }
    const slot = await Slot.findOne({ _id: slot_id, lot_id });
    if (!slot) return res.status(404).json({ error: "Slot not found" });

    const start = new Date(start_date);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: "Invalid start_date" });
    }
    const end = new Date(start);
    end.setMonth(end.getMonth() + monthsNum);

    if (!(await isSlotFree(slot_id, start.toISOString(), end.toISOString()))) {
      return res.status(409).json({ error: "This slot is not free for the entire requested period" });
    }

    const totalPrice = Math.round(lot.monthly_price * monthsNum * 100) / 100;
    const subscription = await Subscription.create({
      user_id: req.user.id,
      lot_id,
      slot_id,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      monthly_price: totalPrice,
    });

    await emitSlotUpdate(req, lot_id, slot_id);

    res.status(201).json({ subscription });
  } catch (err) {
    next(err);
  }
});

// GET /api/subscriptions/mine
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const subs = await Subscription.find({ user_id: req.user.id }).sort({ start_date: -1 });

    const rows = await Promise.all(
      subs.map(async (s) => {
        const lot = await ParkingLot.findById(s.lot_id);
        const slot = await Slot.findById(s.slot_id);
        return {
          ...s.toJSON(),
          lot_name: lot ? lot.name : "Unknown",
          lot_address: lot ? lot.address : "",
          slot_label: slot ? slot.label : "",
        };
      })
    );

    res.json({ subscriptions: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/:id/cancel
router.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub || sub.user_id !== req.user.id) {
      return res.status(404).json({ error: "Subscription not found" });
    }
    sub.status = "cancelled";
    await sub.save();

    await emitSlotUpdate(req, sub.lot_id, sub.slot_id);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
