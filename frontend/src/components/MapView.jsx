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
import L from "leaflet";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { MarkerClusterGroup } from "react-leaflet-cluster";

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

function ClusterIcon({ count }) {
  const size = count < 10 ? 32 : count < 100 ? 40 : 48;
  return (
    <div
      className="custom-cluster"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
        color: "#fff",
        background: `linear-gradient(135deg, #0052FF 0%, #0038b6 100%)`,
        boxShadow: "0 4px 12px rgba(0, 82, 255, 0.4)",
        border: "2px solid #fff",
      }}
    >
      {count}
    </div>
  );
}

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

  // Separate user/picked markers (don't cluster these)
  const userMarkers = markers.filter((m) => m.isUser || m.isPicked);
  const lotMarkers = markers.filter((m) => !m.isUser && !m.isPicked);

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

        {/* Cluster parking lot markers */}
        {lotMarkers.length > 0 && (
          <MarkerClusterGroup
            chunkedLoading
            showCoverageOnHover={false}
            zoomToBoundsOnClick={true}
            spiderfyOnMaxZoom={true}
            disableClusteringAtZoom={16}
            iconCreateFunction={({ markers: clusterMarkers }) => {
              const count = clusterMarkers.length;
              const hasAvailable = clusterMarkers.some(
                (m) => m.options.lotData?.availableSlots > 0
              );
              const size = count < 10 ? 32 : count < 100 ? 40 : 48;
              return L.divIcon({
                html: `
                  <div style="
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: ${size * 0.4}px;
                    font-weight: 700;
                    color: #fff;
                    background: ${hasAvailable
                      ? "linear-gradient(135deg, #0052FF 0%, #0038b6 100%)"
                      : "linear-gradient(135deg, #64748B 0%, #475569 100%)"};
                    box-shadow: 0 4px 12px rgba(0, 82, 255, 0.4);
                    border: 2px solid #fff;
                  ">${count}</div>
                `,
                className: "custom-cluster-icon",
                iconSize: [size, size],
              });
            }}
          >
            {lotMarkers.map((m) => {
              const color = m.availableSlots > 0 ? COLORS.available : COLORS.booked;
              const radius = 12;

              return (
                <CircleMarker
                  key={m.id}
                  center={[m.lat, m.lng]}
                  radius={radius}
                  pathOptions={{
                    color: "#fff",
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 1,
                  }}
                  eventHandlers={{
                    click: () => onMarkerClick && onMarkerClick(m),
                  }}
                  lotData={m}
                >
                  <Popup>
                    <strong>{m.name || "Parking lot"}</strong>
                    <br />
                    {m.availableSlots ?? "?"} spot(s) free
                  </Popup>
                </CircleMarker>
              );
            })}
          </MarkerClusterGroup>
        )}

        {/* User/picked markers (not clustered) */}
        {userMarkers.map((m) => {
          const color = m.isUser ? COLORS.user : COLORS.picked;
          const radius = 8;

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