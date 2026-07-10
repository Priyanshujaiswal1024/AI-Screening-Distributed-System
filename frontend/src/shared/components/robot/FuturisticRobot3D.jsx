import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Sparkles, Html } from '@react-three/drei'
import * as THREE from 'three'

// Clean SVG Fallback in case WebGL is unavailable or fails to initialize
function MascotFallback({ mood = 'idle', active = false }) {
    const moods = {
        idle: { bg: 'rgba(6,182,212,0.05)', border: '#06b6d4', glow: 'rgba(6,182,212,0.25)', eye: '#06b6d4' },
        thinking: { bg: 'rgba(139,92,246,0.05)', border: '#8b5cf6', glow: 'rgba(139,92,246,0.25)', eye: '#8b5cf6' },
        happy: { bg: 'rgba(16,185,129,0.05)', border: '#10b981', glow: 'rgba(16,185,129,0.25)', eye: '#10b981' },
        sad: { bg: 'rgba(244,63,94,0.05)', border: '#f43f5e', glow: 'rgba(244,63,94,0.25)', eye: '#f43f5e' },
    }
    const current = moods[mood] || moods.idle
    
    return (
        <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
            <div style={{
                width: 140, height: 140, borderRadius: '50%',
                background: current.bg, border: `2px dashed ${current.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 40px ${current.glow}`,
                position: 'relative',
                animation: 'float-slow 6s ease-in-out infinite'
            }}>
                <svg width="72" height="72" viewBox="0 0 96 96" fill="none">
                    <rect x="18" y="28" width="60" height="52" rx="14" fill="#09090b" stroke={current.eye} strokeWidth="2" />
                    <line x1="48" y1="28" x2="48" y2="14" stroke={current.eye} strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="48" cy="11" r="5" fill={current.eye} />
                    <circle cx="36" cy="50" r="7" fill={current.eye} />
                    <circle cx="60" cy="50" r="7" fill={current.eye} />
                    {mood === 'happy' ? (
                        <path d="M36 66 Q48 74 60 66" stroke={current.eye} strokeWidth="3" strokeLinecap="round" fill="none" />
                    ) : mood === 'sad' ? (
                        <path d="M36 70 Q48 62 60 70" stroke={current.eye} strokeWidth="3" strokeLinecap="round" fill="none" />
                    ) : (
                        <rect x="38" y="67" width="20" height="3" rx="1.5" fill={current.eye} />
                    )}
                </svg>
                {/* Floating CSS Rings */}
                <div style={{
                    position: 'absolute', inset: -15, border: `1px solid ${current.border}`,
                    borderRadius: '50%', opacity: 0.35, transform: 'rotateX(70deg) rotateY(15deg)',
                    animation: 'spin-slow 12s linear infinite'
                }} />
            </div>
            <style>{`
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px) scale(1); }
                    50% { transform: translateY(-12px) scale(1.02); }
                }
                @keyframes spin-slow {
                    from { transform: rotateX(70deg) rotateY(15deg) rotate(0deg); }
                    to { transform: rotateX(70deg) rotateY(15deg) rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

// Internal Three.js model component
function RobotModel({ mood = 'idle', active = false }) {
    const robotRef = useRef()
    const headRef = useRef()
    const leftArmRef = useRef()
    const rightArmRef = useRef()
    const leftForearmRef = useRef()
    const rightForearmRef = useRef()
    const leftHandRef = useRef()
    const rightHandRef = useRef()
    const leftLegRef = useRef()
    const rightLegRef = useRef()
    const leftShinRef = useRef()
    const rightShinRef = useRef()
    const chestRef = useRef()
    const { pointer } = useThree()

    // Determine neon colors based on mood
    const getMoodColor = () => {
        switch (mood) {
            case 'happy':
            case 'success':
                return '#10b981' // Green
            case 'sad':
            case 'error':
                return '#f43f5e' // Rose Red
            case 'thinking':
            case 'loading':
                return '#8b5cf6' // Violet
            case 'scanning':
                return '#06b6d4' // Cyan
            default:
                return '#00e5ff' // Neon cyan/blue default
        }
    }
    
    const neonColor = getMoodColor()

    useFrame((state) => {
        const t = state.clock.getElapsedTime()
        
        // 1. Idle Levitating Floating oscillation (very subtle for humanoid)
        if (robotRef.current) {
            let bobSpeed = 1.2
            let bobHeight = 0.015
            
            if (mood === 'loading') {
                bobSpeed = 2.5
                bobHeight = 0.03
            } else if (mood === 'success') {
                bobSpeed = 4.0
                bobHeight = 0.06
            }
            
            robotRef.current.position.y = Math.sin(t * bobSpeed) * bobHeight
        }

        // 2. Cursor tracking for head
        if (headRef.current) {
            const targetX = pointer.x * 0.4
            const targetY = pointer.y * 0.3
            headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetX, 0.08)
            headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -targetY, 0.08)
        }

        // 3. Subtle breathing motion for chest
        if (chestRef.current) {
            chestRef.current.rotation.x = Math.sin(t * 1.5) * 0.012
        }

        // 4. Reset default poses for limbs
        if (
            leftArmRef.current && rightArmRef.current && 
            leftForearmRef.current && rightForearmRef.current && 
            leftHandRef.current && rightHandRef.current && 
            leftLegRef.current && rightLegRef.current && 
            leftShinRef.current && rightShinRef.current
        ) {
            // Standard standing idle
            leftArmRef.current.rotation.set(0, 0, Math.PI / 16 + Math.sin(t * 1.5) * 0.015)
            rightArmRef.current.rotation.set(0, 0, -Math.PI / 16 - Math.sin(t * 1.5) * 0.015)
            leftForearmRef.current.rotation.set(Math.PI / 12, 0, 0)
            rightForearmRef.current.rotation.set(Math.PI / 12, 0, 0)
            leftHandRef.current.rotation.set(0, 0, 0)
            rightHandRef.current.rotation.set(0, 0, 0)
            
            leftLegRef.current.rotation.set(0, 0, 0)
            rightLegRef.current.rotation.set(0, 0, 0)
            leftShinRef.current.rotation.set(0, 0, 0)
            rightShinRef.current.rotation.set(0, 0, 0)

            if (mood === 'welcome' || mood === 'success') {
                // Wave right hand
                rightArmRef.current.rotation.x = -Math.PI * 0.5
                rightArmRef.current.rotation.z = -Math.PI / 6
                rightForearmRef.current.rotation.x = -Math.PI * 0.3
                rightHandRef.current.rotation.z = Math.sin(t * 8) * 0.15
                
                // Left arm gestures
                leftArmRef.current.rotation.z = Math.PI / 8 + Math.sin(t * 1.5) * 0.03
            } 
            
            else if (mood === 'thinking') {
                // Head tilt
                headRef.current.rotation.z = 0.06
                headRef.current.rotation.x = 0.1
                
                // Right arm to chin
                rightArmRef.current.rotation.x = -Math.PI * 0.45
                rightArmRef.current.rotation.z = -Math.PI / 8
                rightForearmRef.current.rotation.x = -Math.PI * 0.4
            } 

            else if (mood === 'scanning') {
                // Scan arms out forward (holding document)
                leftArmRef.current.rotation.x = -Math.PI * 0.3
                leftArmRef.current.rotation.y = Math.PI / 8
                leftForearmRef.current.rotation.x = -Math.PI * 0.15
                
                rightArmRef.current.rotation.x = -Math.PI * 0.3
                rightArmRef.current.rotation.y = -Math.PI / 8
                rightForearmRef.current.rotation.x = -Math.PI * 0.15
            } 

            else if (mood === 'screening') {
                // Presenting arm sweep to left
                leftArmRef.current.rotation.x = -Math.PI * 0.1
                leftArmRef.current.rotation.y = Math.PI / 3
                leftArmRef.current.rotation.z = Math.PI / 4 + Math.sin(t * 2) * 0.05
                leftHandRef.current.rotation.y = -Math.PI / 6
            }

            else if (mood === 'loading') {
                // Walking animation
                leftLegRef.current.rotation.x = Math.sin(t * 6) * 0.3
                rightLegRef.current.rotation.x = -Math.sin(t * 6) * 0.3
                leftShinRef.current.rotation.x = (Math.sin(t * 6 + Math.PI/2) * 0.15) + 0.15
                rightShinRef.current.rotation.x = (-Math.sin(t * 6 + Math.PI/2) * 0.15) + 0.15
                
                leftArmRef.current.rotation.x = -Math.sin(t * 6) * 0.2
                rightArmRef.current.rotation.x = Math.sin(t * 6) * 0.2
            }

            else if (mood === 'error') {
                // Drop shoulders, tilt head, sad pose
                headRef.current.rotation.x = 0.2
                headRef.current.rotation.z = -0.06
                leftArmRef.current.rotation.z = Math.PI / 24
                rightArmRef.current.rotation.z = -Math.PI / 24
                leftForearmRef.current.rotation.x = Math.PI / 24
                rightForearmRef.current.rotation.x = Math.PI / 24
            }
        }
    })

    // Eyes shape definition based on states
    const renderEyes = () => {
        const eyeMat = <meshBasicMaterial color={neonColor} toneMapped={false} />
        
        if (mood === 'happy' || mood === 'success' || mood === 'welcome') {
            // Curvy smiling eyes (using small half torus or curved arcs)
            return (
                <>
                    <mesh position={[-0.07, 0.02, 0.257]} rotation={[0, 0, Math.PI]}>
                        <torusGeometry args={[0.022, 0.006, 8, 24, Math.PI]} />
                        {eyeMat}
                    </mesh>
                    <mesh position={[0.07, 0.02, 0.257]} rotation={[0, 0, Math.PI]}>
                        <torusGeometry args={[0.022, 0.006, 8, 24, Math.PI]} />
                        {eyeMat}
                    </mesh>
                </>
            )
        }
        
        if (mood === 'sad' || mood === 'error') {
            // X eyes
            return (
                <>
                    <mesh position={[-0.07, 0.02, 0.257]} rotation={[0, 0, -Math.PI / 4]}>
                        <boxGeometry args={[0.032, 0.008, 0.01]} />
                        {eyeMat}
                    </mesh>
                    <mesh position={[-0.07, 0.02, 0.257]} rotation={[0, 0, Math.PI / 4]}>
                        <boxGeometry args={[0.032, 0.008, 0.01]} />
                        {eyeMat}
                    </mesh>
                    <mesh position={[0.07, 0.02, 0.257]} rotation={[0, 0, Math.PI / 4]}>
                        <boxGeometry args={[0.032, 0.008, 0.01]} />
                        {eyeMat}
                    </mesh>
                    <mesh position={[0.07, 0.02, 0.257]} rotation={[0, 0, -Math.PI / 4]}>
                        <boxGeometry args={[0.032, 0.008, 0.01]} />
                        {eyeMat}
                    </mesh>
                </>
            )
        }

        if (mood === 'thinking' || mood === 'loading') {
            // Spinning rings
            return (
                <>
                    <mesh position={[-0.07, 0.02, 0.257]}>
                        <ringGeometry args={[0.012, 0.024, 16]} />
                        {eyeMat}
                    </mesh>
                    <mesh position={[0.07, 0.02, 0.257]}>
                        <ringGeometry args={[0.012, 0.024, 16]} />
                        {eyeMat}
                    </mesh>
                </>
            )
        }

        // Default glowing circular eyes (Pixar/Optimus hybrid)
        return (
            <>
                <mesh position={[-0.07, 0.02, 0.257]}>
                    <sphereGeometry args={[0.024, 16, 16]} />
                    {eyeMat}
                </mesh>
                <mesh position={[0.07, 0.02, 0.257]}>
                    <sphereGeometry args={[0.024, 16, 16]} />
                    {eyeMat}
                </mesh>
            </>
        )
    }

    const renderFingers = (side) => {
        const fingerMat = <meshStandardMaterial color="#27272a" roughness={0.3} />
        const positions = [
            [-0.015 * side, -0.01, -0.015], // Thumb
            [-0.012 * side, -0.02, 0.015],  // Index
            [-0.004 * side, -0.02, 0.015],  // Middle
            [0.004 * side, -0.02, 0.015],   // Ring
            [0.012 * side, -0.02, 0.015],   // Pinky
        ]
        return positions.map((p, idx) => (
            <mesh key={idx} position={p}>
                <boxGeometry args={[0.006, 0.018, 0.006]} />
                {fingerMat}
            </mesh>
        ))
    }

    const aiTexture = React.useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.fillStyle = 'rgba(9, 9, 11, 0.95)'
            ctx.fillRect(0, 0, 256, 256)

            ctx.strokeStyle = neonColor
            ctx.lineWidth = 12
            ctx.strokeRect(16, 16, 224, 224)

            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 6
            ctx.beginPath()
            ctx.moveTo(8, 48); ctx.lineTo(8, 8); ctx.lineTo(48, 8)
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(248, 48); ctx.lineTo(248, 8); ctx.lineTo(208, 8)
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(8, 208); ctx.lineTo(8, 248); ctx.lineTo(48, 248)
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(248, 208); ctx.lineTo(248, 248); ctx.lineTo(208, 248)
            ctx.stroke()

            ctx.shadowColor = neonColor
            ctx.shadowBlur = 24

            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 96px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('AI', 128, 128)
        }
        const texture = new THREE.CanvasTexture(canvas)
        return texture
    }, [neonColor])

    return (
        <group ref={robotRef}>
            {/* 1. Hip / Pelvis Joint Connector */}
            <mesh castShadow receiveShadow position={[0, 0, 0]}>
                <boxGeometry args={[0.36, 0.12, 0.22]} />
                <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
            </mesh>
            <mesh position={[0, -0.06, 0]}>
                <cylinderGeometry args={[0.18, 0.18, 0.04, 16]} />
                <meshStandardMaterial color="#27272a" roughness={0.3} metalness={0.8} />
            </mesh>

            {/* 2. Spine / Abdomen vertebrae */}
            <group position={[0, 0.06, 0]}>
                <mesh position={[0, 0.05, 0]}>
                    <cylinderGeometry args={[0.08, 0.1, 0.06, 16]} />
                    <meshStandardMaterial color="#27272a" roughness={0.4} metalness={0.7} />
                </mesh>
                <mesh position={[0, 0.13, 0]}>
                    <cylinderGeometry args={[0.07, 0.09, 0.06, 16]} />
                    <meshStandardMaterial color="#27272a" roughness={0.4} metalness={0.7} />
                </mesh>
                {/* Glowing neon wire coil inside the spine */}
                <mesh position={[0, 0.09, 0]}>
                    <torusGeometry args={[0.09, 0.015, 8, 16]} />
                    <meshBasicMaterial color={neonColor} toneMapped={false} />
                </mesh>
            </group>

            {/* 3. Chest & Upper Torso */}
            <group ref={chestRef} position={[0, 0.25, 0]}>
                {/* Main chest plate */}
                <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
                    <boxGeometry args={[0.48, 0.32, 0.24]} />
                    <meshStandardMaterial color="#ffffff" roughness={0.08} metalness={0.05} />
                </mesh>
                {/* Broad shoulder armor wings */}
                <mesh position={[-0.24, 0.18, -0.02]} rotation={[0, 0, Math.PI / 12]}>
                    <boxGeometry args={[0.12, 0.08, 0.26]} />
                    <meshStandardMaterial color="#ffffff" roughness={0.08} />
                </mesh>
                <mesh position={[0.24, 0.18, -0.02]} rotation={[0, 0, -Math.PI / 12]}>
                    <boxGeometry args={[0.12, 0.08, 0.26]} />
                    <meshStandardMaterial color="#ffffff" roughness={0.08} />
                </mesh>
                {/* Glowing emblem center */}
                <mesh position={[0, 0.1, 0.125]}>
                    <boxGeometry args={[0.14, 0.14, 0.02]} />
                    <meshBasicMaterial color={neonColor} toneMapped={false} />
                </mesh>
                <mesh position={[0, 0.1, 0.136]}>
                    <planeGeometry args={[0.135, 0.135]} />
                    <meshBasicMaterial map={aiTexture} transparent toneMapped={false} />
                </mesh>

                {/* 4. Neck */}
                <mesh position={[0, 0.28, 0]}>
                    <cylinderGeometry args={[0.07, 0.08, 0.08, 16]} />
                    <meshStandardMaterial color="#27272a" roughness={0.3} metalness={0.8} />
                </mesh>

                {/* 5. Head (expressive visor & face) */}
                <group ref={headRef} position={[0, 0.44, 0.02]}>
                    <mesh castShadow>
                        <sphereGeometry args={[0.22, 32, 32]} />
                        <meshStandardMaterial color="#ffffff" roughness={0.08} metalness={0.05} />
                    </mesh>
                    <mesh position={[0, 0.02, 0.23]}>
                        <boxGeometry args={[0.26, 0.11, 0.05]} />
                        <meshStandardMaterial color="#09090b" roughness={0.05} metalness={0.9} />
                    </mesh>

                    {/* Glowing LED Eyes */}
                    {renderEyes()}

                    {/* Left Cyber Antenna */}
                    <mesh position={[-0.22, 0.05, 0]} rotation={[0, 0, Math.PI / 6]}>
                        <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
                        <meshStandardMaterial color="#27272a" roughness={0.3} />
                    </mesh>
                    <mesh position={[-0.26, 0.1, 0]}>
                        <sphereGeometry args={[0.025, 8, 8]} />
                        <meshBasicMaterial color={neonColor} toneMapped={false} />
                    </mesh>

                    {/* Right Cyber Antenna */}
                    <mesh position={[0.22, 0.05, 0]} rotation={[0, 0, -Math.PI / 6]}>
                        <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
                        <meshStandardMaterial color="#27272a" roughness={0.3} />
                    </mesh>
                    <mesh position={[0.26, 0.1, 0]}>
                        <sphereGeometry args={[0.025, 8, 8]} />
                        <meshBasicMaterial color={neonColor} toneMapped={false} />
                    </mesh>
                </group>

                {/* 6. Left Arm (Broad shoulder pad, joints, segments, mechanical fingers) */}
                <group ref={leftArmRef} position={[-0.32, 0.18, 0]}>
                    <mesh>
                        <sphereGeometry args={[0.07, 16, 16]} />
                        <meshStandardMaterial color="#27272a" roughness={0.3} metalness={0.8} />
                    </mesh>
                    {/* Shoulder pad armor */}
                    <mesh position={[0, 0.04, 0]}>
                        <sphereGeometry args={[0.09, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                        <meshStandardMaterial color="#ffffff" roughness={0.08} />
                    </mesh>
                    {/* Upper arm bone */}
                    <mesh position={[-0.06, -0.16, 0]} rotation={[0, 0, Math.PI / 12]}>
                        <capsuleGeometry args={[0.045, 0.16, 8, 16]} />
                        <meshStandardMaterial color="#ffffff" roughness={0.08} />
                    </mesh>
                    {/* Elbow joint */}
                    <group position={[-0.09, -0.26, 0]}>
                        <mesh>
                            <sphereGeometry args={[0.045, 12, 12]} />
                            <meshStandardMaterial color="#27272a" roughness={0.3} metalness={0.8} />
                        </mesh>
                        {/* Forearm */}
                        <group ref={leftForearmRef} position={[-0.03, -0.14, 0]} rotation={[0, 0, Math.PI / 16]}>
                            <mesh>
                                <capsuleGeometry args={[0.04, 0.14, 8, 16]} />
                                <meshStandardMaterial color="#ffffff" roughness={0.08} />
                            </mesh>
                            {/* Wrist & Hand */}
                            <group ref={leftHandRef} position={[0, -0.12, 0]}>
                                <mesh>
                                    <boxGeometry args={[0.05, 0.02, 0.045]} />
                                    <meshStandardMaterial color="#27272a" roughness={0.3} />
                                </mesh>
                                {/* Articulated mechanical fingers */}
                                {renderFingers(-1)}
                            </group>
                        </group>
                    </group>
                </group>

                {/* 7. Right Arm */}
                <group ref={rightArmRef} position={[0.32, 0.18, 0]}>
                    <mesh>
                        <sphereGeometry args={[0.07, 16, 16]} />
                        <meshStandardMaterial color="#27272a" roughness={0.3} metalness={0.8} />
                    </mesh>
                    {/* Shoulder pad armor */}
                    <mesh position={[0, 0.04, 0]}>
                        <sphereGeometry args={[0.09, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                        <meshStandardMaterial color="#ffffff" roughness={0.08} />
                    </mesh>
                    {/* Upper arm bone */}
                    <mesh position={[0.06, -0.16, 0]} rotation={[0, 0, -Math.PI / 12]}>
                        <capsuleGeometry args={[0.045, 0.16, 8, 16]} />
                        <meshStandardMaterial color="#ffffff" roughness={0.08} />
                    </mesh>
                    {/* Elbow joint */}
                    <group position={[0.09, -0.26, 0]}>
                        <mesh>
                            <sphereGeometry args={[0.045, 12, 12]} />
                            <meshStandardMaterial color="#27272a" roughness={0.3} metalness={0.8} />
                        </mesh>
                        {/* Forearm */}
                        <group ref={rightForearmRef} position={[0.03, -0.14, 0]} rotation={[0, 0, -Math.PI / 16]}>
                            <mesh>
                                <capsuleGeometry args={[0.04, 0.14, 8, 16]} />
                                <meshStandardMaterial color="#ffffff" roughness={0.08} />
                            </mesh>
                            {/* Wrist & Hand */}
                            <group ref={rightHandRef} position={[0, -0.12, 0]}>
                                <mesh>
                                    <boxGeometry args={[0.05, 0.02, 0.045]} />
                                    <meshStandardMaterial color="#27272a" roughness={0.3} />
                                </mesh>
                                {/* Articulated mechanical fingers */}
                                {renderFingers(1)}
                            </group>
                        </group>
                    </group>
                </group>
            </group>

            {/* 8. Left Leg (Hip assembly, thigh guard, knee disc, shin, ankle, wedge foot) */}
            <group ref={leftLegRef} position={[-0.14, -0.06, 0]}>
                <mesh>
                    <sphereGeometry args={[0.065, 16, 16]} />
                    <meshStandardMaterial color="#27272a" roughness={0.3} metalness={0.8} />
                </mesh>
                {/* Thigh */}
                <mesh position={[0, -0.2, 0]}>
                    <capsuleGeometry args={[0.06, 0.22, 8, 16]} />
                    <meshStandardMaterial color="#ffffff" roughness={0.08} />
                </mesh>
                {/* Knee */}
                <group position={[0, -0.34, 0.01]}>
                    <mesh>
                        <sphereGeometry args={[0.045, 12, 12]} />
                        <meshStandardMaterial color="#27272a" roughness={0.3} metalness={0.8} />
                    </mesh>
                    {/* Shin */}
                    <group ref={leftShinRef} position={[0, -0.16, -0.01]}>
                        <mesh>
                            <capsuleGeometry args={[0.045, 0.2, 8, 16]} />
                            <meshStandardMaterial color="#ffffff" roughness={0.08} />
                        </mesh>
                        {/* Ankle & Wedge mechanical foot */}
                        <group position={[0, -0.14, 0]}>
                            <mesh>
                                <sphereGeometry args={[0.035, 12, 12]} />
                                <meshStandardMaterial color="#27272a" roughness={0.4} />
                            </mesh>
                            {/* Wedge flat foot */}
                            <mesh position={[0, -0.06, 0.04]} rotation={[0.05, 0, 0]}>
                                <boxGeometry args={[0.08, 0.04, 0.16]} />
                                <meshStandardMaterial color="#ffffff" roughness={0.08} metalness={0.1} />
                            </mesh>
                        </group>
                    </group>
                </group>
            </group>

            {/* 9. Right Leg */}
            <group ref={rightLegRef} position={[0.14, -0.06, 0]}>
                <mesh>
                    <sphereGeometry args={[0.065, 16, 16]} />
                    <meshStandardMaterial color="#27272a" roughness={0.3} metalness={0.8} />
                </mesh>
                {/* Thigh */}
                <mesh position={[0, -0.2, 0]}>
                    <capsuleGeometry args={[0.06, 0.22, 8, 16]} />
                    <meshStandardMaterial color="#ffffff" roughness={0.08} />
                </mesh>
                {/* Knee */}
                <group position={[0, -0.34, 0.01]}>
                    <mesh>
                        <sphereGeometry args={[0.045, 12, 12]} />
                        <meshStandardMaterial color="#27272a" roughness={0.3} metalness={0.8} />
                    </mesh>
                    {/* Shin */}
                    <group ref={rightShinRef} position={[0, -0.16, -0.01]}>
                        <mesh>
                            <capsuleGeometry args={[0.045, 0.2, 8, 16]} />
                            <meshStandardMaterial color="#ffffff" roughness={0.08} />
                        </mesh>
                        {/* Ankle & Wedge mechanical foot */}
                        <group position={[0, -0.14, 0]}>
                            <mesh>
                                <sphereGeometry args={[0.035, 12, 12]} />
                                <meshStandardMaterial color="#27272a" roughness={0.4} />
                            </mesh>
                            {/* Wedge flat foot */}
                            <mesh position={[0, -0.06, 0.04]} rotation={[0.05, 0, 0]}>
                                <boxGeometry args={[0.08, 0.04, 0.16]} />
                                <meshStandardMaterial color="#ffffff" roughness={0.08} metalness={0.1} />
                            </mesh>
                        </group>
                    </group>
                </group>
            </group>

            {/* 10. Scanning Laser effect (Rendered only in scanning mode) */}
            {mood === 'scanning' && (
                <group position={[0, 0.15 + Math.sin(Date.now() * 0.005) * 0.4, 0]}>
                    {/* Glowing Plane */}
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.9, 0.9, 0.015, 32]} />
                        <meshBasicMaterial color={neonColor} transparent opacity={0.35} toneMapped={false} />
                    </mesh>
                    {/* Ring edge */}
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.9, 0.012, 8, 64]} />
                        <meshBasicMaterial color={neonColor} toneMapped={false} />
                    </mesh>
                </group>
            )}

            {/* 11. AI Screening Floating Match Score Card (screening mode) */}
            {mood === 'screening' && (
                <group position={[0, 0.95, 0.45]}>
                    <Html center>
                        <div style={{
                            background: 'rgba(9,9,11,0.96)',
                            border: `2px solid ${neonColor}`,
                            color: '#ffffff',
                            fontFamily: 'sans-serif',
                            fontWeight: 800,
                            padding: '8px 14px',
                            borderRadius: '20px',
                            boxShadow: `0 0 30px ${neonColor}60`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                            whiteSpace: 'nowrap',
                            userSelect: 'none',
                        }}>
                            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)' }}>Match Score</span>
                            <span style={{ fontSize: 18, color: neonColor }}>98.5%</span>
                        </div>
                    </Html>
                </group>
            )}
        </group>
    )
}

export default function FuturisticRobot3D({ mood = 'idle', active = false, height }) {
    const [hasWebGL, setHasWebGL] = useState(true)

    // Detect WebGL capability on mount
    useEffect(() => {
        try {
            const canvas = document.createElement('canvas')
            const supports = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
            setHasWebGL(supports)
        } catch (e) {
            setHasWebGL(false)
        }
    }, [])

    // Map dynamic height thresholds based on screens
    const getContainerHeight = () => {
        if (height) return height
        return {
            desktop: 640,
            tablet: 480,
            mobile: 340,
        }
    }
    
    const sizes = getContainerHeight()

    if (!hasWebGL) {
        return (
            <div style={{ height: '100%', minHeight: 280 }}>
                <MascotFallback mood={mood} active={active} />
            </div>
        )
    }

    const neonCyan = mood === 'sad' ? '#f43f5e' : (mood === 'happy' ? '#10b981' : '#00e5ff')

    return (
        <div 
            className="w-full relative robot-mascot-canvas-container"
            style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.03) 0%, transparent 80%)',
                borderRadius: '20px',
                overflow: 'hidden',
            }}
        >
            {/* Ambient Background Glimmer Particles */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                <Canvas camera={{ position: [0, 0.15, 2.1], fov: 42 }}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
                    
                    <Sparkles 
                        count={mood === 'loading' ? 120 : 60} 
                        scale={[2.2, 2.2, 2.2]} 
                        color={neonCyan} 
                        size={mood === 'loading' ? 3.5 : 2.5} 
                        speed={mood === 'loading' ? 2.5 : 1.2} 
                    />
                    
                    <group position={[0, -0.15, 0]}>
                        <RobotModel mood={mood} active={active} />
                    </group>
                    
                    {/* User controls camera rotation if desired */}
                    <OrbitControls 
                        enableZoom={false} 
                        enablePan={false}
                        maxPolarAngle={Math.PI / 2 + 0.1}
                        minPolarAngle={Math.PI / 3}
                        maxAzimuthAngle={Math.PI / 4}
                        minAzimuthAngle={-Math.PI / 4}
                    />
                </Canvas>
            </div>

            {/* Custom Responsive Height Rules */}
            <style>{`
                .robot-mascot-canvas-container {
                    height: ${typeof sizes === 'object' ? sizes.desktop : sizes}px;
                }
                @media (max-width: 1024px) {
                    .robot-mascot-canvas-container {
                        height: ${typeof sizes === 'object' ? sizes.tablet : sizes}px;
                    }
                }
                @media (max-width: 768px) {
                    .robot-mascot-canvas-container {
                        height: ${typeof sizes === 'object' ? sizes.mobile : sizes}px;
                    }
                }
            `}</style>
        </div>
    )
}
