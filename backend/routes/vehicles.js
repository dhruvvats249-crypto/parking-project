const express = require("express");
const Vehicle = require("../models/Vehicle");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/vehicles/mine
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ user_id: req.user.id }).sort({ is_primary: -1, created_at: 1 });
    res.json({ vehicles });
  } catch (err) {
    next(err);
  }
});

// POST /api/vehicles  { label, plate, is_primary }
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { label, plate, is_primary } = req.body;
    if (!label || !plate) {
      return res.status(400).json({ error: "label and plate are required" });
    }

    if (is_primary) {
      await Vehicle.updateMany({ user_id: req.user.id }, { $set: { is_primary: false } });
    }

    // First vehicle a user adds becomes primary automatically.
    const existingCount = await Vehicle.countDocuments({ user_id: req.user.id });

    const vehicle = await Vehicle.create({
      user_id: req.user.id,
      label,
      plate: plate.toUpperCase(),
      is_primary: !!is_primary || existingCount === 0,
    });

    res.status(201).json({ vehicle });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/vehicles/:id  { label, plate, is_primary }
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle || vehicle.user_id !== req.user.id) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const { label, plate, is_primary } = req.body;
    if (label !== undefined) vehicle.label = label;
    if (plate !== undefined) vehicle.plate = plate.toUpperCase();
    if (is_primary) {
      await Vehicle.updateMany({ user_id: req.user.id }, { $set: { is_primary: false } });
      vehicle.is_primary = true;
    }
    await vehicle.save();

    res.json({ vehicle });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/vehicles/:id
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle || vehicle.user_id !== req.user.id) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    await Vehicle.deleteOne({ _id: req.params.id });

    // If the removed vehicle was primary, promote the next remaining one.
    if (vehicle.is_primary) {
      const next_ = await Vehicle.findOne({ user_id: req.user.id }).sort({ created_at: 1 });
      if (next_) {
        next_.is_primary = true;
        await next_.save();
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
