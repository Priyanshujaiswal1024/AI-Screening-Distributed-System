import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
    Zap, Mail, Lock, User, Building2,
    ArrowRight, RefreshCw, KeyRound, Eye, EyeOff,
    Brain, Cpu, GitMerge, Shield,
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../../../shared/store/authStore'
import FuturisticRobot3D from '../../../shared/components/robot/FuturisticRobot3D'

/* ── Animated background orbs ── */
function BackgroundOrbs() {
    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{
                position: 'absolute', width: 500, height: 500, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
                top: '-100px', left: '-100px', animation: 'float 8s ease-in-out infinite',
            }} />
            <div style={{
                position: 'absolute', width: 400, height: 400, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
                bottom: '-80px', right: '-60px', animation: 'float 10s ease-in-out infinite reverse',
            }} />
            <div style={{
                position: 'absolute', width: 250, height: 250, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
                top: '50%', left: '60%', animation: 'float 12s ease-in-out infinite',
                animationDelay: '-3s',
            }} />
        </div>
    )
}

/* ── Feature card for left panel ── */
function FeatureCard({ icon: Icon, title, desc, color, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.4 }}
            style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(8px)',
            }}
        >
            <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: `${color}18`,
                border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={16} style={{ color }} />
            </div>
            <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{desc}</div>
            </div>
        </motion.div>
    )
}

/* ── Robot face SVG ── */
function RobotFace({ mood = 'idle', active = false }) {
    const colors = {
        idle:     { eye: '#06b6d4', bg: '#0e1117' },
        happy:    { eye: '#10b981', bg: '#051a10' },
        sad:      { eye: '#f43f5e', bg: '#1a0507' },
        thinking: { eye: '#8b5cf6', bg: '#0d0814' },
    }
    const { eye, bg } = colors[mood] || colors.idle
    return (
        <svg width="80" height="80" viewBox="0 0 96 96" fill="none">
            <rect x="18" y="28" width="60" height="52" rx="14" fill={bg} stroke={eye} strokeWidth="1.5" />
            <line x1="48" y1="28" x2="48" y2="14" stroke={eye} strokeWidth="2" strokeLinecap="round" />
            <circle cx="48" cy="11" r="4" fill={eye} opacity={active ? 1 : 0.6}>
                {active && <animate attributeName="opacity" values="0.4;1;0.4" dur="0.9s" repeatCount="indefinite" />}
            </circle>
            <rect x="10" y="40" width="8" height="14" rx="3" fill={bg} stroke={eye} strokeWidth="1.5" />
            <rect x="78" y="40" width="8" height="14" rx="3" fill={bg} stroke={eye} strokeWidth="1.5" />
            <circle cx="36" cy="50" r="7" fill={eye} opacity="0.9">
                {active && <animate attributeName="opacity" values="0.5;1;0.5" dur="0.6s" repeatCount="indefinite" />}
            </circle>
            <circle cx="60" cy="50" r="7" fill={eye} opacity="0.9">
                {active && <animate attributeName="opacity" values="0.5;1;0.5" dur="0.6s" repeatCount="indefinite" begin="0.1s" />}
            </circle>
            <circle cx="38" cy="48" r="2.5" fill="#000" opacity="0.6" />
            <circle cx="62" cy="48" r="2.5" fill="#000" opacity="0.6" />
            {mood === 'happy'
                ? <path d="M36 68 Q48 76 60 68" stroke={eye} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                : mood === 'sad'
                    ? <path d="M36 72 Q48 64 60 72" stroke={eye} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    : <rect x="36" y="69" width="24" height="3" rx="1.5" fill={eye} opacity="0.7" />
            }
        </svg>
    )
}

/* ── Styled input with icon ── */
function IconInput({ icon: Icon, type = 'text', placeholder, register, error, autoFocus, showToggle }) {
    const [show, setShow] = useState(false)
    const inputType = showToggle ? (show ? 'text' : 'password') : type
    return (
        <div style={{ position: 'relative' }}>
            <Icon size={14} style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1,
            }} />
            <input
                {...register}
                type={inputType}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className="input"
                style={{ paddingLeft: 36, paddingRight: showToggle ? 40 : 14 }}
            />
            {showToggle && (
                <button
                    type="button"
                    onClick={() => setShow(v => !v)}
                    style={{
                        position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: 2,
                        display: 'flex', alignItems: 'center',
                    }}
                >
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            )}
            {error && <p style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>{error.message}</p>}
        </div>
    )
}

