import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface MascotProps {
  activeInput?: 'email' | 'password' | 'none';
  isSubmitting?: boolean;
  themePreset?: 'gemini-cyan' | 'twilight-blue' | 'cosmic-aurora';
}

export default function Mascot({ activeInput = 'none', isSubmitting = false, themePreset = 'gemini-cyan' }: MascotProps) {
  const [blink, setBlink] = useState(false);

  // Periodic blinking effect
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Theme glow colors
  const glowColor = 
    themePreset === 'gemini-cyan' ? 'rgba(6, 182, 212, 0.4)' :
    themePreset === 'twilight-blue' ? 'rgba(56, 189, 248, 0.4)' : 
    'rgba(168, 85, 247, 0.4)';

  const primaryAccent = 
    themePreset === 'gemini-cyan' ? '#06b6d4' :
    themePreset === 'twilight-blue' ? '#0284c7' : 
    '#a855f7';

  const secondaryAccent = 
    themePreset === 'gemini-cyan' ? '#14b8a6' :
    themePreset === 'twilight-blue' ? '#3b82f6' : 
    '#ec4899';

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* Background glowing halo orbits */}
      <div className="absolute w-48 h-48 rounded-full pointer-events-none filter blur-2xl opacity-30 mix-blend-screen"
        style={{
          background: `radial-gradient(circle, ${primaryAccent} 0%, transparent 70%)`,
          transform: 'scale(1.2)'
        }}
      />

      {/* Orbit paths for animated orbital particles */}
      <svg className="absolute w-72 h-72 pointer-events-none opacity-40 overflow-visible" viewBox="0 0 100 100">
        {/* Ring Orbit 1 */}
        <motion.ellipse
          cx="50"
          cy="50"
          rx="45"
          ry="15"
          fill="none"
          stroke={primaryAccent}
          strokeWidth="0.5"
          strokeDasharray="4 8"
          transform="rotate(-15 50 50)"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
        {/* Ring Orbit 2 */}
        <motion.ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="10"
          fill="none"
          stroke={secondaryAccent}
          strokeWidth="0.4"
          strokeDasharray="8 4"
          transform="rotate(25 50 50)"
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        />

        {/* Orbit Node 1: Math Sigma icon on ring */}
        <motion.g
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '50px 50px' }}
        >
          <motion.circle cx="95" cy="50" r="3" fill="#ffffff" filter="drop-shadow(0 0 4px #06b6d4)" />
          <text x="94" y="51" fill="#fff" fontSize="3.5" fontWeight="bold" fontFamily="monospace">∑</text>
        </motion.g>

        {/* Orbit Node 2: Math Pi icon on ring */}
        <motion.g
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '50px 50px' }}
        >
          <motion.circle cx="50" cy="88" r="2.5" fill="#ffffff" filter="drop-shadow(0 0 4px #a855f7)" />
          <text x="49" y="89" fill="#fff" fontSize="3" fontWeight="bold" fontFamily="monospace">π</text>
        </motion.g>
      </svg>

      {/* Primary Robot Core Mascot with precise motion transitions */}
      <motion.div
        animate={{
          y: isSubmitting ? [-4, 6, -4] : [-8, 8, -8],
          rotate: activeInput === 'email' ? -6 : activeInput === 'password' ? 0 : [-1, 2, -1],
          scale: isSubmitting ? 0.95 : 1
        }}
        transition={{
          y: { duration: isSubmitting ? 1.5 : 5, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          default: { duration: 0.5, ease: 'easeOut' }
        }}
        className="relative z-10 w-36 h-36 flex items-center justify-center cursor-pointer"
        whileHover={{ scale: 1.05 }}
      >
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_10px_15px_rgba(0,0,0,0.3)]">
          <defs>
            <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="60%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id="bodyBaseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <radialGradient id="screenGrad" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Floaters / Side Thrusters */}
          <motion.path
            d="M 12,50 Q 8,55 12,65 T 16,75 L 12,80 L 10,65 Z"
            fill="url(#metalGrad)"
            animate={{
              x: activeInput === 'email' ? -4 : 0,
              y: [0, -3, 0]
            }}
            transition={{ y: { duration: 2, repeat: Infinity } }}
          />
          <motion.path
            d="M 108,50 Q 112,55 108,65 T 104,75 L 108,80 L 110,65 Z"
            fill="url(#metalGrad)"
            animate={{
              x: activeInput === 'email' ? -1 : 0,
              y: [0, -3, 0]
            }}
            transition={{ y: { duration: 2, repeat: Infinity, delay: 0.5 } }}
          />

          {/* Jet Thruster Flame */}
          <motion.path
            d="M 50,92 H 70 L 60,118 Z"
            fill={`url(#metalGrad)`}
            className="opacity-40"
          />
          <motion.path
            d="M 54,92 H 66 L 60,112 Z"
            fill={primaryAccent}
            filter="url(#neonGlow)"
            animate={{
              scaleY: [1, 1.4, 0.8, 1.2, 1],
              opacity: [0.8, 1, 0.7, 1, 0.8]
            }}
            transition={{
              scaleY: { duration: 0.15, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.1, repeat: Infinity }
            }}
            style={{ transformOrigin: '60px 92px' }}
          />

          {/* Robotic Body Column */}
          <rect x="52" y="80" width="16" height="15" rx="4" fill="url(#metalGrad)" />
          <line x1="56" y1="84" x2="64" y2="84" stroke={primaryAccent} strokeWidth="2" strokeLinecap="round" />
          <line x1="56" y1="89" x2="64" y2="89" stroke={secondaryAccent} strokeWidth="2" strokeLinecap="round" />

          {/* Side Ears / Antenna Antlers */}
          <circle cx="18" cy="45" r="5" fill={primaryAccent} filter="url(#neonGlow)" />
          <line x1="18" y1="45" x2="28" y2="45" stroke="#94a3b8" strokeWidth="4" />
          <circle cx="102" cy="45" r="5" fill={primaryAccent} filter="url(#neonGlow)" />
          <line x1="92" y1="45" x2="102" y2="45" stroke="#94a3b8" strokeWidth="4" />

          {/* Animated Halo Head Band */}
          <motion.ellipse
            cx="60"
            cy="15"
            rx="25"
            ry="4"
            fill="none"
            stroke={primaryAccent}
            strokeWidth="2"
            filter="url(#neonGlow)"
            animate={{
              y: [-1, 2, -1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Antenna tip glowing light */}
          <motion.circle
            cx="60"
            cy="15"
            r="3"
            fill="#ffffff"
            filter="url(#neonGlow)"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          {/* Robot Head Frame */}
          <rect x="25" y="24" width="70" height="58" rx="20" fill="url(#bodyBaseGrad)" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="28" y="27" width="64" height="52" rx="17" fill="url(#metalGrad)" />

          {/* Digital Screen Overlay */}
          <rect x="33" y="32" width="54" height="42" rx="10" fill="url(#screenGrad)" stroke="#475569" strokeWidth="1.5" />

          {/* Screen scanning grid effect lines */}
          <path d="M 33,38 H 87 M 33,44 H 87 M 33,50 H 87 M 33,56 H 87 M 33,62 H 87 M 33,68 H 87" stroke="#475569" strokeWidth="0.2" className="opacity-40" />

          {/* React to Password Stage: Hands Covering Eyes (Cute Shy Plate) */}
          <motion.g
            animate={{
              y: activeInput === 'password' ? 0 : 45,
              opacity: activeInput === 'password' ? 1 : 0
            }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            {/* Soft metallic mechanical shield plate covering screen */}
            <rect x="32" y="32" width="56" height="42" rx="10" fill="url(#metalGrad)" stroke={primaryAccent} strokeWidth="1.5" />
            <line x1="42" y1="53" x2="52" y2="53" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
            <line x1="68" y1="53" x2="78" y2="53" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
            {/* Cute digital offline symbols on the plate */}
            <text x="45" y="47" fill={primaryAccent} fontSize="8" fontFamily="monospace" fontWeight="bold">x</text>
            <text x="68" y="47" fill={primaryAccent} fontSize="8" fontFamily="monospace" fontWeight="bold">y</text>
            {/* Shy cheeks indicator */}
            <circle cx="42" cy="62" r="3" fill="#f43f5e" opacity="0.6" filter="url(#neonGlow)" />
            <circle cx="78" cy="62" r="3" fill="#f43f5e" opacity="0.6" filter="url(#neonGlow)" />
          </motion.g>

          {/* Normal eyes screen rendering, visible when password shield is down */}
          {activeInput !== 'password' && (
            <g>
              {/* Left Eye group */}
              <motion.g
                animate={{
                  x: activeInput === 'email' ? -4 : 0,
                  y: activeInput === 'email' ? -1 : 0
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Cheeks glow */}
                <circle cx="44" cy="63" r="3.5" fill={primaryAccent} opacity="0.4" />

                {/* Blinkable digital pixel eye */}
                {!blink ? (
                  <>
                    <ellipse cx="45" cy="51" rx="6" ry="6" fill="#000" />
                    {/* Glowing pupil */}
                    <circle cx="45" cy="51" r="4.5" fill={primaryAccent} filter="url(#neonGlow)" />
                    {/* Focus gleam */}
                    <circle cx="43.5" cy="49" r="1.5" fill="#ffffff" />
                  </>
                ) : (
                  // Blink slit line
                  <line x1="39" y1="51" x2="51" y2="51" stroke={primaryAccent} strokeWidth="3.5" strokeLinecap="round" filter="url(#neonGlow)" />
                )}
              </motion.g>

              {/* Right Eye group */}
              <motion.g
                animate={{
                  x: activeInput === 'email' ? -4 : 0,
                  y: activeInput === 'email' ? -1 : 0
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Cheeks glow */}
                <circle cx="76" cy="63" r="3.5" fill={primaryAccent} opacity="0.4" />

                {/* Blinkable digital pixel eye */}
                {!blink ? (
                  <>
                    <ellipse cx="75" cy="51" rx="6" ry="6" fill="#000" />
                    {/* Glowing pupil */}
                    <circle cx="75" cy="51" r="4.5" fill={primaryAccent} filter="url(#neonGlow)" />
                    {/* Focus gleam */}
                    <circle cx="73.5" cy="49" r="1.5" fill="#ffffff" />
                  </>
                ) : (
                  // Blink slit line
                  <line x1="69" y1="51" x2="81" y2="51" stroke={primaryAccent} strokeWidth="3.5" strokeLinecap="round" filter="url(#neonGlow)" />
                )}
              </motion.g>

              {/* Friendly digital mouth waveform expression */}
              <motion.path
                d={
                  isSubmitting
                    ? "M 52,65 Q 60,65 68,65" // Straight line when processing
                    : activeInput === 'email'
                    ? "M 54,64 Q 60,71 66,66" // Half curiosity curl
                    : "M 52,64 Q 60,72 68,64"  // Happy smile
                }
                fill="none"
                stroke={secondaryAccent}
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#neonGlow)"
                animate={{
                  strokeWidth: [3, 4, 3]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </g>
          )}
        </svg>
      </motion.div>

      {/* Futuristic status label at mascot's feet */}
      <motion.div 
        className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-slate-900/60 backdrop-blur-md rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] pointer-events-none"
        animate={{
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="font-mono text-[10px] tracking-widest text-cyan-300 uppercase">
          {isSubmitting ? 'ALMSY: Analyzing...' : activeInput === 'email' ? 'ALMSY: Reviewing ID' : activeInput === 'password' ? 'ALMSY: Safe Hiding' : 'ALMSY: Standing By'}
        </span>
      </motion.div>
    </div>
  );
}
