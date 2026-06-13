export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stick shaft — diagonal */}
      <rect x="13" y="2" width="3.5" height="20" rx="1.75" fill="white" transform="rotate(12 13 2)"/>
      {/* Blade */}
      <rect x="5" y="21" width="16" height="3.5" rx="1.75" fill="white" transform="rotate(-4 5 21)"/>
      {/* Puck */}
      <ellipse cx="13" cy="27" rx="6" ry="2.5" fill="#60a5fa"/>
    </svg>
  )
}
