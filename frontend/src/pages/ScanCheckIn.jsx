import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";

export default function ScanCheckIn() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState("");

  function extractBookingId(text) {
    // Accept either a full check-in URL or a bare booking id.
    const match = text.match(/\/checkin\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : text.trim();
  }

  function handleDecoded(text) {
    const id = extractBookingId(text);
    if (id) {
      stopCamera();
      navigate(`/checkin/${id}`);
    }
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data) {
      handleDecoded(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError("Couldn't access the camera. Check your browser's camera permission, or enter the booking ID below.");
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleManualSubmit(e) {
    e.preventDefault();
    if (!manualId.trim()) return;
    navigate(`/checkin/${extractBookingId(manualId.trim())}`);
  }

  return (
    <div className="checkin-page">
      <div className="panel">
        <h2 style={{ marginBottom: 4 }}>Scan a booking</h2>
        <p className="meta" style={{ marginBottom: 18 }}>
          Scan the renter's QR code to pull up their booking and confirm check-in.
        </p>

        {error && <div className="form-error">{error}</div>}

        <div className="scan-video-wrap">
          <video ref={videoRef} playsInline muted className={scanning ? "" : "hidden"} />
          {!scanning && (
            <div className="scan-placeholder">
              <button className="btn btn-primary" onClick={startCamera}>
                Start camera
              </button>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {scanning && (
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={stopCamera}>
            Stop camera
          </button>
        )}

        <div className="scan-divider">or enter the booking ID manually</div>

        <form onSubmit={handleManualSubmit} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Paste booking ID or check-in link"
            style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}
          />
          <button className="btn btn-primary" type="submit">
            Go
          </button>
        </form>
      </div>
    </div>
  );
}
