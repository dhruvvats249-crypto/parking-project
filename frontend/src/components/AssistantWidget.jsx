import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/api";

const DEFAULT_LOCATION = { lat: 28.9845, lng: 77.706 }; // Meerut, fallback if geolocation is denied

export default function AssistantWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! Tell me what kind of parking spot you're looking for — e.g. \"find a shaded spot under ₹20/hr near me\" — and I'll search live availability for you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const historyRef = useRef([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open || location) return;
    if (!navigator.geolocation) {
      setLocation(DEFAULT_LOCATION);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation(DEFAULT_LOCATION),
      { timeout: 8000 }
    );
  }, [open, location]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const loc = location || DEFAULT_LOCATION;
      const data = await api.assistantChat({
        message: text,
        lat: loc.lat,
        lng: loc.lng,
        history: historyRef.current,
      });
      historyRef.current = data.history || [];
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply, lots: data.lots }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="assistant-widget">
      {open && (
        <div className="assistant-panel">
          <div className="assistant-panel-head">
            <span>🅿️ ParkSpot Assistant</span>
            <button className="assistant-close" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="assistant-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`assistant-msg assistant-msg-${m.role}`}>
                <p>{m.text}</p>
                {m.lots && m.lots.length > 0 && (
                  <div className="assistant-lot-list">
                    {m.lots.map((lot) => (
                      <button
                        key={lot.id}
                        className="assistant-lot-card"
                        onClick={() => {
                          setOpen(false);
                          navigate(`/lots/${lot.id}`);
                        }}
                      >
                        <div>
                          <strong>{lot.name}</strong>
                          <span className="meta">
                            {lot.distance_km} km · ₹{lot.price_per_hour}/hr
                            {lot.has_shade ? " · ⛱ shaded" : ""}
                          </span>
                        </div>
                        <span className={`status-pill ${lot.available_slots > 0 ? "active" : "cancelled"}`}>
                          {lot.available_slots}/{lot.total_slots} free
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {m.lots && m.lots.length === 0 && (
                  <p className="meta">No matching lots found nearby — try widening the area.</p>
                )}
              </div>
            ))}
            {sending && <div className="assistant-msg assistant-msg-assistant assistant-typing">Thinking...</div>}
          </div>

          {error && <div className="form-error" style={{ margin: "0 12px 8px" }}>{error}</div>}

          <form className="assistant-input-row" onSubmit={handleSend}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about parking near you..."
              disabled={sending}
            />
            <button className="btn btn-primary" type="submit" disabled={sending || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      <button className="assistant-fab" onClick={() => setOpen((v) => !v)} aria-label="AI parking assistant">
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
