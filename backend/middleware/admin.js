const User = require("../models/User");
const { isAdminEmail } = require("../utils/admin");

// Must run after requireAuth (needs req.user.id already set).
// Re-checks against the current ADMIN_EMAIL and the user's current email in
// the database, rather than only trusting the token, so changing
// ADMIN_EMAIL takes effect immediately without anyone needing to log out.
async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: "Admin access only" });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAdmin };
