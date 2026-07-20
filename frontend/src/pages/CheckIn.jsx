import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/api";
import { useAuth } from "../context/AuthContext";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function CheckIn() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBooking(token, id);
      setBooking(data.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    try {
      const data = await api.checkInBooking(token, id);
      setBooking(data.booking);
      setJustConfirmed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  if (!token) {
    return (
      <div className="checkin-page">
        <div className="panel">
          <h2>Log in required</h2>
          <p>You need to be logged in as the lot owner (or admin) to check a booking in.</p>
          <Link className="btn btn-primary" to="/login" state={{ from: `/checkin/${id}` }}>
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) return <div className="page-loading">Loading booking...</div>;

  return (
    <div className="checkin-page">
      <div className="panel">
        <h2 style={{ marginBottom: 4 }}>Check-in</h2>
        <p className="meta" style={{ marginBottom: 18 }}>Confirm this booking's arrival.</p>

        {error && <div className="form-error">{error}</div>}

        {booking && (
          <>
            <div className="checkin-detail-row">
              <span>Booked by</span>
              <strong>{booking.user_name}</strong>
            </div>
            <div className="checkin-detail-row">
              <span>Lot</span>
              <strong>{booking.lot_name}</strong>
            </div>
            <div className="checkin-detail-row">
              <span>Slot</span>
              <strong>{booking.slot_label}</strong>
            </div>
            <div className="checkin-detail-row">
              <span>Window</span>
              <strong>
                {formatDateTime(booking.start_time)} → {formatDateTime(booking.end_time)}
              </strong>
            </div>
            <div className="checkin-detail-row">
              <span>Status</span>
              <span className={`status-pill ${booking.status}`}>{booking.status}</span>
            </div>

            {booking.checked_in ? (
              <div className="form-success" style={{ marginTop: 18 }}>
                ✓ Checked in at {formatDateTime(booking.checked_in_at)}
              </div>
            ) : booking.status !== "active" ? (
              <div className="form-error" style={{ marginTop: 18 }}>
                This booking is {booking.status} and can't be checked in.
              </div>
            ) : booking.can_check_in ? (
              <button
                className="btn btn-primary btn-block"
                style={{ marginTop: 18 }}
                onClick={handleConfirm}
                disabled={confirming}
              >
                {confirming ? "Confirming..." : "Confirm check-in"}
              </button>
            ) : (
              <div className="form-error" style={{ marginTop: 18 }}>
                Only the owner of this lot (or an admin) can check this booking in.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
