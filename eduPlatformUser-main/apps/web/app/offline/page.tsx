"use client";

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
        textAlign: "center",
        padding: "2rem",
        background: "#fafafa",
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📚</div>
      <h1
        style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          color: "#111827",
          marginBottom: "0.5rem",
        }}
      >
        You&apos;re offline
      </h1>
      <p style={{ color: "#6B7280", fontSize: "1rem", maxWidth: "360px" }}>
        Check your internet connection and try again. Pages you&apos;ve already
        visited will still be available.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: "2rem",
          padding: "0.75rem 2rem",
          borderRadius: "0.5rem",
          background: "#7C3AED",
          color: "#fff",
          border: "none",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
