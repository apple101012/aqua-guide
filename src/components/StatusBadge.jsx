const glyphs = {
  advisory: "!",
  caution: "\u2022",
  safe: "\u2713",
};

export default function StatusBadge({ status, statusLabel }) {
  const glyph = glyphs[status] ?? "?";

  return (
    <div
      className={`status-badge status-badge-${status}`}
      role="status"
      aria-label={`Water status: ${statusLabel}`}
    >
      <span className="status-dot" aria-hidden="true">
        {glyph}
      </span>
      <span>{statusLabel}</span>
    </div>
  );
}
