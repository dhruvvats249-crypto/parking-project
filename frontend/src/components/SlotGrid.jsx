import React from "react";

export default function SlotGrid({ slots, rows, cols, selectedSlotId, onSelect }) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  slots.forEach((s) => {
    if (grid[s.row]) grid[s.row][s.col] = s;
  });

  return (
    <div className="slot-grid-wrap">
      <div
        className="slot-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {grid.flatMap((row, r) =>
          row.map((slot, c) => {
            if (!slot) return <div key={`${r}-${c}`} className="slot-cell empty" />;
            const isSelected = slot.id === selectedSlotId;
            const classes = [
              "slot-cell",
              slot.available ? "available" : "booked",
              isSelected ? "selected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={slot.id}
                type="button"
                className={classes}
                disabled={!slot.available}
                onClick={() => onSelect(slot)}
                title={slot.available ? `${slot.label} — available` : `${slot.label} — booked`}
              >
                <span className="slot-label">{slot.label}</span>
                {slot.has_shade && <span className="slot-shade" title="Shaded">⛱</span>}
              </button>
            );
          })
        )}
      </div>
      <div className="slot-legend">
        <span><i className="dot available" /> Available</span>
        <span><i className="dot booked" /> Booked</span>
        <span><i className="dot selected" /> Selected</span>
        <span>⛱ Shaded</span>
      </div>
    </div>
  );
}
