import React from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { BarChart3, TrendingUp, FileText, Users, Activity } from 'lucide-react'
import { useAuthStore } from '../../../shared/store/authStore'
import { jobsApi } from '../../jobs/api/jobsApi'
import { resumesApi } from '../../resumes/api/resumesApi'
import { rankingApi } from '../../ranking/api/rankingApi'

const PALETTE = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e']

/* ── Custom tooltip ── */
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div style={{
            background: 'var(--bg-primary)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 12,
        }}>
            {label && <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5 }}>{label}</div>}
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    {p.name}: <strong style={{ color: 'var(--text-primary)' }}>{p.value}</strong>
                </div>
            ))}
        </div>
    )
}

export default function AnalyticsPage() {
    const { recruiterId } = useAuthStore()

    const { data: jobsRes }    = useQuery({ queryKey: ['jobs',    recruiterId], queryFn: () => jobsApi.getByRecruiter(recruiterId),    enabled: !!recruiterId })
    const { data: resumesRes } = useQuery({ queryKey: ['resumes', recruiterId], queryFn: () => resumesApi.getByRecruiter(recruiterId), enabled: !!recruiterId })

    const jobs    = jobsRes?.data    || []
    const resumes = resumesRes?.data || []

    /* ── Real derived analytics ── */
    const statusCounts = ['UPLOADED', 'PARSED', 'SCREENED', 'FAILED']
        .map(s => ({ name: s, value: resumes.filter(r => r.status === s).length }))
        .filter(d => d.value > 0)

    // Group resumes by job using actual data
    const resumesByJob = jobs.slice(0, 8).map(j => ({
        name: j.title.length > 18 ? j.title.slice(0, 18) + '…' : j.title,
        resumes: resumes.filter(r => r.jobId === j.id || r.jobDescriptionId === j.id).length,
    })).filter(d => d.resumes > 0)

    // Resumes grouped by upload date (last 7 days) using real data
    const uploadTrend = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        const dateStr = d.toISOString().split('T')[0]
        const dayResumes = resumes.filter(r => {
            const created = r.createdAt || r.uploadedAt || ''
            return created.startsWith(dateStr)
        })
        return {
            date: d.toLocaleDateString('en', { weekday: 'short' }),
            uploaded: dayResumes.length,
        }
    })

    const parsedCount   = resumes.filter(r => ['PARSED', 'SCREENED'].includes(r.status)).length
    const parseRate     = resumes.length > 0
        ? Math.round((parsedCount / resumes.length) * 100)
        : 0

    const STATS = [
        { label: 'Total Jobs',    value: jobs.length,    icon: BarChart3,  gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', delay: 0 },
        { label: 'Total Resumes', value: resumes.length, icon: FileText,   gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', delay: 0.06 },
        { label: 'Parse Rate',    value: `${parseRate}%`,icon: TrendingUp, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', delay: 0.18 },
    ]

    return (
        <div>
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Analytics</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                        Pipeline metrics and AI screening insights
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 20,
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                    fontSize: 11, fontWeight: 600, color: '#10b981',
                }}>
                    <Activity size={11} />
                    Live data
                </div>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 16, marginBottom: 28 }}>
                {STATS.map(s => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: s.delay }}
                        className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}
                    >
                        <div style={{
                            position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%',
                            background: s.gradient.replace('135deg', 'circle at 50% 50%').replace('linear', 'radial'),
                            opacity: 0.15, pointerEvents: 'none',
                        }} />
                        <div style={{
                            width: 38, height: 38, borderRadius: 11, marginBottom: 14,
                            background: s.gradient,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 4px 14px ${s.gradient.includes('06b6d4') ? 'rgba(6,182,212,0.35)' : s.gradient.includes('8b5cf6') ? 'rgba(139,92,246,0.35)' : s.gradient.includes('10b981') ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`,
                        }}>
                            <s.icon size={17} color="white" strokeWidth={2} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.04em' }}>
                            {s.value}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, fontWeight: 500 }}>{s.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Charts row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

                {/* Status Pie */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="card" style={{ padding: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Resume Status Distribution</h3>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Breakdown of your screening pipeline</p>
                    {statusCounts.length === 0 ? (
                        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            No resume data yet
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={statusCounts} dataKey="value" nameKey="name"
                                    cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                                    paddingAngle={3}
                                >
                                    {statusCounts.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    formatter={(value) => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </motion.div>

                {/* Resumes per Job Bar */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="card" style={{ padding: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Candidates per Job</h3>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Resume count matched to each job</p>
                    {resumesByJob.length === 0 ? (
                        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            No job-resume mappings yet
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={resumesByJob} margin={{ top: 0, right: 0, left: -24, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} angle={-30} textAnchor="end" interval={0} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="resumes" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Resumes" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </motion.div>
            </div>

            {/* Upload trend line */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Upload Trend — Last 7 Days</h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Daily resume uploads and AI screenings</p>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={uploadTrend} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend formatter={(value) => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{value}</span>} />
                        <Line type="monotone" dataKey="uploaded" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3, fill: '#06b6d4' }} activeDot={{ r: 5 }} name="Uploaded" />
                    </LineChart>
                </ResponsiveContainer>
            </motion.div>
        </div>
    )
}