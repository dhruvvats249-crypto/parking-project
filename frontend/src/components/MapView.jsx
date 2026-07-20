import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";

// Keeps the map centered on `center` whenever it changes (e.g. once geolocation resolves).
function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng]);
  return null;
}

// Lets a parent listen for clicks anywhere on the map (used by "List your space" to drop a pin).
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

const COLORS = {
  available: "#0052FF",
  booked: "#64748B",
  user: "#F97316",
  picked: "#F97316",
};

export default function MapView({
  center,
  markers = [],
  route,
  height = 420,
  onMarkerClick,
  onMapClick,
}) {
  if (!center) {
    return (
      <div className="map-placeholder" style={{ height }}>
        Waiting for a location...
      </div>
    );
  }

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden" }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Recenter center={center} />
        {onMapClick && <ClickHandler onMapClick={onMapClick} />}

        {markers.map((m) => {
          const color = m.isUser
            ? COLORS.user
            : m.isPicked
            ? COLORS.picked
            : m.availableSlots > 0
            ? COLORS.available
            : COLORS.booked;
          const radius = m.isUser || m.isPicked ? 8 : 12;

          return (
            <CircleMarker
              key={m.id}
              center={[m.lat, m.lng]}
              radius={radius}
              pathOptions={{ color: "#fff", weight: 2, fillColor: color, fillOpacity: 1 }}
              eventHandlers={{ click: () => onMarkerClick && onMarkerClick(m) }}
            >
              {!m.isUser && !m.isPicked && (
                <Popup>
                  <strong>{m.name || "Parking lot"}</strong>
                  <br />
                  {m.availableSlots ?? "?"} spot(s) free
                </Popup>
              )}
            </CircleMarker>
          );
        })}

        {route && route.length > 1 && (
          <Polyline positions={route} pathOptions={{ color: COLORS.available, weight: 5 }} />
        )}
      </MapContainer>
    </div>
  );
}
