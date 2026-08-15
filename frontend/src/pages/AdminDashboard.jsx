import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/api";

const TABS = ["Overview", "Users", "Lots", "Bookings", "Subscriptions"];

export default function AdminDashboard() {
  const { token } = useAuth();
  const [tab, setTab] = useState("Overview");
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [lots, setLots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [ov, us, lt, bk, sb] = await Promise.all([
        api.adminOverview(token),
        api.adminUsers(token),
        api.adminLots(token),
        api.adminBookings(token),
        api.adminSubscriptions(token),
      ]);
      setOverview(ov);
      setUsers(us.users);
      setLots(lt.lots);
      setBookings(bk.bookings);
      setSubscriptions(sb.subscriptions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDeleteLot(id, name) {
    if (!window.confirm(`Remove "${name}" and all its bookings? This can't be undone.`)) return;
    try {
      await api.adminDeleteLot(token, id);
      await loadAll();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCancelBooking(id) {
    if (!window.confirm("Force-cancel this booking?")) return;
    try {
      await api.adminCancelBooking(token, id);
      await loadAll();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="page-loading">Loading admin dashboard...</div>;

  return (
    <div className="admin-page">
      <div className="find-header">
        <div>
          <h1>Admin dashboard</h1>
          <p>Everything happening across ParkSpot, visible only to you.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="tab-row">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && overview && (
        <div className="admin-stat-grid">
          <div className="panel admin-stat">
            <span className="admin-stat-num">{overview.totals.users}</span>
            <span className="admin-stat-label">Users</span>
          </div>
          <div className="panel admin-stat">
            <span className="admin-stat-num">{overview.totals.lots}</span>
            <span className="admin-stat-label">Parking lots</span>
          </div>
          <div className="panel admin-stat">
            <span className="admin-stat-num">{overview.totals.slots}</span>
            <span className="admin-stat-label">Total slots</span>
          </div>
          <div className="panel admin-stat">
            <span className="admin-stat-num">{overview.totals.active_bookings}</span>
            <span className="admin-stat-label">Active bookings</span>
          </div>
          <div className="panel admin-stat">
            <span className="admin-stat-num">{overview.totals.active_subscriptions}</span>
            <span className="admin-stat-label">Active subscriptions</span>
          </div>
          <div className="panel admin-stat">
            <span className="admin-stat-num">₹{overview.revenue.total}</span>
            <span className="admin-stat-label">
              Revenue (₹{overview.revenue.from_active_bookings} hourly + ₹
              {overview.revenue.from_active_subscriptions} subscriptions)
            </span>
          </div>
        </div>
      )}

      {tab === "Users" && (
        <div className="panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="empty-state">No users yet.</p>}
        </div>
      )}

      {tab === "Lots" && (
        <div className="panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Owner</th>
                <th>Slots</th>
                <th>₹/hour</th>
                <th>₹/month</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => (
                <tr key={l.id}>
                  <td>{l.name}<br /><span className="meta">{l.address}</span></td>
                  <td>{l.owner_name}</td>
                  <td>{l.slot_count}</td>
                  <td>{l.price_per_hour}</td>
                  <td>{l.monthly_price ?? "—"}</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => handleDeleteLot(l.id, l.name)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {lots.length === 0 && <p className="empty-state">No parking lots listed yet.</p>}
        </div>
      )}

      {tab === "Bookings" && (
        <div className="panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Lot / slot</th>
                <th>Window</th>
                <th>Price</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.user_name}<br /><span className="meta">{b.user_email}</span></td>
                  <td>{b.lot_name} — {b.slot_label}</td>
                  <td>
                    {new Date(b.start_time).toLocaleString()}
                    <br />→ {new Date(b.end_time).toLocaleString()}
                  </td>
                  <td>₹{b.price}</td>
                  <td>
                    <span className={`status-pill ${b.status}`}>{b.status}</span>
                    {b.checked_in && <span className="checked-in-note" style={{ marginLeft: 6 }}>✓ checked in</span>}
                  </td>
                  <td>
                    {b.status === "active" && (
                      <button className="btn btn-ghost" onClick={() => handleCancelBooking(b.id)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.length === 0 && <p className="empty-state">No bookings yet.</p>}
        </div>
      )}

      {tab === "Subscriptions" && (
        <div className="panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Lot / slot</th>
                <th>Window</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id}>
                  <td>{s.user_name}<br /><span className="meta">{s.user_email}</span></td>
                  <td>{s.lot_name} — {s.slot_label}</td>
                  <td>
                    {new Date(s.start_date).toLocaleDateString()}
                    {" → "}
                    {new Date(s.end_date).toLocaleDateString()}
                  </td>
                  <td>₹{s.monthly_price}</td>
                  <td><span className={`status-pill ${s.status}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {subscriptions.length === 0 && <p className="empty-state">No subscriptions yet.</p>}
        </div>
      )}
    </div>
  );
}
