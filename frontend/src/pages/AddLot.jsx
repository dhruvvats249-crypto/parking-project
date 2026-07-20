import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/api";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/MapView";
import AddressSearch from "../components/AddressSearch";

const DEFAULT_CENTER = { lat: 28.9845, lng: 77.706 };

export default function AddLot() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState(DEFAULT_CENTER);
  const [hasShade, setHasShade] = useState(false);
  const [pricePerHour, setPricePerHour] = useState(15);
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(5);

  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) =>
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !address.trim()) {
      setError("Space name and address are required.");
      return;
    }

    setBusy(true);
    try {
      const { lot } = await api.createLot(token, {
        name,
        address,
        lat: location.lat,
        lng: location.lng,
        has_shade: hasShade,
        price_per_hour: parseFloat(pricePerHour),
        monthly_price: monthlyPrice ? parseFloat(monthlyPrice) : null,
        rows: parseInt(rows, 10),
        cols: parseInt(cols, 10),
      });
      navigate(`/lots/${lot.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="add-lot-page">
      <h1 style={{ marginBottom: 6 }}>List your parking space</h1>
      <p style={{ color: "var(--ink-muted)", marginBottom: 24 }}>
        Turn an empty driveway or lot into income. Set your grid size and we'll lay out
        individual bookable spots automatically.
      </p>

      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <label>Space name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. My driveway near Sadar Bazar" />

        <label>Address</label>
        <AddressSearch
          value={address}
          onChange={setAddress}
          onSelect={(result) => setLocation({ lat: result.lat, lng: result.lng })}
          placeholder="Start typing — e.g. Sadar Bazar, Meerut"
        />
        <p style={{ fontSize: "0.8rem", color: "var(--ink-muted)", margin: "4px 0 0" }}>
          Pick a suggestion to drop the pin automatically, or fine-tune it on the map below.
        </p>

        <label style={{ marginTop: 18 }}>
          Location — click on the map to set the exact pin, or use your current location
        </label>
        <div style={{ marginBottom: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={useMyLocation}>
            Use my current location
          </button>
        </div>
        <MapView
          center={location}
          height={280}
          markers={[{ id: "picked", ...location, isPicked: true }]}
          onMapClick={setLocation}
        />
        <p style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: 6 }}>
          Pin: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </p>

        <div className="form-grid">
          <div>
            <label>Price per hour (₹)</label>
            <input
              type="number"
              min="1"
              step="0.5"
              value={pricePerHour}
              onChange={(e) => setPricePerHour(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Monthly price (₹, optional)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
              placeholder="Leave blank to disable"
            />
          </div>
          <div>
            <label>Rows</label>
            <input type="number" min="1" max="20" value={rows} onChange={(e) => setRows(e.target.value)} required />
          </div>
          <div>
            <label>Columns</label>
            <input type="number" min="1" max="25" value={cols} onChange={(e) => setCols(e.target.value)} required />
          </div>
        </div>

        <div className="checkbox-row">
          <input
            id="shade"
            type="checkbox"
            checked={hasShade}
            onChange={(e) => setHasShade(e.target.checked)}
          />
          <label htmlFor="shade" style={{ margin: 0 }}>This space is shaded</label>
        </div>

        <p style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: 14 }}>
          This will create {Number(rows) * Number(cols) || 0} individual bookable spots.
        </p>

        <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 18 }}>
          {busy ? "Listing space..." : "List this space"}
        </button>
      </form>
    </div>
  );
}
