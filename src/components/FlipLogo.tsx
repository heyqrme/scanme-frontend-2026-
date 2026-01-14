export function FlipLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer rotating arrows suggesting "flip" motion */}
      <path
        d="M12 2L15 5L12 8M12 2C7.029 2 3 6.029 3 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 22L9 19L12 16M12 22C16.971 22 21 17.971 21 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Center play button/video frame */}
      <rect
        x="8"
        y="8"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M11 10L14 12L11 14V10Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function FlipLogoAnimated({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Animated rotating arrows */}
      <g className="animate-spin" style={{ transformOrigin: 'center', animationDuration: '3s' }}>
        <path
          d="M12 2L15 5L12 8M12 2C7.029 2 3 6.029 3 11"
          stroke="url(#gradient1)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 22L9 19L12 16M12 22C16.971 22 21 17.971 21 13"
          stroke="url(#gradient2)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      
      {/* Static center play button */}
      <rect
        x="8"
        y="8"
        width="8"
        height="8"
        rx="1.5"
        stroke="url(#gradient3)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M11 10L14 12L11 14V10Z"
        fill="url(#gradient3)"
      />
      
      {/* Gradients */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
    </svg>
  );
}
