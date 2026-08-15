const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { isAdminEmail } = require("../utils/admin");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, isAdmin: isAdminEmail(user.email) },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password_hash: bcrypt.hashSync(password, 10),
    });

    const publicUser = { id: user._id, name: user.name, email: user.email, isAdmin: isAdminEmail(user.email) };
    const token = signToken(publicUser);
    res.status(201).json({ token, user: publicUser });
  } catch (err) {
    // Race condition safety net: two requests could pass the findOne check
    // at the same time. The unique index on email catches that case here.
    if (err.code === 11000) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const publicUser = { id: user._id, name: user.name, email: user.email, isAdmin: isAdminEmail(user.email) };
    const token = signToken(publicUser);
    res.json({ token, user: publicUser });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: { id: user._id, name: user.name, email: user.email, isAdmin: isAdminEmail(user.email) } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
