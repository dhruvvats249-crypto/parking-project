# ParkSpot — Real-time parking finder & booking

Find parking lots near you in real time, see the exact layout of the lot,
book a specific spot for an hour or subscribe monthly, and get driving
directions straight to it. Owners can list their own driveway or lot and
turn empty space into income.

Built around a real parking demand study (146–216% lot utilization found
across surveyed locations) — this project targets the actual gaps that
study called out: no real-time systems, no exact-spot booking, no dynamic
availability.

## What's inside

- **backend/** — Node.js + Express API, JWT auth, Socket.io for live slot
  updates, and MongoDB (via Mongoose) for storage — using MongoDB Atlas's
  free tier, your data lives in a real managed database, not a file on
  your laptop, so it survives restarts, redeploys, or moving to a
  different host entirely.
- **frontend/** — React (Vite) app: landing page, map + list search,
  interactive slot-layout booking, free map-based directions, "My bookings",
  and "List your space" for owners.

## Prerequisites

- [Node.js](https://nodejs.org) 18 or newer (includes npm)
- A free [MongoDB Atlas](https://cloud.mongodb.com) account (see below)

No Google/Maps API keys needed — maps use free OpenStreetMap tiles and
the free OSRM routing service.

## 1. Set up a free MongoDB Atlas database

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free
   account (no credit card required).
2. Create a new cluster and choose the **M0 (Free)** tier — it's free
   forever, no time limit, 512 MB of storage.
3. When prompted, create a **database user** (a username + password just
   for your app to connect with — this is separate from your Atlas login).
4. Under **Network Access**, click **Add IP Address** → **Allow access
   from anywhere** (`0.0.0.0/0`). This is fine for development; if you
   deploy this for real later, you can tighten it to your server's IP.
5. Click **Connect** on your cluster → **Drivers** → copy the connection
   string. It looks like:
   ```
   mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with the database user you
   created (not your Atlas account password), and add a database name
   before the `?`, e.g. `.../parking?retryWrites=true...` — you'll paste
   this whole string into `backend/.env` in the next step.

## 2. Run the backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and paste your MongoDB connection string into
`MONGODB_URI=`. Then:

```bash
npm run seed     # creates a demo owner account and 3 demo parking lots
npm run dev       # starts the API on http://localhost:5000
```

Leave this running in its own terminal. The demo owner login created by
the seed script is `owner@example.com` / `password123`.

The demo lots are seeded around Meerut, UP — open `backend/db/seed.js`
and change the `lat`/`lng`/`address` values to your own city before
seeding if you want real nearby results without creating your own
listing first.

## 3. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev       # starts the app on http://localhost:5173
```

Open **http://localhost:5173** in your browser. Allow location access
when prompted so "Find parking near me" can center on you (it falls back
to the seeded demo city if you decline).

## How the pieces fit together

- **Real-time availability**: every time someone books, cancels, or
  subscribes to a slot, the backend emits a Socket.io event to everyone
  currently viewing that lot, so the layout updates live without a
  refresh.
- **Exact-spot booking**: each parking lot is stored as a grid of
  individual slots (`rows` × `cols`), so you book a specific labeled spot
  (A1, B3, etc.), not just "a space at this lot."
- **Pricing**: hourly price = hours booked × the lot's price-per-hour;
  monthly price = the lot's monthly rate × number of months. Both are
  computed server-side so the price you're quoted is the price you're
  charged.
- **Directions**: the frontend calls the free OSRM routing service directly
  from the browser to draw the driving route and show distance/ETA from
  your current location to the selected lot. It's a shared public demo
  server — fine for personal use and development. If you need production
  reliability, you can run your own OSRM instance or switch providers by
  editing `src/components/DirectionsPanel.jsx` only.
- **Address search**: typing an address (when listing a space, or
  searching a different area on "Find parking") looks it up via the free
  OpenStreetMap Nominatim service — no API key. Picking a suggestion drops
  the map pin automatically. This lives in `src/components/AddressSearch.jsx`
  and `src/api/geocode.js`.
- **QR check-in**: every active booking has a "Show QR" button on
  "My bookings" that renders a QR code linking to `/checkin/:bookingId`.
  The lot owner (or admin) scans it from `/scan` — reachable via the "Scan
  check-in" nav link — using the device camera (decoded client-side with
  `jsqr`, no server round-trip needed to read the code), which opens the
  check-in page and lets them confirm arrival with one tap. Only the lot's
  owner or an admin can actually confirm a check-in; anyone else viewing
  the link sees the booking details but not a confirm button. If the
  camera isn't available, there's a manual "paste booking ID" fallback on
  the same scan page.
- **Database**: MongoDB Atlas's free tier (M0) stores everything — users,
  lots, slots, bookings, subscriptions. It's genuinely free forever (no
  time limit, no card required) and, unlike a file on a server's disk,
  it's a separate managed service — so your data survives your backend
  restarting, redeploying, or even moving to a completely different host.
  All the database code lives in `backend/models/` (one file per
  collection) and `backend/db/mongo.js` (the connection) — if you ever
  need to change providers, those are the only files that touch storage.

## Admin dashboard (only you)

The backend `.env` has an `ADMIN_EMAIL` setting. Whoever registers or logs
in with that exact email address gets access to `/admin` in the app — a
dashboard showing every user, every parking lot, every booking and
subscription across the whole system, plus the ability to remove a lot or
force-cancel a booking. No one else sees the "Admin" link or can reach
that page, even if they guess the URL.

To set it up:

1. In `backend/.env`, set `ADMIN_EMAIL=your.email@example.com` to whichever
   email you plan to log in with.
2. Register a normal account with that exact email (or log in if you
   already have one) — it becomes admin automatically, no separate
   password or setup step.
3. An "Admin" link appears in the navbar for that account only.

If you ever want to hand off admin access, just change `ADMIN_EMAIL` and
restart the backend — it re-checks on every request, so it takes effect
immediately.

## Project structure

```
parking-project/
├── backend/
│   ├── db/
│   │   ├── mongo.js       # MongoDB connection (Mongoose)
│   │   └── seed.js        # demo data — edit the coordinates for your city
│   ├── models/            # one file per collection (User, ParkingLot, Slot, Booking, Subscription)
│   ├── middleware/
│   │   ├── auth.js        # JWT verification
│   │   └── admin.js       # admin-only route guard
│   ├── routes/
│   │   ├── auth.js        # register / login / me
│   │   ├── lots.js        # nearby search, lot details, list a space
│   │   ├── bookings.js    # hourly bookings + QR check-in
│   │   ├── subscriptions.js # monthly subscriptions
│   │   └── admin.js       # admin dashboard endpoints
│   ├── utils/geo.js       # distance calculation (Haversine)
│   └── server.js          # Express + Socket.io entry point
└── frontend/
    └── src/
        ├── api/api.js               # all backend calls
        ├── api/geocode.js           # free address search (Nominatim)
        ├── context/AuthContext.jsx  # login state
        ├── components/              # Navbar, MapView, SlotGrid, DirectionsPanel, AddressSearch...
        └── pages/
            ├── Landing.jsx           # marketing home page ("/")
            ├── FindParking.jsx       # map + list search ("/find")
            ├── LotDetail.jsx         # slot layout + booking + directions
            ├── Login.jsx / Register.jsx
            ├── MyBookings.jsx
            ├── AddLot.jsx            # owners list their own space
            ├── AdminDashboard.jsx    # admin-only ("/admin")
            ├── CheckIn.jsx           # QR check-in confirmation
            └── ScanCheckIn.jsx       # camera scanner for owners
```

## Deploying (as one combined service, e.g. on Render)

The backend can serve the frontend's built files itself, so the whole app
runs as a **single service with one URL** — no separate frontend host, no
CORS setup between them. This is the simplest way to deploy for a personal
project or hackathon demo.

1. Push this repo to GitHub (both `backend/` and `frontend/` folders).
2. On [Render](https://render.com), click **New +** → **Web Service** and
   connect your repo.
3. Configure it:
   - **Root Directory**: leave blank (use the repo root)
   - **Build Command**:
     ```
     npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend
     ```
   - **Start Command**:
     ```
     node backend/server.js
     ```
   - **Instance Type**: Free (or a paid tier if you want to avoid the free
     tier's spin-down-when-idle behavior)
4. Add these environment variables (Render sets `PORT` automatically —
   don't add it yourself):

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | your Atlas connection string |
   | `JWT_SECRET` | a long random string |
   | `ADMIN_EMAIL` | your email |
   | `VITE_API_URL` | leave this **empty** — the frontend build then calls the API on its own origin, since it's served from the same place |

5. Click **Create Web Service**. Render will run the build (which builds
   the frontend into `frontend/dist`), then start the backend, which
   detects that build and serves it automatically at your Render URL.

Since your database lives in MongoDB Atlas rather than on this server's
disk, you can redeploy, restart, or move this to a completely different
host at any time without losing any data — the backend and frontend are
just the "engine," Atlas is where everything actually lives.

If you'd rather deploy the frontend and backend as two separate services
instead (e.g. frontend on Vercel/Netlify, backend on Render/Railway), that
works too — just set `VITE_API_URL` to the backend's real URL when
building the frontend, and set `CLIENT_ORIGIN` on the backend to the
frontend's real URL so CORS allows it.

## Notes on running this for real

- Change `JWT_SECRET` in `backend/.env` to a long random string before
  showing this to anyone else.
- MongoDB Atlas's free tier (512 MB) comfortably fits thousands of
  bookings — you likely won't need to think about storage limits for a
  personal project or small city rollout. If you do outgrow it, you can
  upgrade the same cluster to a paid tier without changing any code.
- See the **Deploying** section above for how to put this online as one
  combined service. Since your data lives in Atlas rather than on the
  backend's own disk, you can freely redeploy or switch hosts without any
  risk of losing data.
- OpenStreetMap's tile servers ask that you not hammer them with heavy
  production traffic without a proper tile-hosting plan; for a small app
  or personal use this is a non-issue, but if you scale up, look at
  MapTiler, Stadia Maps, or your own tile server (still no Google needed).
