import React, { useEffect, useState } from "react";

// Uses OSRM's free public routing server (no API key required) to fetch a
// driving route between two points. This is a shared demo server, fine for
// personal use and development; if you outgrow it, you can run your own
// OSRM instance or swap in another routing provider without changing the
// rest of the app — this component is the only place that calls it.
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} hr ${m} min`;
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function DirectionsPanel({ origin, destination, onRoute }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!origin || !destination) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const url = `${OSRM_BASE}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.code !== "Ok" || !data.routes?.length) {
          throw new Error("No route found");
        }
        const route = data.routes[0];
        const positions = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        onRoute(positions);
        setSummary({
          distance: formatDistance(route.distance),
          duration: formatDuration(route.duration),
        });
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Couldn't calculate directions right now.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  if (loading) return <p className="directions-loading">Calculating route...</p>;
  if (error) return <p className="directions-error">{error}</p>;
  if (!summary) return null;

  return (
    <div className="directions-summary">
      <strong>{summary.distance}</strong> away · about <strong>{summary.duration}</strong> by car
    </div>
  );
}
