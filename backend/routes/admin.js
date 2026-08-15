const express = require("express");
const User = require("../models/User");
const ParkingLot = require("../models/ParkingLot");
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const Subscription = require("../models/Subscription");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

// Every route here requires a logged-in user AND that user's email to match ADMIN_EMAIL.
router.use(requireAuth, requireAdmin);

// GET /api/admin/overview -> top-line counts for a dashboard
router.get("/overview", async (req, res, next) => {
  try {
    const [userCount, lotCount, slotCount, bookingCount, subCount] = await Promise.all([
      User.countDocuments(),
      ParkingLot.countDocuments(),
      Slot.countDocuments(),
      Booking.countDocuments(),
      Subscription.countDocuments(),
    ]);

    const activeBookings = await Booking.find({ status: "active" });
    const activeSubscriptions = await Subscription.find({ status: "active" });

    const bookingRevenue = activeBookings.reduce((sum, b) => sum + b.price, 0);
    const subscriptionRevenue = activeSubscriptions.reduce((sum, s) => sum + s.monthly_price, 0);

    res.json({
      totals: {
        users: userCount,
        lots: lotCount,
        slots: slotCount,
        bookings: bookingCount,
        active_bookings: activeBookings.length,
        subscriptions: subCount,
        active_subscriptions: activeSubscriptions.length,
      },
      revenue: {
        from_active_bookings: Math.round(bookingRevenue * 100) / 100,
        from_active_subscriptions: Math.round(subscriptionRevenue * 100) / 100,
        total: Math.round((bookingRevenue + subscriptionRevenue) * 100) / 100,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users -> every registered user (no password hashes)
router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find({}, "name email created_at").sort({ created_at: -1 });
    res.json({ users: users.map((u) => u.toJSON()) });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/lots -> every parking lot, with owner name and slot counts
router.get("/lots", async (req, res, next) => {
  try {
    const lots = await ParkingLot.find().sort({ created_at: -1 });
    const result = await Promise.all(
      lots.map(async (lot) => {
        const owner = await User.findById(lot.owner_id);
        const slotCount = await Slot.countDocuments({ lot_id: lot._id });
        return { ...lot.toJSON(), owner_name: owner ? owner.name : "Unknown", slot_count: slotCount };
      })
    );
    res.json({ lots: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/bookings -> every booking, with user/lot/slot names
router.get("/bookings", async (req, res, next) => {
  try {
    const bookings = await Booking.find().sort({ created_at: -1 });
    const result = await Promise.all(
      bookings.map(async (b) => {
        const [user, lot, slot] = await Promise.all([
          User.findById(b.user_id),
          ParkingLot.findById(b.lot_id),
          Slot.findById(b.slot_id),
        ]);
        return {
          ...b.toJSON(),
          user_name: user ? user.name : "Unknown",
          user_email: user ? user.email : "",
          lot_name: lot ? lot.name : "Unknown",
          slot_label: slot ? slot.label : "",
        };
      })
    );
    res.json({ bookings: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/subscriptions -> every subscription, with user/lot/slot names
router.get("/subscriptions", async (req, res, next) => {
  try {
    const subs = await Subscription.find().sort({ created_at: -1 });
    const result = await Promise.all(
      subs.map(async (s) => {
        const [user, lot, slot] = await Promise.all([
          User.findById(s.user_id),
          ParkingLot.findById(s.lot_id),
          Slot.findById(s.slot_id),
        ]);
        return {
          ...s.toJSON(),
          user_name: user ? user.name : "Unknown",
          user_email: user ? user.email : "",
          lot_name: lot ? lot.name : "Unknown",
          slot_label: slot ? slot.label : "",
        };
      })
    );
    res.json({ subscriptions: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/lots/:id -> remove a lot entirely (moderation), including
// its slots, bookings, and subscriptions.
router.delete("/lots/:id", async (req, res, next) => {
  try {
    const lot = await ParkingLot.findById(req.params.id);
    if (!lot) return res.status(404).json({ error: "Lot not found" });

    await Promise.all([
      ParkingLot.deleteOne({ _id: lot._id }),
      Slot.deleteMany({ lot_id: lot._id }),
      Booking.deleteMany({ lot_id: lot._id }),
      Subscription.deleteMany({ lot_id: lot._id }),
    ]);

    const io = req.app.get("io");
    if (io) io.to(`lot:${lot._id}`).emit("lot-removed", { lot_id: lot._id });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/bookings/:id/cancel -> force-cancel any user's booking
router.post("/bookings/:id/cancel", async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    booking.status = "cancelled";
    await booking.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`lot:${booking.lot_id}`).emit("slot-status-changed", {
        lot_id: booking.lot_id,
        slot_id: booking.slot_id,
        available: true,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
