import React from "react";

export function Skeleton({ className = "", style, ...props }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        background: "linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.5s ease-in-out infinite",
        ...style,
      }}
      {...props}
    />
  );
}

export function SkeletonLotCard() {
  return (
    <div className="lot-card skeleton-card">
      <div className="lot-card-top">
        <Skeleton className="skeleton-text" style={{ width: "60%", height: "1.2rem" }} />
        <Skeleton className="skeleton-badge" style={{ width: "50px", height: "1.2rem" }} />
      </div>
      <Skeleton className="skeleton-text" style={{ width: "80%", height: "1rem", marginTop: "8px" }} />
      <Skeleton className="skeleton-text" style={{ width: "40%", height: "1rem", marginTop: "6px" }} />
      <Skeleton className="skeleton-text" style={{ width: "60%", height: "1rem", marginTop: "6px" }} />
    </div>
  );
}

export function SkeletonSlotGrid({ rows = 4, cols = 5 }) {
  return (
    <div className="slot-grid-wrap">
      <div
        className="slot-grid skeleton-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: rows * cols }, (_, i) => (
          <Skeleton key={i} className="skeleton-slot" style={{ aspectRatio: "1" }} />
        ))}
      </div>
      <div className="slot-legend" style={{ opacity: 0.5 }}>
        <span><i className="dot" /> Available</span>
        <span><i className="dot" /> Booked</span>
        <span><i className="dot" /> Selected</span>
        <span>⛱ Shaded</span>
      </div>
    </div>
  );
}

export function SkeletonMap({ height = 280 }) {
  return (
    <Skeleton style={{ width: "100%", height, borderRadius: "12px" }} />
  );
}

export function SkeletonDirections() {
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <Skeleton className="skeleton-text" style={{ width: "30%", height: "1.2rem", marginBottom: 12 }} />
      <Skeleton style={{ width: "100%", height: 80, borderRadius: "8px" }} />
      <Skeleton className="skeleton-text" style={{ width: "50%", height: "1rem", marginTop: 8 }} />
      <Skeleton className="skeleton-text" style={{ width: "40%", height: "1rem", marginTop: 6 }} />
    </div>
  );
}

export function SkeletonBookingForm() {
  return (
    <div className="panel booking-form">
      <div className="tab-row">
        <Skeleton className="skeleton-tab" style={{ width: "80px", height: "36px" }} />
        <Skeleton className="skeleton-tab" style={{ width: "100px", height: "36px" }} />
      </div>
      <Skeleton className="skeleton-text" style={{ width: "40%", height: "1.2rem", marginTop: 16, marginBottom: 8 }} />
      <Skeleton style={{ width: "100%", height: "44px", borderRadius: "8px", marginBottom: 12 }} />
      <Skeleton style={{ width: "100%", height: "44px", borderRadius: "8px", marginBottom: 12 }} />
      <Skeleton className="skeleton-price" style={{ width: "100%", height: "1.5rem", marginBottom: 16 }} />
      <Skeleton className="skeleton-text" style={{ width: "100%", height: "1rem", marginBottom: 16 }} />
      <Skeleton className="skeleton-btn" style={{ width: "100%", height: "48px" }} />
    </div>
  );
}