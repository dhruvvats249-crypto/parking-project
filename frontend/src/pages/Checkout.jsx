import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/api";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const draft = location.state?.draft;

  const [guestName, setGuestName] = useState(user?.name || "");
  const [guestEmail, setGuestEmail] = useState(user?.email || "");
  const [plate, setPlate] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    api
      .myVehicles(token)
      .then((data) => {
        setVehicles(data.vehicles);
        const primary = data.vehicles.find((v) => v.is_primary);
        if (primary) {
          setSelectedVehicleId(primary.id);
          setPlate(primary.plate);
        }
      })
      .catch(() => {});
  }, [token]);

  function handleVehiclePick(e) {
    const id = e.target.value;
    setSelectedVehicleId(id);
    if (id === "") {
      setPlate("");
      return;
    }
    const v = vehicles.find((v) => v.id === id);
    if (v) setPlate(v.plate);
  }

  if (!draft) {
    return (
      <div className="checkout-page">
        <div className="panel" style={{ maxWidth: 480, margin: "60px auto", textAlign: "center" }}>
          <h2>No reservation in progress</h2>
          <p className="meta" style={{ margin: "12px 0 20px" }}>
            Pick a spot and a time on a parking lot's page first, then continue to checkout.
          </p>
          <Link className="btn btn-primary" to="/find">Find parking</Link>
        </div>
      </div>
    );
  }

  const hours = Math.round(((new Date(draft.end_time) - new Date(draft.start_time)) / (1000 * 60 * 60)) * 100) / 100;
  const rate = Math.round((draft.price / hours) * 100) / 100;

  async function handleComplete(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { booking } = await api.createBooking(token, {
        lot_id: draft.lot_id,
        slot_id: draft.slot_id,
        start_time: draft.start_time,
        end_time: draft.end_time,
        guest_name: guestName || null,
        guest_email: guestEmail || null,
        license_plate: plate || null,
      });
      navigate("/checkout/confirmed", { state: { booking, draft } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="checkout-page">
      <div className="checkout-stepper">
        <div>
          <span className="checkout-step-label">STEP 02 — PAYMENT &amp; DETAILS</span>
        </div>
        <span className="checkout-step-pct">50% Complete</span>
      </div>
      <div className="checkout-progress">
        <div className="checkout-progress-fill" style={{ width: "50%" }} />
      </div>

      <form className="checkout-grid" onSubmit={handleComplete}>
        <div className="checkout-main">
          <div className="panel checkout-card">
            <div className="checkout-card-head">
              <span className="checkout-card-icon">👤</span>
              <h2>Guest Details</h2>
            </div>
            <div className="form-grid">
              <div>
                <label>Full name</label>
                <input value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
              </div>
              <div>
                <label>Email address</label>
                <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} required />
              </div>
            </div>
            <div className="checkout-plate-head">
              <label style={{ marginTop: 16, marginBottom: 0 }}>License plate (optional)</label>
              <Link to="/vehicles" className="qr-test-link" style={{ fontSize: "0.82rem" }}>
                Manage vehicles
              </Link>
            </div>
            {vehicles.length > 0 && (
              <select value={selectedVehicleId} onChange={handleVehiclePick} style={{ marginBottom: 8 }}>
                <option value="">Type a plate manually...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {v.plate}{v.is_primary ? " (primary)" : ""}
                  </option>
                ))}
              </select>
            )}
            <input
              value={plate}
              onChange={(e) => {
                setPlate(e.target.value.toUpperCase());
                setSelectedVehicleId("");
              }}
              placeholder="e.g. UP15 AB 1234"
              style={{ fontFamily: "var(--font-mono)" }}
            />
            <p className="meta" style={{ marginTop: 8 }}>
              Stored with your booking so the lot owner can confirm your vehicle at check-in.
            </p>
          </div>

          <div className="panel checkout-card">
            <div className="checkout-card-head">
              <span className="checkout-card-icon">💳</span>
              <h2>Payment Method</h2>
            </div>
            <label>Card number</label>
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="0000 0000 0000 0000"
              style={{ fontFamily: "var(--font-mono)" }}
            />
            <div className="form-grid" style={{ marginTop: 12 }}>
              <div>
                <label>Expiry date</label>
                <input
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM / YY"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div>
                <label>CVC</label>
                <input
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="•••"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>
            </div>
            <div className="checkout-security-note">
              🛡 Test mode — no real payment is processed. Card details stay in your browser and
              are never sent anywhere.
            </div>
          </div>
        </div>

        <aside className="checkout-summary panel">
          <h2>Reservation Summary</h2>
          <p className="checkout-summary-lot">{draft.lot_name}</p>
          <p className="meta" style={{ marginTop: -8, marginBottom: 16 }}>Spot {draft.slot_label}</p>

          <div className="checkout-summary-row">
            <span>Check-in</span>
            <strong>{formatDateTime(draft.start_time)}</strong>
          </div>
          <div className="checkout-summary-row">
            <span>Check-out</span>
            <strong>{formatDateTime(draft.end_time)}</strong>
          </div>
          <div className="checkout-summary-divider" />
          <div className="checkout-summary-row">
            <span>Rate ({hours}h)</span>
            <strong>₹{rate}/hr</strong>
          </div>
          <div className="checkout-summary-divider" />
          <div className="checkout-summary-row checkout-summary-total">
            <span>Total</span>
            <strong>₹{draft.price}</strong>
          </div>

          {error && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}

          <button className="btn hero-search-btn btn-block" type="submit" disabled={submitting} style={{ marginTop: 18 }}>
            {submitting ? "Confirming..." : "Complete Reservation"}
          </button>
          <p className="meta" style={{ marginTop: 10, fontSize: "0.75rem" }}>
            By clicking "Complete Reservation", your spot is booked immediately for the time
            window above.
          </p>

          <div className="checkout-summary-divider" />
          <Link to={`/lots/${draft.lot_id}`} className="qr-test-link">← Back to lot / view location</Link>
        </aside>
      </form>
    </div>
  );
}
