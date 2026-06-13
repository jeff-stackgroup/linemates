// Top-down hockey rink — used as a subtle background texture.
// All strokes use currentColor so the parent can tint with text-* utilities.
export default function RinkBackground({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 400"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Boards — rounded rectangle */}
      <rect x="4" y="4" width="792" height="392" rx="60" ry="60"
        fill="none" stroke="currentColor" strokeWidth="3" />

      {/* Red center line */}
      <line x1="400" y1="4" x2="400" y2="396" stroke="#ef4444" strokeWidth="6" />

      {/* Center ice circle */}
      <circle cx="400" cy="200" r="50" fill="none" stroke="#ef4444" strokeWidth="3" />
      {/* Center dot */}
      <circle cx="400" cy="200" r="4" fill="#ef4444" />

      {/* Blue lines */}
      <line x1="267" y1="4" x2="267" y2="396" stroke="#3b82f6" strokeWidth="5" />
      <line x1="533" y1="4" x2="533" y2="396" stroke="#3b82f6" strokeWidth="5" />

      {/* Goal lines (red) */}
      <line x1="64" y1="60" x2="64" y2="340" stroke="#ef4444" strokeWidth="2.5" />
      <line x1="736" y1="60" x2="736" y2="340" stroke="#ef4444" strokeWidth="2.5" />

      {/* Goal creases */}
      <path d="M64 170 Q104 170 104 200 Q104 230 64 230" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      <path d="M736 170 Q696 170 696 200 Q696 230 736 230" fill="none" stroke="#3b82f6" strokeWidth="2.5" />

      {/* Zone face-off circles */}
      {[155, 645].map(cx =>
        [130, 270].map(cy => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="36" fill="none" stroke="#ef4444" strokeWidth="2.5" />
            <circle cx={cx} cy={cy} r="3" fill="#ef4444" />
            {/* Hashmarks */}
            <line x1={cx - 36} y1={cy - 10} x2={cx - 36} y2={cy + 10} stroke="#ef4444" strokeWidth="2.5" />
            <line x1={cx + 36} y1={cy - 10} x2={cx + 36} y2={cy + 10} stroke="#ef4444" strokeWidth="2.5" />
          </g>
        ))
      )}

      {/* Neutral zone face-off dots */}
      {[267, 533].map(cx =>
        [140, 260].map(cy => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="#3b82f6" />
        ))
      )}
    </svg>
  )
}
