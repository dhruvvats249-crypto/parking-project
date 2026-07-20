import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { io } from "socket.io-client";
import { api, API_URL } from "../api/api";
import { useAuth } from "../context/AuthContext";
import SlotGrid from "../components/SlotGrid";
import MapView from "../components/MapView";
import DirectionsPanel from "../components/DirectionsPanel";

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function LotDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [lot, setLot] = useState(null);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [route, setRoute] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [mode, setMode] = useState("hourly"); // hourly | monthly

  const now = new Date();
  const defaultStart = new Date(now.getTime() + 15 * 60 * 1000);
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);
  const [startTime, setStartTime] = useState(toLocalInputValue(defaultStart));
  const [endTime, setEndTime] = useState(toLocalInputValue(defaultEnd));
  const [months, setMonths] = useState(1);
  const [subStartDate, setSubStartDate] = useState(toLocalInputValue(defaultStart).slice(0, 10));

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function loadLot() {
    try {
      const startISO = new Date(startTime).toISOString();
      const endISO = new Date(endTime).toISOString();
      const data = await api.lotDetail(id, { at: startISO, until: endISO });
      setLot(data.lot);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadLot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, startTime, endTime]);

  // Real-time updates: join this lot's room and refresh when any slot changes
  useEffect(() => {
    const socket = io(API_URL || undefined, { transports: ["websocket", "polling"] });
    socket.emit("join-lot", id);
    socket.on("slot-status-changed", (payload) => {
      if (payload.lot_id === id) loadLot();
    });
    return () => {
      socket.emit("leave-lot", id);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  const priceEstimate = useMemo(() => {
    if (!lot) return 0;
    const hours = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
    if (hours <= 0) return 0;
    return Math.round(hours * lot.price_per_hour * 100) / 100;
  }, [lot, startTime, endTime]);

  const monthlyEstimate = useMemo(() => {
    if (!lot || !lot.monthly_price) return 0;
    return Math.round(lot.monthly_price * months * 100) / 100;
  }, [lot, months]);

  async function handleBook(e) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (!token) {
      navigate("/login", { state: { from: `/lots/${id}` } });
      return;
    }
    if (!selectedSlot) {
      setFormError("Pick a slot on the layout first.");
      return;
    }

    if (mode === "hourly") {
      navigate("/checkout", {
        state: {
          draft: {
            lot_id: id,
            lot_name: lot.name,
            lot_address: lot.address,
            lot_lat: lot.lat,
            lot_lng: lot.lng,
            has_shade: lot.has_shade,
            slot_id: selectedSlot.id,
            slot_label: selectedSlot.label,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            price: priceEstimate,
          },
        },
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.createSubscription(token, {
        lot_id: id,
        slot_id: selectedSlot.id,
        start_date: new Date(subStartDate).toISOString(),
        months,
      });
      setSuccess(`Subscribed to slot ${selectedSlot.label} for ${months} month(s).`);
      setSelectedSlot(null);
      loadLot();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <div className="lot-detail"><div className="form-error">{error}</div></div>;
  if (!lot) return <div className="page-loading">Loading lot...</div>;

  return (
    <div className="lot-detail">
      <div className="lot-detail-header">
        <div>
          <h1>{lot.name}</h1>
          <div className="lot-address">{lot.address}</div>
        </div>
        <div>
          <span className="badge price">₹{lot.price_per_hour}/hr</span>{" "}
          {lot.monthly_price && <span className="badge free">₹{lot.monthly_price}/month</span>}
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="panel" style={{ marginBottom: 20 }}>
            <MapView
              center={{ lat: lot.lat, lng: lot.lng }}
              height={280}
              markers={[
                { id: lot.id, lat: lot.lat, lng: lot.lng, name: lot.name, availableSlots: lot.available_slots },
                ...(userLocation ? [{ id: "me", ...userLocation, isUser: true }] : []),
              ]}
              route={route}
            />
            {userLocation && (
              <DirectionsPanel
                origin={userLocation}
                destination={{ lat: lot.lat, lng: lot.lng }}
                onRoute={setRoute}
              />
            )}
          </div>

          <div className="panel">
            <h3>Choose your spot</h3>
            <p style={{ color: "var(--ink-muted)", fontSize: "0.88rem", marginTop: -6, marginBottom: 14 }}>
              {lot.available_slots} of {lot.total_slots} spots free for your selected time window.
            </p>
            <SlotGrid
              slots={lot.slots}
              rows={lot.rows}
              cols={lot.cols}
              selectedSlotId={selectedSlot?.id}
              onSelect={setSelectedSlot}
            />
          </div>
        </div>

        <div className="panel booking-form">
          <div className="tab-row">
            <button
              type="button"
              className={`tab-btn ${mode === "hourly" ? "active" : ""}`}
              onClick={() => setMode("hourly")}
            >
              Hourly
            </button>
            <button
              type="button"
              className={`tab-btn ${mode === "monthly" ? "active" : ""}`}
              onClick={() => setMode("monthly")}
              disabled={!lot.monthly_price}
              title={!lot.monthly_price ? "Not offered at this lot" : ""}
            >
              Monthly
            </button>
          </div>

          <h3>{mode === "hourly" ? "Book a time slot" : "Set up a subscription"}</h3>

          <form onSubmit={handleBook}>
            {mode === "hourly" ? (
              <>
                <label>Start time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
                <label>End time</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
                <div className="price-line">
                  <span>Estimated price</span>
                  <span>₹{priceEstimate}</span>
                </div>
              </>
            ) : (
              <>
                <label>Start date</label>
                <input
                  type="date"
                  value={subStartDate}
                  onChange={(e) => setSubStartDate(e.target.value)}
                  required
                />
                <label>Duration (months)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  required
                />
                <div className="price-line">
                  <span>Total price</span>
                  <span>₹{monthlyEstimate}</span>
                </div>
              </>
            )}

            <p style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>
              Selected spot: <strong>{selectedSlot ? selectedSlot.label : "None yet — pick one on the layout"}</strong>
            </p>

            {formError && <div className="form-error">{formError}</div>}
            {success && <div className="form-success">{success}</div>}

            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
              {!user
                ? "Log in to book"
                : submitting
                ? "Booking..."
                : mode === "hourly"
                ? "Continue to checkout"
                : "Start subscription"}
            </button>
          </form>

          {!user && (
            <p className="auth-switch">
              <Link to="/login" state={{ from: `/lots/${id}` }}>
                Log in
              </Link>{" "}
              or{" "}
              <Link to="/register" state={{ from: `/lots/${id}` }}>
                sign up
              </Link>{" "}
              to book.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
