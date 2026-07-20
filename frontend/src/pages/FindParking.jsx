import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/api";
import MapView from "../components/MapView";
import AddressSearch from "../components/AddressSearch";

const DEFAULT_CENTER = { lat: 28.9845, lng: 77.706 }; // Meerut, fallback if geolocation is denied

export default function FindParking() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const presetLocation = routerLocation.state?.presetLocation || null;

  const [userLocation, setUserLocation] = useState(presetLocation);
  const [locating, setLocating] = useState(!presetLocation);
  const [radiusKm, setRadiusKm] = useState(5);
  const [shadeOnly, setShadeOnly] = useState(false);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeLotId, setActiveLotId] = useState(null);
  const [searchAddr, setSearchAddr] = useState(presetLocation?.label || "");

  useEffect(() => {
    if (presetLocation) return; // came from the landing page search, already have a location
    if (!navigator.geolocation) {
      setUserLocation(DEFAULT_CENTER);
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setUserLocation(DEFAULT_CENTER);
        setLocating(false);
      },
      { timeout: 8000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLots = useCallback(async () => {
    if (!userLocation) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.nearbyLots({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radiusKm,
        shade: shadeOnly,
      });
      setLots(data.lots);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userLocation, radiusKm, shadeOnly]);

  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  const markers = [
    ...(userLocation ? [{ id: "me", ...userLocation, isUser: true }] : []),
    ...lots.map((l) => ({
      id: l.id,
      lat: l.lat,
      lng: l.lng,
      name: l.name,
      availableSlots: l.available_slots,
    })),
  ];

  return (
    <div className="find-page">
      <div className="find-header">
        <div>
          <h1>Parking near you</h1>
          <p>
            {locating
              ? "Getting your location..."
              : `Showing lots within ${radiusKm} km of your location`}
          </p>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-field" style={{ flex: 1, minWidth: 240 }}>
          <label>Search a different area</label>
          <AddressSearch
            value={searchAddr}
            onChange={setSearchAddr}
            onSelect={(result) => {
              setUserLocation({ lat: result.lat, lng: result.lng });
              setLocating(false);
            }}
            placeholder="e.g. Sadar Bazar, Meerut"
          />
        </div>
        <div className="search-field">
          <label>Radius (km)</label>
          <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
            {[1, 2, 5, 10, 20].map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </div>
        <div className="search-field checkbox">
          <input
            id="shade"
            type="checkbox"
            checked={shadeOnly}
            onChange={(e) => setShadeOnly(e.target.checked)}
          />
          <label htmlFor="shade">Shaded spots only</label>
        </div>
        <button className="btn btn-ghost" onClick={fetchLots} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="find-layout">
        <MapView
          center={userLocation || DEFAULT_CENTER}
          markers={markers}
          onMarkerClick={(m) => {
            if (m.id === "me") return;
            setActiveLotId(m.id);
          }}
        />

        <div className="lot-list">
          {lots.length === 0 && !loading && (
            <div className="empty-state">
              No parking lots found in this radius yet. Try increasing the radius, or be the
              first to list a space here.
            </div>
          )}
          {lots.map((lot) => (
            <div
              key={lot.id}
              className={`lot-card ${activeLotId === lot.id ? "active" : ""}`}
              onClick={() => navigate(`/lots/${lot.id}`)}
              onMouseEnter={() => setActiveLotId(lot.id)}
            >
              <div className="lot-card-top">
                <h4>{lot.name}</h4>
                {lot.available_slots > 0 ? (
                  <span className="badge free">{lot.available_slots} free</span>
                ) : (
                  <span className="badge full">Full</span>
                )}
              </div>
              <div className="lot-address">{lot.address}</div>
              <div className="lot-card-meta">
                <span className="badge price">₹{lot.price_per_hour}/hr</span>
                <span>{lot.distance_km} km away</span>
                {lot.has_shade && <span>⛱ Shaded</span>}
                {lot.monthly_price && <span>Monthly available</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
