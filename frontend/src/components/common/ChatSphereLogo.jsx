import React from 'react';

export default function ChatSphereLogo({ size = 36, className = '' }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          <linearGradient id="csGradientSphere" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="0.5" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#D946EF" />
          </linearGradient>
          <linearGradient id="csGradientGlow" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="csGradientRing" x1="0" y1="24" x2="48" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="0.5" stopColor="#818CF8" />
            <stop offset="1" stopColor="#C084FC" />
          </linearGradient>
        </defs>

        {/* Outer Chat Bubble Tail */}
        <path
          d="M13 35L9 41C8.2 42.2 9.6 43.6 10.8 42.8L17.5 38.3"
          stroke="url(#csGradientSphere)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Luminous Sphere */}
        <circle cx="24" cy="22" r="17" fill="url(#csGradientSphere)" />
        <circle cx="20" cy="17" r="12" fill="url(#csGradientGlow)" opacity="0.3" />

        {/* Inner Futuristic Orbital Chat Arc / Ring */}
        <ellipse
          cx="24"
          cy="22"
          rx="18"
          ry="7.5"
          transform="rotate(-25 24 22)"
          stroke="url(#csGradientRing)"
          strokeWidth="2.5"
          strokeDasharray="6 3"
          opacity="0.9"
        />

        {/* Inner Chat Dots symbolizing real-time voice & speech */}
        <circle cx="18" cy="22" r="2.2" fill="#FFFFFF" />
        <circle cx="24" cy="22" r="2.2" fill="#FFFFFF" />
        <circle cx="30" cy="22" r="2.2" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

