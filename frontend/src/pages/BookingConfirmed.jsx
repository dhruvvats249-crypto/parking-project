import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/api";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function BookingConfirmed() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { booking, draft } = location.state || {};

  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState(null);

  if (!booking || !draft) {
    return (
      <div className="confirmed-page">
        <div className="panel" style={{ maxWidth: 480, margin: "60px auto", textAlign: "center" }}>
          <h2>Nothing to show here</h2>
          <p className="meta" style={{ margin: "12px 0 20px" }}>
            This page only shows up right after completing a booking.
          </p>
          <Link className="btn btn-primary" to="/bookings">Go to my bookings</Link>
        </div>
      </div>
    );
  }

  const directionsUrl =
    draft.lot_lat && draft.lot_lng
      ? `https://www.openstreetmap.org/directions?to=${draft.lot_lat}%2C${draft.lot_lng}`
      : null;

  async function handleCancel() {
    if (!window.confirm("Cancel this booking? This can't be undone.")) return;
    setCancelling(true);
    setError(null);
    try {
      await api.cancelBooking(token, booking.id);
      setCancelled(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="confirmed-page">
      <div className="confirmed-check">✓</div>
      <h1 className="confirmed-title">
        {cancelled ? "Booking cancelled" : "Reservation Confirmed!"}
      </h1>
      <p className="confirmed-sub">
        {cancelled
          ? "This spot has been released and is free for others to book."
          : `Your spot at ${draft.lot_name} is secured. Show the QR code below at the lot, or have the owner scan it to check you in.`}
      </p>

      {error && <div className="form-error" style={{ maxWidth: 480, margin: "0 auto 16px" }}>{error}</div>}

      <div className="confirmed-grid">
        <div className="panel confirmed-qr-card">
          <h3>Access Pass</h3>
          <p className="meta">Unique to this reservation — scanned by the lot owner at check-in.</p>
          <div className="confirmed-qr-wrap">
            <QRCodeSVG value={`${window.location.origin}/checkin/${booking.id}`} size={168} />
          </div>
          <div className="confirmed-actions">
            {directionsUrl && !cancelled && (
              <a className="btn btn-primary" href={directionsUrl} target="_blank" rel="noreferrer">
                Get Directions
              </a>
            )}
            <Link className="btn btn-ghost" to={`/checkin/${booking.id}`}>
              Open check-in link
            </Link>
          </div>
        </div>

        <div className="panel confirmed-summary-card">
          <h3>Location Summary</h3>
          <div className="checkout-summary-row">
            <span>Facility</span>
            <strong>{draft.lot_name}</strong>
          </div>
          <div className="checkout-summary-row">
            <span>Address</span>
            <strong>{draft.lot_address}</strong>
          </div>
          <div className="checkout-summary-row">
            <span>Assigned spot</span>
            <strong>{draft.slot_label}</strong>
          </div>
          <div className="checkout-summary-divider" />
          <div className="checkout-summary-row">
            <span>Arrival</span>
            <strong>{formatDateTime(draft.start_time)}</strong>
          </div>
          <div className="checkout-summary-row">
            <span>Departure</span>
            <strong>{formatDateTime(draft.end_time)}</strong>
          </div>
          <div className="checkout-summary-divider" />
          <div className="checkout-summary-row checkout-summary-total">
            <span>Total paid</span>
            <strong>₹{draft.price}</strong>
          </div>
        </div>
      </div>

      <div className="confirmed-info-row">
        <div className="confirmed-info-card">
          <span>💬</span>
          <div>
            <strong>Need help?</strong>
            <p>Reach the lot owner via the Scan check-in flow if there's an issue on arrival.</p>
          </div>
        </div>
        <div className="confirmed-info-card">
          <span>{draft.has_shade ? "⛱" : "🅿️"}</span>
          <div>
            <strong>{draft.has_shade ? "Shaded spot" : "Standard spot"}</strong>
            <p>Confirmed and held for your selected time window.</p>
          </div>
        </div>
        <div className="confirmed-info-card">
          <span>🔒</span>
          <div>
            <strong>Guaranteed entry</strong>
            <p>Your QR pass is all that's needed — no separate ticket.</p>
          </div>
        </div>
      </div>

      <div className="confirmed-footer-links">
        <Link to="/bookings">View my bookings</Link>
        <span>·</span>
        {!cancelled ? (
          <button className="link-btn" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? "Cancelling..." : "Cancel booking"}
          </button>
        ) : (
          <span className="meta">Booking cancelled</span>
        )}
      </div>
    </div>
  );
}
