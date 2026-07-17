"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          padding: "20px",
        }}>
          <div style={{ textAlign: "center", maxWidth: 500 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(239,68,68,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 28,
            }}>⚠️</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              Something went wrong
            </h1>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>
              {error?.message || "An unexpected error occurred"}
            </p>
            {error?.digest && (
              <p style={{ color: "#64748b", fontSize: 11, fontFamily: "monospace", marginBottom: 16 }}>
                Digest: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                padding: "10px 24px",
                borderRadius: 12,
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                color: "white",
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
