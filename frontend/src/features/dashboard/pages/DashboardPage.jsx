import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
    Briefcase, FileText, TrendingUp, Users,
    ArrowRight, Plus, UploadCloud, Zap, Clock, CheckCircle2,
} from 'lucide-react'
import { useAuthStore } from '../../../shared/store/authStore'
import { jobsApi } from '../../jobs/api/jobsApi'
import { resumesApi } from '../../resumes/api/resumesApi'
import FuturisticRobot3D from '../../../shared/components/robot/FuturisticRobot3D'

/* ── Time-aware greeting ── */
function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
}

/* ── Gradient icon box ── */
function IconBox({ gradient, children, size = 40 }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: size * 0.28,
            background: gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
        }}>
            {children}
        </div>
    )
}

/* ── Stat Card ── */
function StatCard({ label, value, icon: Icon, gradient, sub, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.35, ease: 'easeOut' }}
            className="card card-hover"
            style={{ padding: 20, position: 'relative', overflow: 'hidden' }}
        >
            {/* Subtle glow bg */}
            <div style={{
                position: 'absolute', top: -30, right: -30, width: 100, height: 100,
                borderRadius: '50%',
                background: gradient.replace('linear-gradient(135deg,', 'radial-gradient(circle,').replace('100%)', '0%, transparent 70%)'),
                opacity: 0.4, pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <IconBox gradient={gradient} size={42}>
                    <Icon size={18} color="white" strokeWidth={2} />
                </IconBox>
            </div>
            <div className="stat-number">{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{sub}</div>}
        </motion.div>
    )
}

/* ── Quick Action ── */
function QuickAction({ icon: Icon, label, desc, to, gradient, delay }) {
    const navigate = useNavigate()
    return (
        <motion.button
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.3 }}
            onClick={() => navigate(to)}
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer', width: '100%',
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                transition: 'all 0.2s', textAlign: 'left',
            }}
            whileHover={{ y: -2, boxShadow: 'var(--shadow-md)', borderColor: 'var(--border-strong)' }}
            whileTap={{ scale: 0.99 }}
        >
            <IconBox gradient={gradient} size={36}>
                <Icon size={15} color="white" strokeWidth={2} />
            </IconBox>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
            </div>
            <ArrowRight size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
        </motion.button>
    )
}

const STATUS_BADGE = {
    UPLOADED: { label: 'Uploaded', bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b' },
    PARSED:   { label: 'Parsed',   bg: 'rgba(6,182,212,0.1)',   color: '#06b6d4' },
    SCREENED: { label: 'Screened', bg: 'rgba(16,185,129,0.1)',  color: '#10b981' },
    FAILED:   { label: 'Failed',   bg: 'rgba(244,63,94,0.1)',   color: '#f43f5e' },
}

export default function DashboardPage() {
    const { recruiterId, email } = useAuthStore()
    const navigate = useNavigate()
    const firstName = email?.split('@')[0] || 'Recruiter'

    const { data: jobsRes } = useQuery({
        queryKey: ['jobs', recruiterId],
        queryFn: () => jobsApi.getByRecruiter(recruiterId),
        enabled: !!recruiterId,
    })
    const { data: resumesRes } = useQuery({
        queryKey: ['resumes', recruiterId],
        queryFn: () => resumesApi.getByRecruiter(recruiterId),
        enabled: !!recruiterId,
    })

    const jobs    = jobsRes?.data    || []
    const resumes = resumesRes?.data || []
    const parsedCount   = resumes.filter(r => ['PARSED', 'SCREENED'].includes(r.status)).length

    const STATS = [
        { label: 'Active Jobs',     value: jobs.length,     icon: Briefcase,   gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', delay: 0 },
        { label: 'Total Resumes',   value: resumes.length,  icon: FileText,    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', delay: 0.05 },
        { label: 'Parsed & Indexed',value: parsedCount,     icon: TrendingUp,  gradient: 'linear-gradient(135deg, #10b981, #059669)', delay: 0.1 },
    ]

    return (
        <div>
            {/* ── Header ── */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Zap size={14} color="white" fill="white" />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Dashboard
                        </span>
                    </div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 4 }}>
                        {getGreeting()}, <span className="gradient-text">{firstName}</span> 👋
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Here's what's happening across your AI talent pipeline.
                    </p>
                </div>
                <div style={{ width: 180, height: 130, flexShrink: 0 }} className="hidden sm:block">
                    <FuturisticRobot3D mood="idle" height={130} />
                </div>
            </motion.div>

            {/* ── Stat cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 28 }}>
                {STATS.map(s => <StatCard key={s.label} {...s} />)}
            </div>

            {/* ── Bottom grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                {/* Recent Jobs */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Jobs</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{jobs.length} positions</div>
                        </div>
                        <button onClick={() => navigate('/jobs')} className="btn-ghost"
                            style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            View all <ArrowRight size={12} />
                        </button>
                    </div>
                    {jobs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '28px 0' }}>
                            <Briefcase size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 12px' }} />
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>No jobs yet</p>
                            <button onClick={() => navigate('/jobs')} className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}>
                                <Plus size={13} /> Post first job
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {jobs.slice(0, 5).map((job, idx) => (
                                <motion.button
                                    key={job.id}
                                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 + idx * 0.04 }}
                                    onClick={() => navigate(`/ranking/${job.id}`)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                                        border: 'none', background: 'var(--bg-tertiary)',
                                        transition: 'all 0.15s', textAlign: 'left',
                                    }}
                                    whileHover={{ background: 'var(--bg-glass-dark)', x: 2 }}
                                >
                                    <div style={{
                                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                        background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))',
                                        border: '1px solid rgba(6,182,212,0.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Briefcase size={13} style={{ color: '#06b6d4' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {job.title}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {job.minExperienceYears}y exp · {job.keySkills?.length || 0} skills
                                        </div>
                                    </div>
                                    <ArrowRight size={12} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                                </motion.button>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Quick actions */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Quick Actions</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>Jump right in</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <QuickAction icon={Plus}        label="Post a new job"   desc="Create a job description"       to="/jobs"    gradient="linear-gradient(135deg,#06b6d4,#0891b2)" delay={0.28} />
                        <QuickAction icon={UploadCloud} label="Upload resumes"   desc="Trigger AI ingestion pipeline"  to="/resumes" gradient="linear-gradient(135deg,#8b5cf6,#6d28d9)" delay={0.32} />
                        <QuickAction icon={TrendingUp}  label="View rankings"    desc="See ranked candidates"          to="/ranking" gradient="linear-gradient(135deg,#10b981,#059669)" delay={0.36} />
                    </div>
                </motion.div>
            </div>

            {/* ── Recent resumes ── */}
            {resumes.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="card" style={{ marginTop: 24, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Resumes</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{resumes.length} total</div>
                        </div>
                        <button onClick={() => navigate('/resumes')} className="btn-ghost"
                            style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            View all <ArrowRight size={12} />
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
                        {resumes.slice(0, 8).map((r, idx) => {
                            const badge = STATUS_BADGE[r.status] || { label: r.status, bg: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
                            const initials = (r.candidateName || '?').slice(0, 2).toUpperCase()
                            const hue = (r.id?.charCodeAt(0) || 50) * 137.5 % 360
                            return (
                                <motion.div
                                    key={r.id}
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 + idx * 0.03 }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '10px 12px', borderRadius: 10,
                                        background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                                    }}
                                >
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                        background: `hsl(${hue}, 60%, 55%)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>{initials}</span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {r.candidateName || 'Parsing...'}
                                        </div>
                                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600, background: badge.bg, color: badge.color }}>
                                            {badge.label}
                                        </span>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    )
}