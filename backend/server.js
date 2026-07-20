require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const { connectDB } = require("./db/mongo");

const authRoutes = require("./routes/auth");
const lotRoutes = require("./routes/lots");
const bookingRoutes = require("./routes/bookings");
const subscriptionRoutes = require("./routes/subscriptions");
const adminRoutes = require("./routes/admin");
const vehicleRoutes = require("./routes/vehicles");
const assistantRoutes = require("./routes/assistant");

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

app.set("io", io);

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/lots", lotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/assistant", assistantRoutes);

// Socket.io: clients join a "lot:<id>" room to get live slot updates for that lot
io.on("connection", (socket) => {
  socket.on("join-lot", (lotId) => {
    socket.join(`lot:${lotId}`);
  });
  socket.on("leave-lot", (lotId) => {
    socket.leave(`lot:${lotId}`);
  });
});

// Serve the built frontend from this same server, if it's been built.
// This lets one Render (or any Node host) service run both the API and the
// website together at one URL, with no CORS setup needed. Locally, this
// folder usually won't exist yet -- run `npm run build` in frontend/ first
// if you want to test this combined mode; otherwise just run the frontend
// separately with `npm run dev` as usual.
const frontendDist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Any non-API route falls through to index.html so React Router can
  // handle client-side paths like /find or /lots/:id directly.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
  console.log("Serving built frontend from", frontendDist);
} else {
  console.log("No frontend build found at", frontendDist, "- API only.");
}

// Generic error handler so unexpected errors return JSON instead of crashing silently
// (must be registered last, after all other routes/middleware)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Parking backend running on http://localhost:${PORT}`);
  });
});