const slideVariants = {
    enter:  { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit:   { opacity: 0, x: -20 },
}

const FEATURES = [
    { icon: Brain,    color: '#06b6d4', title: 'RAG-Powered Screening',  desc: 'Semantic resume analysis using pgvector embeddings' },
    { icon: Cpu,      color: '#8b5cf6', title: 'AI Candidate Scoring',   desc: 'Ollama + Spring AI for intelligent match scoring' },
    { icon: GitMerge, color: '#10b981', title: 'Event-Driven Pipeline',  desc: 'Kafka-powered async processing at scale' },
    { icon: Shield,   color: '#f59e0b', title: 'Secure & Compliant',     desc: 'JWT auth with OTP verification flow' },
]

export default function AuthPage() {
    const [step, setStep]           = useState('login')
    const [pendingEmail, setPending] = useState('')
    const [robotMood, setMood]       = useState('idle')

    const { login } = useAuthStore()
    const navigate  = useNavigate()


    const { register, handleSubmit, formState: { errors }, reset, getValues } = useForm()

    /* ── Mutations ── */
    const loginMut = useMutation({
        mutationFn: authApi.login,
        onSuccess: (res) => {
            const d = res.data
            login({ accessToken: d.accessToken, userId: d.userId, role: d.role, email: getValues('email'), recruiterId: d.userId })
            setMood('happy')
            toast.success('Welcome back! 🎉')
            navigate('/dashboard')
        },
        onError: (err) => { 
            setMood('sad'); 
            if (err.response?.status === 403 || err.response?.status === 401) {
                toast.error('Invalid email or password');
            } else {
                toast.error(err.response?.data?.message || 'Login failed');
            }
        },
    })

    const signupMut = useMutation({
        mutationFn: authApi.sendSignupOtp,
        onSuccess: (_, vars) => { setPending(vars.email); setStep('verify'); setMood('happy'); toast.success('OTP sent — check your inbox'); reset() },
        onError: (err)       => { setMood('sad'); toast.error(err.response?.data?.message || 'Signup failed') },
    })

    const verifyMut = useMutation({
        mutationFn: authApi.verifyOtp,
        onSuccess: (res) => {
            const d = res.data
            login({ accessToken: d.accessToken, userId: d.userId, role: d.role, email: pendingEmail, recruiterId: d.userId })
            toast.success('Account verified! Welcome 🎉')
            navigate('/dashboard')
        },
        onError: () => { setMood('sad'); toast.error('Invalid or expired OTP') },
    })

    const forgotMut = useMutation({
        mutationFn: (data) => authApi.forgotPassword(data.email),
        onSuccess: (_, vars) => { setPending(vars.email); toast.success('Reset OTP sent'); setStep('reset'); reset() },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to send OTP'),
    })

    const resetMut = useMutation({
        mutationFn: authApi.resetPassword,
        onSuccess: () => { toast.success('Password reset! Please sign in.'); setStep('login'); reset() },
        onError: (err) => toast.error(err.response?.data?.message || 'Reset failed'),
    })

    const isLoading = loginMut.isPending || signupMut.isPending || verifyMut.isPending || forgotMut.isPending || resetMut.isPending

    useEffect(() => {
        if (isLoading) {
            setMood('loading')
        } else {
            const timer = setTimeout(() => {
                if (step === 'verify' || step === 'reset') {
                    setMood('thinking')
                } else if (step === 'login' || step === 'signup') {
                    setMood('welcome')
                } else {
                    setMood('idle')
                }
            }, robotMood === 'happy' || robotMood === 'sad' ? 2500 : 0)
            return () => clearTimeout(timer)
        }
    }, [step, isLoading])

    const onSubmit = (data) => {
        setMood('thinking')
        if (step === 'login')  loginMut.mutate(data)
        if (step === 'signup') signupMut.mutate(data)
        if (step === 'verify') verifyMut.mutate({ email: pendingEmail, otp: data.otp })
        if (step === 'forgot') forgotMut.mutate(data)
        if (step === 'reset')  resetMut.mutate({ email: pendingEmail, otp: data.otp, newPassword: data.newPassword })
    }

    const stepMeta = {
        login:  { title: 'Welcome back',      sub: 'Sign in to your recruiter account' },
        signup: { title: 'Create account',    sub: 'Start AI-powered talent screening today' },
        verify: { title: 'Check your email',  sub: `Enter the 6-digit code sent to ${pendingEmail}` },
        forgot: { title: 'Forgot password',   sub: 'Enter your email to receive a reset code' },
        reset:  { title: 'Reset password',    sub: `Enter the OTP sent to ${pendingEmail}` },
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: '#070a10', position: 'relative', overflow: 'hidden' }}>
            <BackgroundOrbs />

            {/* ── Left panel (desktop) ── */}
            <div className="hidden lg:flex lg:flex-col" style={{
                width: 440, flexShrink: 0,
                background: 'linear-gradient(160deg, #0a0d18 0%, #0d1020 50%, #090b15 100%)',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                padding: '40px 44px',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Panel glow */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'radial-gradient(ellipse at 30% 30%, rgba(6,182,212,0.07) 0%, transparent 60%)',
                }} />

                {/* Logo */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 11,
                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(6,182,212,0.4)',
                    }}>
                        <Zap size={20} color="white" strokeWidth={2.5} fill="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.03em' }}>TalentIQ</div>
                        <div style={{ fontSize: 9, color: 'rgba(6,182,212,0.7)', fontWeight: 700, letterSpacing: '0.1em' }}>AI SCREENING PLATFORM</div>
                    </div>
                </motion.div>

                {/* Center content */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        style={{ marginBottom: 32 }}
                    >
                        <div style={{ marginBottom: 24 }}>
                            <FuturisticRobot3D mood={robotMood} active={isLoading} height={220} />
                        </div>
                        <h1 style={{
                            fontSize: 30, fontWeight: 900, lineHeight: 1.15, marginBottom: 12,
                            letterSpacing: '-0.04em',
                        }}>
                            <span style={{ color: '#fff' }}>AI-Powered</span>{' '}
                            <span style={{
                                background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                            }}>Talent Intelligence.</span>
                        </h1>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 300 }}>
                            Screen hundreds of resumes semantically using pgvector embeddings, RAG pipelines, and multi-model AI scoring.
                        </p>
                    </motion.div>

                    {/* Feature cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {FEATURES.map((f, i) => (
                            <FeatureCard key={f.title} {...f} delay={0.3 + i * 0.07} />
                        ))}
                    </div>
                </div>

                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', position: 'relative', zIndex: 1 }}>
                    © 2025 TalentIQ Platform
                </p>
            </div>

            {/* ── Right form panel ── */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '32px 24px', position: 'relative', zIndex: 1,
            }}>
                <div style={{ width: '100%', maxWidth: 400 }}>

                    {/* Mobile logo */}
                    <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 9,
                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(6,182,212,0.4)',
                        }}>
                            <Zap size={16} color="white" fill="white" />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>TalentIQ</span>
                    </div>

                    {/* Form card */}
                    <div style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 20,
                        padding: '32px 32px',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                    }}>

                        {/* Step header */}
                        <AnimatePresence mode="wait">
                            <motion.div key={step + '-h'} variants={slideVariants} initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.16 }} style={{ marginBottom: 24 }}>
                                <h2 style={{
                                    fontSize: 22, fontWeight: 800, color: '#fff',
                                    letterSpacing: '-0.03em', marginBottom: 5,
                                }}>
                                    {stepMeta[step].title}
                                </h2>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{stepMeta[step].sub}</p>
                            </motion.div>
                        </AnimatePresence>

                        {/* Form */}
                        <AnimatePresence mode="wait">
                            <motion.form key={step} variants={slideVariants} initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.16 }}
                                onSubmit={handleSubmit(onSubmit)}
                                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                                {/* Dark-themed input override for auth page */}
                                <style>{`
                                    .auth-input {
                                        width: 100%;
                                        background: rgba(255,255,255,0.06);
                                        border: 1px solid rgba(255,255,255,0.1);
                                        border-radius: 10px;
                                        padding: 10px 14px;
                                        color: #fff;
                                        font-size: 13px;
                                        font-family: inherit;
                                        transition: border-color 0.2s, box-shadow 0.2s;
                                        outline: none;
                                    }
                                    .auth-input::placeholder { color: rgba(255,255,255,0.25); }
                                    .auth-input:focus {
                                        border-color: rgba(6,182,212,0.6);
                                        box-shadow: 0 0 0 3px rgba(6,182,212,0.1);
                                    }
                                    .auth-label {
                                        display: block;
                                        font-size: 12px;
                                        font-weight: 600;
                                        color: rgba(255,255,255,0.5);
                                        margin-bottom: 6px;
                                    }
                                    .auth-icon-wrap { position: relative; }
                                    .auth-icon-wrap > svg {
                                        position: absolute; left: 12px; top: 50%;
                                        transform: translateY(-50%);
                                        color: rgba(255,255,255,0.3);
                                        pointer-events: none;
                                    }
                                    .auth-icon-wrap .auth-input { padding-left: 36px; }
                                    .auth-err { font-size: 11px; color: #f43f5e; margin-top: 4px; }
                                `}</style>

                                {/* LOGIN */}
                                {step === 'login' && <>
                                    <div>
                                        <label className="auth-label">Email</label>
                                        <div className="auth-icon-wrap">
                                            <Mail size={14} />
                                            <input className="auth-input" type="email" placeholder="you@company.com"
                                                {...register('email', { required: 'Email is required' })} autoFocus />
                                        </div>
                                        {errors.email && <p className="auth-err">{errors.email.message}</p>}
                                    </div>
                                    <div>
                                        <label className="auth-label">Password</label>
                                        <div className="auth-icon-wrap" style={{ position: 'relative' }}>
                                            <Lock size={14} />
                                            <PasswordInput register={register('password', { required: 'Password required' })} />
                                        </div>
                                        {errors.password && <p className="auth-err">{errors.password.message}</p>}
                                    </div>
                                    <div style={{ textAlign: 'right', marginTop: -6 }}>
                                        <button type="button" onClick={() => { setStep('forgot'); reset() }}
                                            style={{ fontSize: 12, color: '#06b6d4', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                            Forgot password?
                                        </button>
                                    </div>
                                </>}

                                {/* SIGNUP */}
                                {step === 'signup' && <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        <div>
                                            <label className="auth-label">Full name</label>
                                            <div className="auth-icon-wrap">
                                                <User size={14} />
                                                <input className="auth-input" placeholder="Jane Doe"
                                                    {...register('fullName', { required: 'Required' })} autoFocus />
                                            </div>
                                            {errors.fullName && <p className="auth-err">{errors.fullName.message}</p>}
                                        </div>
                                        <div>
                                            <label className="auth-label">Company</label>
                                            <div className="auth-icon-wrap">
                                                <Building2 size={14} />
                                                <input className="auth-input" placeholder="Acme Corp"
                                                    {...register('companyName', { required: 'Required' })} />
                                            </div>
                                            {errors.companyName && <p className="auth-err">{errors.companyName.message}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="auth-label">Email</label>
                                        <div className="auth-icon-wrap">
                                            <Mail size={14} />
                                            <input className="auth-input" type="email" placeholder="jane@acme.com"
                                                {...register('email', { required: 'Required' })} />
                                        </div>
                                        {errors.email && <p className="auth-err">{errors.email.message}</p>}
                                    </div>
                                    <div>
                                        <label className="auth-label">Password</label>
                                        <div className="auth-icon-wrap" style={{ position: 'relative' }}>
                                            <Lock size={14} />
                                            <PasswordInput
                                                register={register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
                                            />
                                        </div>
                                        {errors.password && <p className="auth-err">{errors.password.message}</p>}
                                    </div>
                                    <div>
                                        <label className="auth-label">Phone <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>(optional)</span></label>
                                        <input className="auth-input" placeholder="+91 98765 43210" {...register('phone')} />
                                    </div>
                                </>}

                                {/* VERIFY OTP */}
                                {step === 'verify' && (
                                    <div>
                                        <label className="auth-label">6-digit OTP</label>
                                        <input className="auth-input" placeholder="000000" maxLength={6} inputMode="numeric" autoFocus
                                            style={{ textAlign: 'center', letterSpacing: '0.6em', fontWeight: 800, fontSize: 22 }}
                                            {...register('otp', { required: 'Required', minLength: { value: 6, message: 'Enter full 6-digit code' } })} />
                                        {errors.otp && <p className="auth-err">{errors.otp.message}</p>}
                                        <button type="button" onClick={() => signupMut.mutate({ email: pendingEmail })}
                                            style={{ fontSize: 12, color: '#06b6d4', background: 'none', border: 'none', cursor: 'pointer', marginTop: 10, fontWeight: 600 }}>
                                            Resend code
                                        </button>
                                    </div>
                                )}

                                {/* FORGOT */}
                                {step === 'forgot' && (
                                    <div>
                                        <label className="auth-label">Email address</label>
                                        <div className="auth-icon-wrap">
                                            <Mail size={14} />
                                            <input className="auth-input" type="email" placeholder="your@email.com"
                                                {...register('email', { required: 'Required' })} autoFocus />
                                        </div>
                                        {errors.email && <p className="auth-err">{errors.email.message}</p>}
                                    </div>
                                )}

                                {/* RESET */}
                                {step === 'reset' && <>
                                    <div>
                                        <label className="auth-label">OTP code</label>
                                        <div className="auth-icon-wrap">
                                            <KeyRound size={14} />
                                            <input className="auth-input" placeholder="6-digit code" maxLength={6}
                                                {...register('otp', { required: 'Required' })} autoFocus />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="auth-label">New password</label>
                                        <div className="auth-icon-wrap" style={{ position: 'relative' }}>
                                            <Lock size={14} />
                                            <PasswordInput
                                                register={register('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
                                            />
                                        </div>
                                        {errors.newPassword && <p className="auth-err">{errors.newPassword.message}</p>}
                                    </div>
                                </>}

                                {/* Submit button */}
                                <button type="submit" disabled={isLoading}
                                    style={{
                                        width: '100%', padding: '12px', marginTop: 4,
                                        background: isLoading ? 'rgba(6,182,212,0.4)' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                        border: 'none', borderRadius: 10, cursor: isLoading ? 'not-allowed' : 'pointer',
                                        color: 'white', fontSize: 14, fontWeight: 700,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        boxShadow: isLoading ? 'none' : '0 4px 16px rgba(6,182,212,0.35)',
                                        transition: 'all 0.2s',
                                    }}>
                                    {isLoading
                                        ? <RefreshCw size={16} className="animate-spin" />
                                        : <>
                                            {step === 'login'  && 'Sign in'}
                                            {step === 'signup' && 'Send verification code'}
                                            {step === 'verify' && 'Verify & create account'}
                                            {step === 'forgot' && 'Send reset code'}
                                            {step === 'reset'  && 'Reset password'}
                                            <ArrowRight size={16} />
                                        </>
                                    }
                                </button>
                            </motion.form>
                        </AnimatePresence>

                        {/* Footer nav */}
                        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                            {step === 'login' && (
                                <span>No account?{' '}
                                    <button type="button" onClick={() => { setStep('signup'); reset() }}
                                        style={{ color: '#06b6d4', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                                        Sign up free
                                    </button>
                                </span>
                            )}
                            {(step === 'signup' || step === 'verify') && (
                                <span>Already have an account?{' '}
                                    <button type="button" onClick={() => { setStep('login'); reset() }}
                                        style={{ color: '#06b6d4', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                                        Sign in
                                    </button>
                                </span>
                            )}
                            {(step === 'forgot' || step === 'reset') && (
                                <button type="button" onClick={() => { setStep('login'); reset() }}
                                    style={{ color: '#06b6d4', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                                    ← Back to sign in
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ── Password input with show/hide ── */
function PasswordInput({ register }) {
    const [show, setShow] = useState(false)
    return (
        <>
            <input
                {...register}
                type={show ? 'text' : 'password'}
                placeholder="••••••••"
                className="auth-input"
                style={{ paddingLeft: 36, paddingRight: 40 }}
            />
            <button type="button" onClick={() => setShow(v => !v)}
                style={{
                    position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.3)', display: 'flex', padding: 2,
                }}>
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
        </>
    )
}