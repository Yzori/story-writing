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
      <body style={{ backgroundColor: "#0F0D0B", color: "#D4CBBA", fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1.5rem" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(196, 100, 110, 0.08)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="rgba(196, 100, 110, 0.6)" strokeWidth="1.3">
              <circle cx="18" cy="18" r="14" />
              <path d="M18 11v8M18 23v1" />
            </svg>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 600, color: "#EDE6D6", marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#9E9486", maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}>
            An unexpected error occurred. Your work should be safe — try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{ background: "#D4944A", color: "#0F0D0B", fontWeight: 600, padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13 }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#3D3832", marginTop: 16 }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
