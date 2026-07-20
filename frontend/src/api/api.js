// Note: we can't use `||` here, because an empty string is a deliberate,
// valid value (it means "call the API on this same origin" -- used when
// the backend serves the built frontend itself). `||` would treat that
// empty string as falsy and wrongly fall back to the localhost default.
const API_URL =
  import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : "http://localhost:5000";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  register: (name, email, password) =>
    request("/api/auth/register", { method: "POST", body: { name, email, password } }),
  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: { email, password } }),
  me: (token) => request("/api/auth/me", { token }),

  nearbyLots: ({ lat, lng, radiusKm, shade, at, until }) => {
    const params = new URLSearchParams({ lat, lng, radius_km: radiusKm ?? 5 });
    if (shade) params.set("shade", "true");
    if (at) params.set("at", at);
    if (until) params.set("until", until);
    return request(`/api/lots/nearby?${params.toString()}`);
  },
  lotDetail: (id, { at, until } = {}) => {
    const params = new URLSearchParams();
    if (at) params.set("at", at);
    if (until) params.set("until", until);
    const qs = params.toString();
    return request(`/api/lots/${id}${qs ? `?${qs}` : ""}`);
  },
  createLot: (token, payload) => request("/api/lots", { method: "POST", body: payload, token }),
  myLots: (token) => request("/api/lots/mine/list", { token }),

  createBooking: (token, payload) => request("/api/bookings", { method: "POST", body: payload, token }),
  myBookings: (token) => request("/api/bookings/mine", { token }),
  cancelBooking: (token, id) => request(`/api/bookings/${id}/cancel`, { method: "POST", token }),
  getBooking: (token, id) => request(`/api/bookings/${id}`, { token }),
  checkInBooking: (token, id) => request(`/api/bookings/${id}/check-in`, { method: "POST", token }),

  createSubscription: (token, payload) => request("/api/subscriptions", { method: "POST", body: payload, token }),
  mySubscriptions: (token) => request("/api/subscriptions/mine", { token }),
  cancelSubscription: (token, id) => request(`/api/subscriptions/${id}/cancel`, { method: "POST", token }),

  adminOverview: (token) => request("/api/admin/overview", { token }),
  myVehicles: (token) => request("/api/vehicles/mine", { token }),
  addVehicle: (token, payload) => request("/api/vehicles", { method: "POST", body: payload, token }),
  updateVehicle: (token, id, payload) => request(`/api/vehicles/${id}`, { method: "PATCH", body: payload, token }),
  deleteVehicle: (token, id) => request(`/api/vehicles/${id}`, { method: "DELETE", token }),
  adminUsers: (token) => request("/api/admin/users", { token }),
  adminLots: (token) => request("/api/admin/lots", { token }),
  adminBookings: (token) => request("/api/admin/bookings", { token }),
  adminSubscriptions: (token) => request("/api/admin/subscriptions", { token }),
  adminDeleteLot: (token, id) => request(`/api/admin/lots/${id}`, { method: "DELETE", token }),
  adminCancelBooking: (token, id) => request(`/api/admin/bookings/${id}/cancel`, { method: "POST", token }),

  assistantChat: (payload) => request("/api/assistant/chat", { method: "POST", body: payload }),
};

export { API_URL };
