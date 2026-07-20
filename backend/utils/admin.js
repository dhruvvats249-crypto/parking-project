// Whoever's email matches ADMIN_EMAIL in backend/.env is treated as the admin.
// Set it once, then log in / register with that exact email to get admin access.
function isAdminEmail(email) {
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  if (!adminEmail) return false;
  return email.toLowerCase().trim() === adminEmail;
}

module.exports = { isAdminEmail };
