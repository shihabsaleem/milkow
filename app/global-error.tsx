"use client";

/**
 * Root error boundary — catches failures in the root layout itself, which
 * `app/error.tsx` cannot cover because it renders *inside* that layout.
 *
 * Next.js replaces the entire document here, so this component must render its
 * own `<html>` and `<body>`.
 *
 * Deliberately dependency-free — no Tailwind, no framer-motion, no icons:
 *
 *   1. The Tailwind stylesheet is imported by the root layout, which is exactly
 *      what failed, so utility classes cannot be relied on.
 *   2. If a shared library is what threw, importing it again here would throw
 *      again and produce a genuinely blank page — the one outcome this boundary
 *      exists to prevent.
 *
 * Colour values mirror the `mono-*` tokens in `app/globals.css`. The digest is
 * shown because it is the only handle support has on a production incident.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Last-resort logging. `error.message` is stripped from production builds.
  console.error("[app] Root layout error:", error);

  const page = {
    minHeight: "100dvh",
    width: "100%",
    backgroundColor: "#FAFAFA",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  } as const;

  const card = {
    textAlign: "center",
    maxWidth: "28rem",
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: "1.75rem",
    padding: "2.5rem",
    border: "1px solid #EFEFEF",
    boxShadow: "0 8px 32px 0 rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  } as const;

  const primaryButton = {
    width: "100%",
    backgroundColor: "#111111",
    color: "#FFFFFF",
    fontWeight: 700,
    padding: "1rem",
    borderRadius: "1rem",
    border: "none",
    cursor: "pointer",
    fontSize: "0.95rem",
  } as const;

  const secondaryButton = {
    ...primaryButton,
    backgroundColor: "#F5F5F5",
    color: "#111111",
    border: "1px solid #EFEFEF",
  } as const;

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div style={page}>
          <div style={card}>
            <div
              style={{
                width: "5rem",
                height: "5rem",
                backgroundColor: "#F5F5F5",
                borderRadius: "9999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.5rem",
                fontSize: "2rem",
              }}
              aria-hidden="true"
            >
              !
            </div>

            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 600,
                color: "#111111",
                letterSpacing: "-0.02em",
                margin: "0 0 0.5rem",
              }}
            >
              App Error
            </h1>

            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#666666",
                margin: "0 0 1rem",
              }}
            >
              The app failed to start properly
            </h2>

            <p
              style={{
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#666666",
                lineHeight: 1.6,
                margin: "0 0 1.5rem",
              }}
            >
              This is usually temporary. Try again — if it keeps happening,
              reload the page.
            </p>

            {error.digest && (
              <p
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  color: "#A0A0A0",
                  margin: "0 0 1.5rem",
                }}
              >
                Reference: {error.digest}
              </p>
            )}

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button type="button" onClick={() => reset()} style={primaryButton}>
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={secondaryButton}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
