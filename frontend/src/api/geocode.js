// Free geocoding via OpenStreetMap's Nominatim service — no API key needed.
// Nominatim asks that you not hammer it; this app only calls it when someone
// explicitly searches, which is well within its usage policy for a small app.
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export async function searchAddress(query) {
  if (!query || query.trim().length < 3) return [];

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
    addressdetails: "0",
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Address search failed");

  const results = await res.json();
  return results.map((r) => ({
    label: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}
