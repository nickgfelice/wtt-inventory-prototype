import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function Scan() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "found" | "error">("idle");
  const [message, setMessage] = useState("");

  const startScan = async () => {
    setStatus("starting");
    setMessage("");

    try {
      const videoEl = videoRef.current;
      if (!videoEl) throw new Error("Video element not ready");

      const reader = new BrowserMultiFormatReader();
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      };

      setStatus("scanning");

      const controls = await reader.decodeFromConstraints(
        constraints,
        videoEl,
        (result) => {
          if (!result) return;

          const raw = result.getText().trim();
          if (!raw) return;

          setStatus("found");
          try {
            navigator.vibrate?.(50);
          } catch {
            // no-op
          }

          controls.stop();
          navigate(`/item/${encodeURIComponent(raw)}`);
        },
      );

      void controls;
    } catch (scanError: unknown) {
      setStatus("error");
      const errorMessage =
        scanError instanceof Error ? scanError.message : "Unable to start camera scan";
      setMessage(errorMessage);
    }
  };

  return (
    <div className="container">
      <h1>Scan</h1>

      <p style={{ marginTop: 0 }}>
        Tap Start Scan, then point your camera at a QR code label.
      </p>

      {status !== "scanning" && (
        <button className="btn-primary" onClick={startScan}>
          {status === "starting" ? "Starting..." : "Start Scan"}
        </button>
      )}

      {message && <div className="ui-section inline-message">{message}</div>}

      <div className="ui-section" style={{ marginTop: 12 }}>
        <video ref={videoRef} style={{ width: "100%", borderRadius: 12 }} muted playsInline />
        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
          Tip: if scanning is slow, improve lighting and fill the frame with the QR code.
        </div>
      </div>

      <button className="btn-cancel" style={{ marginTop: 12 }} onClick={() => navigate("/inventory")}>
        Back
      </button>
    </div>
  );
}
