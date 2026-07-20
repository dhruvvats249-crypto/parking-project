import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api/api";
import { useAuth } from "../context/AuthContext";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MyBookings() {
  const { token } = useAuth();
  const routerLocation = useLocation();
  const justBooked = routerLocation.state?.justBooked;
  const [bookings, setBookings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [qrOpenId, setQrOpenId] = useState(null);

  async function load() {
    try {
      const [b, s] = await Promise.all([api.myBookings(token), api.mySubscriptions(token)]);
      setBookings(b.bookings);
      setSubscriptions(s.subscriptions);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancelBooking(id) {
    setBusyId(id);
    try {
      await api.cancelBooking(token, id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function cancelSubscription(id) {
    setBusyId(id);
    try {
      await api.cancelSubscription(token, id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bookings-page">
      <h1 style={{ marginBottom: 20 }}>My bookings</h1>
      {justBooked && <div className="form-success" style={{ marginBottom: 16 }}>✓ Reservation confirmed! Your spot is booked.</div>}
      {error && <div className="form-error">{error}</div>}

      <h3 style={{ marginBottom: 12 }}>Hourly bookings</h3>
      {bookings.length === 0 && <p className="empty-state">No bookings yet.</p>}
      {bookings.map((b) => (
        <div className="booking-row-wrap" key={b.id}>
          <div className="booking-row">
            <div>
              <h4>{b.lot_name} — Slot {b.slot_label}</h4>
              <div className="meta">{b.lot_address}</div>
              <div className="meta">
                {formatDateTime(b.start_time)} → {formatDateTime(b.end_time)} · ₹{b.price}
              </div>
              {b.checked_in && (
                <div className="meta checked-in-note">
                  ✓ Checked in at {formatDateTime(b.checked_in_at)}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className={`status-pill ${b.status}`}>{b.status}</span>
              {b.status === "active" && (
                <>
                  <button className="btn btn-ghost" onClick={() => setQrOpenId(qrOpenId === b.id ? null : b.id)}>
                    {qrOpenId === b.id ? "Hide QR" : "Show QR"}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => cancelBooking(b.id)}
                    disabled={busyId === b.id}
                  >
                    {busyId === b.id ? "Cancelling..." : "Cancel"}
                  </button>
                </>
              )}
            </div>
          </div>
          {qrOpenId === b.id && (
            <div className="qr-panel">
              <QRCodeSVG value={`${window.location.origin}/checkin/${b.id}`} size={140} />
              <div>
                <p>Show this to the lot owner when you arrive — they'll scan it to confirm your spot.</p>
                <p style={{ marginTop: 8 }}>
                  Testing it yourself?{" "}
                  <Link to={`/checkin/${b.id}`} className="qr-test-link">
                    Open this booking's check-in link
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      ))}

      <h3 style={{ margin: "32px 0 12px" }}>Monthly subscriptions</h3>
      {subscriptions.length === 0 && <p className="empty-state">No subscriptions yet.</p>}
      {subscriptions.map((s) => (
        <div className="booking-row" key={s.id}>
          <div>
            <h4>{s.lot_name} — Slot {s.slot_label}</h4>
            <div className="meta">{s.lot_address}</div>
            <div className="meta">
              {formatDateTime(s.start_date)} → {formatDateTime(s.end_date)} · ₹{s.monthly_price}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`status-pill ${s.status === "active" ? "active" : "cancelled"}`}>{s.status}</span>
            {s.status === "active" && (
              <button
                className="btn btn-danger"
                onClick={() => cancelSubscription(s.id)}
                disabled={busyId === s.id}
              >
                {busyId === s.id ? "Cancelling..." : "Cancel"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
