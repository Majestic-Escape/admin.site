"use client";

// Last-resort boundary: catches errors thrown by the root layout or the
// providers it renders (nothing below can). It replaces the whole document,
// so it must not use any provider, hook or app component.
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "Poppins, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#ffffff",
          color: "#333333",
        }}
      >
        <div
          role="alert"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              maxWidth: 440,
              width: "100%",
              border: "1px solid #CCCCCC",
              borderRadius: 12,
              padding: 32,
              textAlign: "center",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: "#707070", marginTop: 12 }}>
              Majestic Escape hit an unexpected error. Reloading usually fixes
              it.
            </p>
            {error?.digest ? (
              <p style={{ fontSize: 12, color: "#888888", marginTop: 8 }}>
                Reference: {error.digest}
              </p>
            ) : null}
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                marginTop: 24,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  background: "#36621F",
                  color: "#fff",
                  border: 0,
                  borderRadius: 999,
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              {/* Full navigation on purpose: global-error renders outside the app tree. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/dashboard"
                style={{
                  border: "1px solid #CCCCCC",
                  borderRadius: 999,
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#333333",
                  textDecoration: "none",
                }}
              >
                Open dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
