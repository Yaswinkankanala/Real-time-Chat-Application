import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Zap, Shield, MessageCircle } from 'lucide-react';

/**
 * ChatSphere3DHero
 * Pure CSS 3D GPU-accelerated interactive hero component.
 * Features 3D parallax tilt, orbiting depth rings, floating 3D perspective chips,
 * and glowing ambient lighting. Respects prefers-reduced-motion.
 */
export default function ChatSphere3DHero({ size = 'default' }) {
  const containerRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const handler = (e) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  const handleMouseMove = (e) => {
    if (prefersReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate smooth tilt angles (-14 to +14 deg)
    const rotateY = ((x - centerX) / centerX) * 14;
    const rotateX = -((y - centerY) / centerY) * 14;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const isSmall = size === 'small';

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative select-none flex items-center justify-center mx-auto transition-transform duration-300 ease-out ${
        isSmall ? 'w-32 h-32' : 'w-48 h-48 sm:w-56 sm:h-56'
      }`}
      style={{
        perspective: '1000px'
      }}
    >
      {/* 3D Transform Scene */}
      <div
        className="w-full h-full relative flex items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: prefersReducedMotion
            ? 'none'
            : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)${!isHovered ? ' animate-float-slow' : ''}`
        }}
      >
        {/* Ambient Backlight Glow */}
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600/30 via-purple-600/25 to-pink-500/20 blur-2xl pointer-events-none transform -translate-z-10"
        />

        {/* Orbiting 3D Ring 1 */}
        <div
          className="absolute inset-2 sm:inset-3 rounded-full border border-indigo-400/40 dark:border-indigo-400/30 border-dashed pointer-events-none"
          style={{
            transform: 'rotateX(68deg) rotateY(15deg) translateZ(10px)',
            animation: prefersReducedMotion ? 'none' : 'spin 18s linear infinite'
          }}
        />

        {/* Orbiting 3D Ring 2 (Counter-Rotating) */}
        <div
          className="absolute inset-4 sm:inset-6 rounded-full border border-purple-400/40 dark:border-purple-400/30 pointer-events-none"
          style={{
            transform: 'rotateX(72deg) rotateY(-25deg) translateZ(-8px)',
            animation: prefersReducedMotion ? 'none' : 'spin-reverse 24s linear infinite'
          }}
        />

        {/* Central 3D Sphere Element */}
        <div
          className={`relative rounded-full shadow-2xl flex items-center justify-center ${
            isSmall ? 'w-16 h-16' : 'w-24 h-24 sm:w-28 sm:h-28'
          }`}
          style={{
            transform: 'translateZ(24px)',
            background: 'radial-gradient(circle at 32% 28%, #818cf8 0%, #6366f1 45%, #4338ca 75%, #312e81 100%)',
            boxShadow: '0 20px 40px -10px rgba(99, 102, 241, 0.5), inset -8px -8px 16px rgba(0, 0, 0, 0.4), inset 6px 6px 12px rgba(255, 255, 255, 0.6)'
          }}
        >
          {/* Inner chat speech glow */}
          <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-md animate-pulse-subtle" />

          {/* Core Specular highlight dot */}
          <div
            className="absolute top-3 left-4 w-4 h-2 sm:w-6 sm:h-3 rounded-full bg-white/60 blur-[1px] transform -rotate-45 pointer-events-none"
          />
        </div>

        {/* Floating 3D Badge Left: "Real-Time ⚡" */}
        {!isSmall && (
          <div
            className="absolute -left-2 sm:-left-4 top-1/4 px-2.5 py-1 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-lg backdrop-blur-md flex items-center gap-1.5 pointer-events-none transition-transform duration-300"
            style={{
              transform: prefersReducedMotion ? 'none' : 'translateZ(38px) rotateY(-8deg)'
            }}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">
              Real-Time
            </span>
          </div>
        )}

        {/* Floating 3D Badge Right: "AI Agent ✨" */}
        {!isSmall && (
          <div
            className="absolute -right-2 sm:-right-4 bottom-1/4 px-2.5 py-1 rounded-xl bg-gradient-to-r from-indigo-500/90 to-purple-600/90 text-white shadow-lg backdrop-blur-md flex items-center gap-1.5 pointer-events-none transition-transform duration-300"
            style={{
              transform: prefersReducedMotion ? 'none' : 'translateZ(44px) rotateY(10deg)'
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse-subtle" />
            <span className="text-[10px] font-extrabold tracking-tight">
              AI Ready
            </span>
          </div>
        )}

        {/* Floating 3D Badge Bottom: "Secure 🔒" */}
        {!isSmall && (
          <div
            className="absolute -bottom-2 sm:-bottom-3 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold flex items-center gap-1 backdrop-blur-md"
            style={{
              transform: prefersReducedMotion ? 'none' : 'translateZ(30px)'
            }}
          >
            <Shield className="w-3 h-3" />
            <span>Encrypted</span>
          </div>
        )}
      </div>
    </div>
  );
}

