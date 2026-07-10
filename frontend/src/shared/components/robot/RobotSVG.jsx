import React from 'react'

const MOODS = {
    idle: { eye: '#06b6d4', glow: 'rgba(6,182,212,0.4)', screen: 'url(#screenGrad)' },
    thinking: { eye: '#a78bfa', glow: 'rgba(167,139,250,0.45)', screen: '#0f0a2e' },
    happy: { eye: '#10b981', glow: 'rgba(16,185,129,0.45)', screen: '#022c22' },
    sad: { eye: '#f87171', glow: 'rgba(248,113,113,0.4)', screen: '#1a0a0a' },
    notification: { eye: '#f59e0b', glow: 'rgba(245,158,11,0.45)', screen: '#1c1100' },
}

export default function RobotSVG({ size = 56, mood = 'idle', active = false }) {
    const { eye, glow, screen } = MOODS[mood] || MOODS.idle
    const s = size

    const floatAnim = active
        ? 'robot-bounce 0.8s ease-in-out infinite'
        : mood === 'sad'
            ? 'robot-shake 2.4s ease-in-out infinite'
            : 'robot-float 3s ease-in-out infinite'

    return (
        <>
            <style>{`
        @keyframes robot-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(-1deg); }
        }
        @keyframes robot-bounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-7px) scale(1.04); }
        }
        @keyframes robot-shake {
          0%, 100% { transform: translateX(0px) rotate(0deg); }
          25% { transform: translateX(-1.5px) rotate(-1deg); }
          75% { transform: translateX(1.5px) rotate(1deg); }
        }
        @keyframes robot-eyes-blink {
          0%, 88%, 100% { transform: scaleY(1); }
          92% { transform: scaleY(0.08); }
        }
        @keyframes robot-pulse {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
        @keyframes robot-left-arm {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(12deg); }
        }
        @keyframes robot-right-arm {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-22deg); }
        }
      `}</style>

            <div style={{ width: s, height: s * 1.2, position: 'relative', display: 'inline-block' }}>
                <svg width="100%" height="100%" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                    <defs>
                        {/* Glossy White Gradients */}
                        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="35%" stopColor="#f8fafc" />
                            <stop offset="100%" stopColor="#cbd5e1" />
                        </linearGradient>
                        <linearGradient id="darkBodyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#64748b" />
                            <stop offset="100%" stopColor="#334155" />
                        </linearGradient>
                        <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0f172a" />
                            <stop offset="100%" stopColor="#020617" />
                        </linearGradient>
                        
                        {/* Glow Filter */}
                        <filter id="robotGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Animated Robot Group */}
                    <g style={{ animation: floatAnim, transformOrigin: '50px 110px' }}>
                        {/* Floor shadow */}
                        <ellipse cx="50" cy="113" rx="18" ry="3" fill="#000" opacity="0.15" />

                        {/* Left Arm */}
                        <g style={{ transformOrigin: '28px 85px', animation: mood === 'happy' ? 'robot-left-arm 1.2s ease-in-out infinite' : 'none' }}>
                            <path d="M30 85 C20 85, 12 78, 15 70" stroke="url(#bodyGrad)" strokeWidth="6" strokeLinecap="round" fill="none" />
                            <circle cx="15" cy="70" r="5" fill="#94a3b8" />
                        </g>

                        {/* Right Arm */}
                        <g style={{ transformOrigin: '72px 85px', animation: mood === 'happy' ? 'robot-right-arm 0.8s ease-in-out infinite' : 'none' }}>
                            <path d="M70 85 C80 85, 88 78, 85 70" stroke="url(#bodyGrad)" strokeWidth="6" strokeLinecap="round" fill="none" />
                            <circle cx="85" cy="70" r="5" fill="#94a3b8" />
                        </g>

                        {/* Body Shell */}
                        <rect x="30" y="75" width="40" height="30" rx="14" fill="url(#bodyGrad)" stroke="#cbd5e1" strokeWidth="1.2" />
                        
                        {/* Chest Screen & Core Indicator */}
                        <rect x="37" y="80" width="26" height="20" rx="8" fill="#0f172a" opacity="0.85" />
                        {mood === 'happy' ? (
                            <text x="50" y="94" textAnchor="middle" fill={eye} fontSize="8.5" fontWeight="900" style={{ filter: 'url(#robotGlow)', animation: 'robot-pulse 2s infinite' }}>AI</text>
                        ) : (
                            <circle cx="50" cy="90" r="4" fill={eye} style={{ filter: 'url(#robotGlow)', animation: 'robot-pulse 1.5s infinite' }} />
                        )}

                        {/* Neck connection */}
                        <rect x="46" y="65" width="8" height="12" rx="2" fill="url(#darkBodyGrad)" />

                        {/* Antenna */}
                        <line x1="50" y1="24" x2="50" y2="10" stroke="url(#darkBodyGrad)" strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="50" cy="8" r="4.5" fill={eye} style={{ filter: 'url(#robotGlow)', animation: 'robot-pulse 1.2s infinite' }} />

                        {/* Ear Headphones */}
                        <rect x="14" y="32" width="7" height="22" rx="3.5" fill="url(#darkBodyGrad)" />
                        <circle cx="17.5" cy="43" r="4" fill={eye} style={{ filter: 'url(#robotGlow)' }} />
                        
                        <rect x="79" y="32" width="7" height="22" rx="3.5" fill="url(#darkBodyGrad)" />
                        <circle cx="82.5" cy="43" r="4" fill={eye} style={{ filter: 'url(#robotGlow)' }} />

                        {/* Head Shell */}
                        <rect x="20" y="21" width="60" height="46" rx="21" fill="url(#bodyGrad)" stroke="#cbd5e1" strokeWidth="1.2" />
                        {/* Glossy reflection on head */}
                        <path d="M26 35 C35 27, 65 27, 74 35" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.65" />

                        {/* Black Glass Face Visor */}
                        <rect x="26" y="27" width="48" height="34" rx="14" fill={screen} />
                        <rect x="28" y="29" width="44" height="30" rx="12" stroke={eye} strokeWidth="0.8" fill="none" opacity="0.25" />

                        {/* Glowing Cyan Eyes */}
                        <g style={{ animation: 'robot-eyes-blink 4s infinite', transformOrigin: '50px 44px' }}>
                            {mood === 'sad' ? (
                                <>
                                    <path d="M33 42 L41 45" stroke={eye} strokeWidth="4" strokeLinecap="round" style={{ filter: 'url(#robotGlow)' }} />
                                    <path d="M67 42 L59 45" stroke={eye} strokeWidth="4" strokeLinecap="round" style={{ filter: 'url(#robotGlow)' }} />
                                </>
                            ) : mood === 'thinking' ? (
                                <>
                                    <circle cx="37" cy="43" r="4" fill={eye} style={{ filter: 'url(#robotGlow)' }} />
                                    <circle cx="63" cy="43" r="4" fill={eye} style={{ filter: 'url(#robotGlow)' }} />
                                    <text x="50" y="47" fill={eye} fontSize="11" fontWeight="900" style={{ filter: 'url(#robotGlow)', animation: 'robot-pulse 0.8s infinite' }}>?</text>
                                </>
                            ) : (
                                <>
                                    <ellipse cx="37" cy="43" rx="5" ry="5.5" fill={eye} style={{ filter: 'url(#robotGlow)' }} />
                                    <circle cx="36" cy="41" r="1.2" fill="#ffffff" />
                                    
                                    <ellipse cx="63" cy="43" rx="5" ry="5.5" fill={eye} style={{ filter: 'url(#robotGlow)' }} />
                                    <circle cx="62" cy="41" r="1.2" fill="#ffffff" />
                                </>
                            )}
                        </g>

                        {/* Mouth */}
                        {mood === 'happy' ? (
                            <path d="M43 51 Q50 58, 57 51" stroke={eye} strokeWidth="2.8" strokeLinecap="round" fill="none" style={{ filter: 'url(#robotGlow)' }} />
                        ) : mood === 'sad' ? (
                            <path d="M44 54 Q50 50, 56 54" stroke={eye} strokeWidth="2.2" strokeLinecap="round" fill="none" style={{ filter: 'url(#robotGlow)' }} />
                        ) : mood === 'thinking' ? (
                            <line x1="44" y1="52" x2="56" y2="52" stroke={eye} strokeWidth="2.2" strokeLinecap="round" style={{ filter: 'url(#robotGlow)' }} />
                        ) : (
                            <path d="M45 52 Q50 55, 55 52" stroke={eye} strokeWidth="2.2" strokeLinecap="round" fill="none" style={{ filter: 'url(#robotGlow)' }} />
                        )}
                    </g>
                </svg>
            </div>
        </>
    )
}