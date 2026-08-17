import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/api";
import MapView from "../components/MapView";
import AddressSearch from "../components/AddressSearch";
import { SkeletonLotCard, SkeletonMap } from "../components/Skeleton";

const DEFAULT_CENTER = { lat: 28.9845, lng: 77.706 }; // Meerut, fallback if geolocation is denied

export default function FindParking() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const presetLocation = routerLocation.state?.presetLocation || null;
  const { user, token } = useAuth();

  const [userLocation, setUserLocation] = useState(presetLocation);
  const [locating, setLocating] = useState(!presetLocation);
  const [radiusKm, setRadiusKm] = useState(5);
  const [shadeOnly, setShadeOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [lots, setLots] = useState([]);
  const [savedLots, setSavedLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeLotId, setActiveLotId] = useState(null);
  const [searchAddr, setSearchAddr] = useState(presetLocation?.label || "");
  const [activeTab, setActiveTab] = useState("nearby"); // "nearby" | "saved"

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

  const fetchNearbyLots = useCallback(async () => {
    if (!userLocation) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.nearbyLots({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radiusKm,
        shade: shadeOnly,
        maxPricePerHour: maxPrice ? Number(maxPrice) : undefined,
      });
      setLots(data.lots);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userLocation, radiusKm, shadeOnly, maxPrice]);

  const fetchSavedLots = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.savedLots(token);
      setSavedLots(data.lots);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleToggleSave = async (lotId, e) => {
    e.stopPropagation(); // Prevent card click navigation
    if (!token) {
      setError("Please log in to save lots");
      return;
    }
    setSavingLoading(true);
    try {
      const data = await api.toggleSaveLot(token, lotId);
      // Update both lists optimistically
      setLots((prev) =>
        prev.map((lot) =>
          lot.id === lotId ? { ...lot, is_saved: data.saved } : lot
        )
      );
      setSavedLots((prev) =>
        data.saved
          ? [...prev, prev.find((l) => l.id === lotId)].filter(Boolean)
          : prev.filter((lot) => lot.id !== lotId)
      );
      // If we're on the saved tab and just unsaved, refetch to be safe
      if (!data.saved && activeTab === "saved") {
        fetchSavedLots();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "nearby") {
      fetchNearbyLots();
    } else if (activeTab === "saved" && token) {
      fetchSavedLots();
    }
  }, [activeTab, fetchNearbyLots, fetchSavedLots, token]);

  const currentLots = activeTab === "nearby" ? lots : savedLots;

  const markers = [
    ...(userLocation ? [{ id: "me", ...userLocation, isUser: true }] : []),
    ...currentLots.map((l) => ({
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
              : activeTab === "saved"
              ? "Your saved parking lots"
              : `Showing lots within ${radiusKm} km of your location`}
          </p>
        </div>
      </div>

      <div className="search-bar">
        <div className="tab-row" style={{ marginBottom: 12, gap: 8 }}>
          <button
            className={`tab-btn ${activeTab === "nearby" ? "active" : ""}`}
            onClick={() => setActiveTab("nearby")}
            style={{ flex: 1, padding: "10px" }}
          >
            📍 Nearby
          </button>
          <button
            className={`tab-btn ${activeTab === "saved" ? "active" : ""}`}
            onClick={() => setActiveTab("saved")}
            style={{ flex: 1, padding: "10px" }}
            disabled={!token}
            title={!token ? "Log in to view saved lots" : ""}
          >
            ❤️ Saved
          </button>
        </div>

        {activeTab === "nearby" && (
          <>
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
            <div className="search-field">
              <label>Max price (₹/hr)</label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 20"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                style={{ width: "100px" }}
              />
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
            <button className="btn btn-ghost" onClick={fetchNearbyLots} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </>
        )}

        {error && <div className="form-error">{error}</div>}
      </div>

      <div className="find-layout">
        <div>
          {loading ? (
            <SkeletonMap height={400} />
          ) : (
            <MapView
              center={userLocation || DEFAULT_CENTER}
              markers={markers}
              onMarkerClick={(m) => {
                if (m.id === "me") return;
                setActiveLotId(m.id);
              }}
            />
          )}
        </div>

        <div className="lot-list">
          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <SkeletonLotCard key={i} />
            ))
          ) : currentLots.length === 0 ? (
            <div className="empty-state">
              {activeTab === "saved"
                ? "No saved lots yet. Click the heart icon on any lot to save it for later."
                : "No parking lots found in this radius yet. Try increasing the radius, or be the first to list a space here."}
            </div>
          ) : (
            currentLots.map((lot) => (
              <div
                key={lot.id}
                className={`lot-card ${activeLotId === lot.id ? "active" : ""}`}
                onClick={() => navigate(`/lots/${lot.id}`)}
                onMouseEnter={() => setActiveLotId(lot.id)}
              >
                <div className="lot-card-top">
                  <h4>{lot.name}</h4>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {lot.available_slots > 0 ? (
                      <span className="badge free">{lot.available_slots} free</span>
                    ) : (
                      <span className="badge full">Full</span>
                    )}
                    <button
                      className={`save-btn ${lot.is_saved ? "saved" : ""}`}
                      onClick={(e) => handleToggleSave(lot.id, e)}
                      disabled={savingLoading || !token}
                      title={lot.is_saved ? "Remove from saved" : "Save for later"}
                      aria-label={lot.is_saved ? "Remove from saved" : "Save for later"}
                    >
                      {lot.is_saved ? "❤️" : "🤍"}
                    </button>
                  </div>
                </div>
                <div className="lot-address">{lot.address}</div>
                <div className="lot-card-meta">
                  <span className="badge price">₹{lot.price_per_hour}/hr</span>
                  <span>{lot.distance_km} km away</span>
                  {lot.has_shade && <span>⛱ Shaded</span>}
                  {lot.monthly_price && <span>Monthly available</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
