export default function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "20px",
        minHeight: "140px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div
        style={{
          height: "16px",
          width: "60%",
          background: "var(--surface2)",
          borderRadius: "4px",
          animation: "shimmer 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: "12px",
          width: "40%",
          background: "var(--surface2)",
          borderRadius: "4px",
          animation: "shimmer 1.5s ease-in-out infinite 0.2s",
        }}
      />
    </div>
  );
}
