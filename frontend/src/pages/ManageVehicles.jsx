import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/api";

export default function ManageVehicles() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [label, setLabel] = useState("");
  const [plate, setPlate] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.myVehicles(token);
      setVehicles(data.vehicles);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAddForm() {
    setEditingId(null);
    setLabel("");
    setPlate("");
    setShowForm(true);
  }

  function openEditForm(v) {
    setEditingId(v.id);
    setLabel(v.label);
    setPlate(v.plate);
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.updateVehicle(token, editingId, { label, plate });
      } else {
        await api.addVehicle(token, { label, plate });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    if (!window.confirm("Remove this vehicle?")) return;
    setBusyId(id);
    try {
      await api.deleteVehicle(token, id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleMakePrimary(id) {
    setBusyId(id);
    try {
      await api.updateVehicle(token, id, { is_primary: true });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="vehicles-page">
      <h1 style={{ marginBottom: 4 }}>Manage Vehicles</h1>
      <p className="meta" style={{ marginBottom: 28 }}>
        Save your vehicles here and your primary one will auto-fill the license plate field at
        checkout, so you don't have to type it every time.
      </p>

      {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}
      {loading && <div className="page-loading">Loading your vehicles...</div>}

      {!loading && (
        <div className="vehicles-grid">
          {vehicles.map((v) => (
            <div className="panel vehicle-card" key={v.id}>
              {v.is_primary && <span className="vehicle-primary-badge">PRIMARY</span>}
              <div className="vehicle-card-icon">🚗</div>
              <h3>{v.label}</h3>
              <div className="vehicle-plate">{v.plate}</div>
              <div className="vehicle-card-actions">
                <button className="btn btn-ghost" onClick={() => openEditForm(v)}>
                  ✎ Edit
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleRemove(v.id)}
                  disabled={busyId === v.id}
                >
                  🗑 Remove
                </button>
              </div>
              {!v.is_primary && (
                <button
                  className="link-btn vehicle-make-primary"
                  onClick={() => handleMakePrimary(v.id)}
                  disabled={busyId === v.id}
                  style={{ color: "var(--accent-blue)" }}
                >
                  Make primary
                </button>
              )}
            </div>
          ))}

          <button className="vehicle-add-card" onClick={openAddForm}>
            <div className="vehicle-add-icon">+</div>
            <strong>Add New Vehicle</strong>
            <span>Register a new license plate</span>
          </button>
        </div>
      )}

      {!loading && vehicles.length === 0 && (
        <p className="empty-state" style={{ marginTop: -8 }}>
          No saved vehicles yet — add one so checkout is one field shorter next time.
        </p>
      )}

      <div className="panel vehicle-info-card">
        <h3>Why save a vehicle?</h3>
        <p className="meta">
          Your primary vehicle's plate is filled in automatically on the Checkout page, and lot
          owners can match it against your booking at check-in. You can still type a different
          plate at checkout any time.
        </p>
      </div>

      {showForm && (
        <div className="vehicle-modal-backdrop" onClick={() => setShowForm(false)}>
          <form className="panel vehicle-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h3>{editingId ? "Edit vehicle" : "Add a vehicle"}</h3>
            <label>Nickname</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Blue Honda City"
              required
            />
            <label>License plate</label>
            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="e.g. UP15 AB 1234"
              style={{ fontFamily: "var(--font-mono)" }}
              required
            />
            <div className="vehicle-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save vehicle"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
