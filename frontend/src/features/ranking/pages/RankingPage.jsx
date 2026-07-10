import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
    TrendingUp, ChevronDown, CheckCircle2, AlertCircle,
    MessageSquare, X, RefreshCw, Star, Award, Crown,
    Medal, Zap, Calendar, Send, Users, Mail,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { rankingApi } from '../api/rankingApi'
import { jobsApi } from '../../jobs/api/jobsApi'
import { interviewApi } from '../../interviews/api/interviewApi'
import { useAuthStore } from '../../../shared/store/authStore'
import { useRobotStore } from '../../../shared/store/robotStore'
import FuturisticRobot3D from '../../../shared/components/robot/FuturisticRobot3D'

/* ── Radial score ring ── */
function ScoreRing({ score, size = 56 }) {
    const color   = score > 75 ? '#10b981' : score > 50 ? '#06b6d4' : '#f59e0b'
    const radius  = (size - 8) / 2
    const circ    = 2 * Math.PI * radius
    const dash    = (score / 100) * circ
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth={5} />
                <motion.circle
                    cx={size/2} cy={size/2} r={radius} fill="none"
                    stroke={color} strokeWidth={5}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ - dash }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: size * 0.2, fontWeight: 800, color,
            }}>
                {score.toFixed(0)}
            </div>
        </div>
    )
}

/* ── Linear score bar ── */
function ScoreBar({ score }) {
    const color = score > 75 ? '#10b981' : score > 50 ? '#06b6d4' : '#f59e0b'
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 72, height: 5, background: 'var(--bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    style={{ height: '100%', background: color, borderRadius: 99 }}
                />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36 }}>{score.toFixed(1)}%</span>
        </div>
    )
}

/* ── Rank badge ── */
function RankBadge({ rank }) {
    if (rank === 0) return <Crown size={16} style={{ color: '#f59e0b' }} />
    if (rank === 1) return <Medal size={16} style={{ color: '#94a3b8' }} />
    if (rank === 2) return <Medal size={16} style={{ color: '#92400e' }} />
    return <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>#{rank + 1}</span>
}

/* ── Candidate drawer (Centered Modal Card) ── */
function CandidateDrawer({ candidate, onClose, jobId, jobTitle }) {
    const navigate = useNavigate()
    const { setContext } = useRobotStore()
    const [tab, setTab]                     = useState('summary')
    const [showSingleInvite, setShowSingle] = useState(false)

    useEffect(() => {
        if (candidate) setContext({ jobId, resumeId: candidate.resumeId })
    }, [candidate, jobId])

    if (!candidate) return null

    const strengths = typeof candidate.strengths === 'string'
        ? candidate.strengths.replace('Matched strengths: ', '').replace('Matched skills: ', '').split(',').map(s => s.trim()).filter(Boolean)
        : []
    const gaps = typeof candidate.skillGaps === 'string'
        ? candidate.skillGaps.replace('Missing skills: ', '').replace('Missing skills:', '').split(',').map(s => s.trim()).filter(Boolean)
        : []
    const score      = candidate.matchScore || 0
    const scoreColor = score > 75 ? '#10b981' : score > 50 ? '#06b6d4' : '#f59e0b'
    const initials   = (candidate.candidateName || '?').slice(0, 2).toUpperCase()
    const hue        = candidate.candidateName?.charCodeAt(0) * 137.5 % 360 || 200

    return (
    <>
        <motion.div
            initial={{ scale: 0.9, opacity: 0, x: '-50%', y: '-50%' }}
            animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
            exit={{ scale: 0.9, opacity: 0, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            style={{
                position: 'fixed', top: '50%', left: '50%',
                width: 'min(760px, 95vw)', height: 'min(820px, 85vh)',
                background: 'var(--bg-primary)',
                borderRadius: '20px', border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
        >
            {/* Drawer header */}
            <div style={{
                padding: '24px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-tertiary)',
                display: 'flex', gap: 24, alignItems: 'center'
            }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Candidate identity */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                                background: `linear-gradient(135deg, hsl(${hue},60%,55%), hsl(${(hue+40)%360},70%,45%))`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 4px 16px hsla(${hue},60%,50%,0.4)`,
                                fontSize: 20, fontWeight: 800, color: 'white',
                            }}>
                                {initials}
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 2 }}>
                                    {candidate.candidateName}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{candidate.candidateEmail}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => navigate(`/chat?jobId=${jobId}&resumeId=${candidate.resumeId}`)}
                                className="btn-secondary" style={{ padding: '7px 14px', fontSize: 12 }}
                            >
                                <MessageSquare size={13} /> Chat about
                            </button>
                            <motion.button
                                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                onClick={() => setShowSingle(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                    border: 'none', cursor: 'pointer',
                                    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                                    color: 'white', boxShadow: '0 3px 10px rgba(99,102,241,0.35)',
                                }}
                            >
                                <Mail size={13} /> Send Invite
                            </motion.button>
                        </div>
                    </div>

                    {/* Score metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        {[
                            { label: 'Match Score',  value: `${score.toFixed(1)}%`,    color: scoreColor },
                            { label: 'Rank',         value: `#${candidate.candidateRank || '—'}`, color: 'var(--text-primary)' },
                            { label: 'Confidence',   value: `${((candidate.confidenceScore || 0)*100).toFixed(0)}%`, color: '#8b5cf6' },
                        ].map(m => (
                            <div key={m.label} style={{
                                background: 'var(--bg-primary)', borderRadius: 12,
                                border: '1px solid var(--border)', padding: '10px 14px', textAlign: 'center',
                                boxShadow: 'var(--shadow-sm)',
                            }}>
                                <div style={{ fontSize: 20, fontWeight: 800, color: m.color, lineHeight: 1, marginBottom: 4 }}>
                                    {m.value}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>
                                    {m.label.toUpperCase()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right side: 3D Robot Mascot and Close Button */}
                <div style={{ width: 220, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: 6, position: 'absolute', top: 0, right: 0, zIndex: 10 }}><X size={16} /></button>
                    <div style={{ width: '100%', height: 130, borderRadius: 14, overflow: 'hidden', background: 'var(--bg-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FuturisticRobot3D mood="screening" height={130} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                {[['summary', 'Summary'], ['skills', 'Skills'], ['checklist', 'Match Checklist'], ['report', 'Full Report']].map(([k, l]) => (
                    <button key={k} onClick={() => setTab(k)} style={{
                        flex: 1, padding: '11px 0', fontSize: 12, fontWeight: 600,
                        border: 'none', background: 'none', cursor: 'pointer',
                        color: tab === k ? 'var(--brand)' : 'var(--text-muted)',
                        borderBottom: `2px solid ${tab === k ? 'var(--brand)' : 'transparent'}`,
                        transition: 'all 0.15s',
                    }}>{l}</button>
                ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                <AnimatePresence mode="wait">
                    <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                        {/* SUMMARY */}
                        {tab === 'summary' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {candidate.structuredSummary && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>AI Summary</div>
                                        <p style={{
                                            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65,
                                            background: 'var(--bg-tertiary)', padding: '12px 14px',
                                            borderRadius: 10, border: '1px solid var(--border)',
                                        }}>
                                            {candidate.structuredSummary}
                                        </p>
                                    </div>
                                )}
                                {strengths.length > 0 && (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                            <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strengths</span>
                                        </div>
                                        <ul style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {strengths.map((s, i) => (
                                                <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 10, display: 'flex', gap: 7 }}>
                                                    <span style={{ color: '#10b981', flexShrink: 0 }}>•</span>{s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {gaps.length > 0 && (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                            <AlertCircle size={13} style={{ color: '#f59e0b' }} />
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skill Gaps</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {gaps.map((g, i) => (
                                                <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: 'rgba(245,158,11,0.08)', color: '#92400e', border: '1px solid rgba(245,158,11,0.2)' }}>
                                                    {g}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SKILLS */}
                        {tab === 'skills' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Overall match</span>
                                        <span style={{ fontSize: 15, fontWeight: 800, color: scoreColor }}>{score.toFixed(1)}%</span>
                                    </div>
                                    <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
                                        <motion.div
                                            initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8 }}
                                            style={{ height: '100%', background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}99)`, borderRadius: 99 }}
                                        />
                                    </div>
                                </div>
                                {strengths.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Matched Skills</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {strengths.map((s, i) => (
                                                <span key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, background: 'rgba(16,185,129,0.08)', color: '#065f46', border: '1px solid rgba(16,185,129,0.2)', fontWeight: 600 }}>
                                                    ✓ {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {gaps.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Missing Skills</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {gaps.map((g, i) => (
                                                <span key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, background: 'rgba(244,63,94,0.06)', color: '#9f1239', border: '1px solid rgba(244,63,94,0.15)', fontWeight: 600 }}>
                                                    ✗ {g}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CHECKLIST */}
                        {tab === 'checklist' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                                    Job Description Requirements Evaluation
                                </div>
                                {(() => {
                                    let checklist = [];
                                    if (candidate.requirementsChecklist) {
                                        try {
                                            checklist = JSON.parse(candidate.requirementsChecklist);
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }
                                    if (checklist.length === 0) {
                                        return (
                                            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                Checklist data not available for this screening report.
                                            </p>
                                        );
                                    }
                                    const matched = checklist.filter(item => item.status === 'Matched');
                                    const missing = checklist.filter(item => item.status !== 'Matched');

                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                            {/* Matched Requirements */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                                                    <CheckCircle2 size={14} /> Matched ({matched.length})
                                                </div>
                                                {matched.length === 0 ? (
                                                    <p style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>No matched requirements found.</p>
                                                ) : (
                                                    matched.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                padding: '10px 14px',
                                                                borderRadius: '10px',
                                                                background: 'rgba(16,185,129,0.05)',
                                                                border: '1px solid rgba(16,185,129,0.15)',
                                                                fontSize: 13,
                                                                color: 'var(--text-primary)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 8,
                                                            }}
                                                        >
                                                            <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                                                            <span style={{ fontWeight: 600 }}>{item.requirement}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {/* Missing Requirements */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                                                    <X size={14} style={{ strokeWidth: 3 }} /> Missing / Gaps ({missing.length})
                                                </div>
                                                {missing.length === 0 ? (
                                                    <p style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>No missing requirements.</p>
                                                ) : (
                                                    missing.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                padding: '10px 14px',
                                                                borderRadius: '10px',
                                                                background: 'rgba(244,63,94,0.04)',
                                                                border: '1px solid rgba(244,63,94,0.12)',
                                                                fontSize: 13,
                                                                color: 'var(--text-primary)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 8,
                                                            }}
                                                        >
                                                            <span style={{ color: '#f43f5e', fontWeight: 800 }}>✗</span>
                                                            <span style={{ fontWeight: 600 }}>{item.requirement}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* REPORT */}
                        {tab === 'report' && (
                            <div>
                                <div style={{
                                    padding: '14px 16px', borderRadius: 10, marginBottom: 14,
                                    background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                                    fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8,
                                }}>
                                    <strong>Candidate:</strong> {candidate.candidateName}<br />
                                    <strong>Email:</strong> {candidate.candidateEmail}<br />
                                    <strong>Match Score:</strong> <span style={{ color: scoreColor, fontWeight: 700 }}>{score.toFixed(2)}%</span><br />
                                    <strong>Confidence:</strong> {((candidate.confidenceScore || 0) * 100).toFixed(1)}%<br />
                                    <strong>Rank:</strong> #{candidate.candidateRank || '—'}
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                                    {candidate.structuredSummary}
                                </p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>

        {/* Single Invite Modal — opens above the drawer */}
        <AnimatePresence>
            {showSingleInvite && (
                <SingleInviteModal
                    candidate={candidate}
                    jobTitle={jobTitle}
                    onClose={() => setShowSingle(false)}
                />
            )}
        </AnimatePresence>
    </>
    )
}

/* ── Single Candidate Invite Modal ── */
function SingleInviteModal({ candidate, jobTitle, onClose }) {
    const [interviewDate, setDate] = useState('')
    const [interviewTime, setTime] = useState('10:00')
    const [interviewMode, setMode] = useState('ONLINE')
    const [meetingLink, setLink]   = useState('')
    const [notes, setNotes]        = useState('')
    const [sent, setSent]          = useState(false)

    const sendMutation = useMutation({
        mutationFn: () => interviewApi.schedule({
            candidateEmail: candidate.candidateEmail,
            candidateName:  candidate.candidateName,
            jobTitle,
            interviewDate,
            interviewTime:  interviewTime + ':00',
            interviewMode,
            meetingLink:    (interviewMode === 'ONLINE' || interviewMode === 'HYBRID') ? meetingLink : null,
            notes,
            resumeId:       candidate.resumeId,
        }),
        onSuccess: () => setSent(true),
        onError:   () => toast.error('Failed to send invite. Please try again.'),
    })

    const hue         = candidate.candidateName?.charCodeAt(0) * 137.5 % 360 || 200
    const modeColors  = { ONLINE: '#6366f1', IN_PERSON: '#10b981', HYBRID: '#f59e0b' }
    const modeColor   = modeColors[interviewMode]

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70, backdropFilter: 'blur(4px)' }}
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.92, opacity: 0, x: '-50%', y: '-50%' }}
                animate={{ scale: 1,    opacity: 1, x: '-50%', y: '-50%' }}
                exit={{   scale: 0.92, opacity: 0, x: '-50%', y: '-50%' }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                style={{
                    position: 'fixed', top: '50%', left: '50%',
                    width: 'min(520px, 95vw)', maxHeight: '90vh',
                    background: 'var(--bg-primary)', borderRadius: 20,
                    border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)',
                    zIndex: 71, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '18px 22px', borderBottom: '1px solid var(--border)',
                    background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(124,58,237,0.04))',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Avatar */}
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: `linear-gradient(135deg,hsl(${hue},60%,55%),hsl(${(hue+40)%360},70%,45%))`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 15, fontWeight: 800, color: 'white',
                        }}>{(candidate.candidateName||'?').slice(0,2).toUpperCase()}</div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                                {candidate.candidateName}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {candidate.candidateEmail} · {jobTitle}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}><X size={16}/></button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
                    {!sent ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                            {/* Date & Time */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                                        📅 INTERVIEW DATE
                                    </label>
                                    <input
                                        type="date" value={interviewDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => setDate(e.target.value)}
                                        className="input" style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>🕐 TIME</label>
                                    <input
                                        type="time" value={interviewTime}
                                        onChange={e => setTime(e.target.value)}
                                        className="input" style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            {/* Mode */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>INTERVIEW MODE</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {[['ONLINE','💻 Online'],['IN_PERSON','🏢 In-Person'],['HYBRID','🔀 Hybrid']].map(([val, label]) => (
                                        <button key={val} onClick={() => setMode(val)}
                                            style={{
                                                flex: 1, padding: '9px 4px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                                cursor: 'pointer', transition: 'all 0.15s',
                                                border: interviewMode === val ? `2px solid ${modeColors[val]}` : '2px solid var(--border)',
                                                background: interviewMode === val ? `${modeColors[val]}15` : 'var(--bg-tertiary)',
                                                color: interviewMode === val ? modeColors[val] : 'var(--text-muted)',
                                            }}
                                        >{label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Meeting link */}
                            {(interviewMode === 'ONLINE' || interviewMode === 'HYBRID') && (
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>🔗 MEETING LINK (optional)</label>
                                    <input
                                        type="url" placeholder="https://meet.google.com/..."
                                        value={meetingLink} onChange={e => setLink(e.target.value)}
                                        className="input" style={{ width: '100%' }}
                                    />
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>📌 NOTES (optional)</label>
                                <textarea
                                    placeholder="e.g. Please bring your portfolio."
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    className="input" rows={2}
                                    style={{ width: '100%', resize: 'none', fontFamily: 'inherit' }}
                                />
                            </div>

                            {/* Email preview hint */}
                            <div style={{
                                padding: '12px 16px', borderRadius: 10,
                                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
                                fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
                            }}>
                                ✉️ <strong>{candidate.candidateName}</strong> ko ek beautiful HTML email jaayega jisme
                                interview date, time, mode aur Confirm/Reschedule buttons honge.
                            </div>
                        </div>
                    ) : (
                        // Success state
                        <div style={{ textAlign: 'center', padding: '28px 0' }}>
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                                style={{
                                    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                                    background: 'linear-gradient(135deg,#10b981,#059669)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                                }}
                            >✅</motion.div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                                Invite Sent!
                            </h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                Interview invitation email sent to<br/>
                                <strong style={{ color: '#10b981' }}>{candidate.candidateEmail}</strong>
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 22px', borderTop: '1px solid var(--border)',
                    background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'flex-end', gap: 10,
                }}>
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    {!sent && (
                        <button
                            onClick={() => {
                                if (!interviewDate) { toast.error('Please select a date'); return }
                                sendMutation.mutate()
                            }}
                            className="btn-primary"
                            disabled={sendMutation.isPending}
                            style={{ minWidth: 140 }}
                        >
                            {sendMutation.isPending
                                ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
                                : <><Send size={13} /> Send Interview Invite</>}
                        </button>
                    )}
                </div>
            </motion.div>
        </>
    )
}

/* ── Bulk Interview Invite Modal ── */
function BulkInviteModal({ ranked, jobTitle, onClose }) {
    const [topN, setTopN]             = useState(Math.min(3, ranked.length))
    const [interviewDate, setDate]    = useState('')
    const [interviewTime, setTime]    = useState('10:00')
    const [interviewMode, setMode]    = useState('ONLINE')
    const [meetingLink, setLink]      = useState('')
    const [notes, setNotes]           = useState('')
    const [step, setStep]             = useState(1)   // 1=config, 2=preview, 3=done
    const [schedules, setSchedules]   = useState({})  // { email: { date, time } }

    const shortlisted = ranked.slice(0, topN).filter(c => c.candidateEmail)
    const threshold   = ranked[topN - 1]?.matchScore?.toFixed(1) || '—'

    const sendMutation = useMutation({
        mutationFn: () => {
            const requests = shortlisted.map(c => ({
                candidateEmail: c.candidateEmail,
                candidateName:  c.candidateName,
                jobTitle,
                interviewDate:  schedules[c.candidateEmail]?.date || interviewDate,
                interviewTime:  (schedules[c.candidateEmail]?.time || interviewTime) + ':00',
                interviewMode,
                meetingLink:    (interviewMode === 'ONLINE' || interviewMode === 'HYBRID') ? meetingLink : null,
                notes,
                resumeId:       c.resumeId,
            }))
            return interviewApi.scheduleBulk(requests)
        },
        onSuccess: () => setStep(3),
        onError:   () => toast.error('Failed to send invites. Please try again.'),
    })

    const modeColors = { ONLINE: '#6366f1', IN_PERSON: '#10b981', HYBRID: '#f59e0b' }
    const modeColor  = modeColors[interviewMode]

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, backdropFilter: 'blur(4px)' }}
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.92, opacity: 0, x: '-50%', y: '-50%' }}
                animate={{ scale: 1,    opacity: 1, x: '-50%', y: '-50%' }}
                exit={{   scale: 0.92, opacity: 0, x: '-50%', y: '-50%' }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                style={{
                    position: 'fixed', top: '50%', left: '50%',
                    width: 'min(640px, 95vw)', maxHeight: '90vh',
                    background: 'var(--bg-primary)', borderRadius: 20,
                    border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)',
                    zIndex: 61, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
            >
                {/* Modal Header */}
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid var(--border)',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(124,58,237,0.04))',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Mail size={18} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>Schedule Interview Invites</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Send professional email invitations to top candidates</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}><X size={16}/></button>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', padding: '14px 24px', gap: 8, borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                    {['Configure', 'Preview', 'Done'].map((label, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                            <div style={{
                                width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: step > i ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : step === i+1 ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)',
                                color: step > i ? 'white' : step === i+1 ? '#6366f1' : 'var(--text-muted)',
                                border: step === i+1 ? '2px solid #6366f1' : '2px solid transparent',
                            }}>{step > i+1 ? '✓' : i+1}</div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: step === i+1 ? '#6366f1' : 'var(--text-muted)' }}>{label}</span>
                            {i < 2 && <div style={{ flex: 1, height: 1, background: step > i+1 ? '#6366f1' : 'var(--border)', marginLeft: 4 }} />}
                        </div>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

                    {/* STEP 1 — Configure */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                            {/* Top-N slider */}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 10 }}>
                                    <Users size={14} style={{ display:'inline', marginRight: 6 }} />
                                    Invite Top Candidates
                                </label>
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(124,58,237,0.04))',
                                    border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: '16px 20px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Number of candidates:</span>
                                        <span style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>{topN}</span>
                                    </div>
                                    <input
                                        type="range" min={1} max={ranked.length}
                                        value={topN} onChange={e => setTopN(Number(e.target.value))}
                                        style={{ width: '100%', accentColor: '#6366f1' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                                        <span>1</span>
                                        <span style={{ color: '#6366f1', fontWeight: 700 }}>Min score: {threshold}%</span>
                                        <span>{ranked.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                                        <Calendar size={12} style={{ display:'inline', marginRight: 4 }} />DEFAULT DATE
                                    </label>
                                    <input
                                        type="date" value={interviewDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => setDate(e.target.value)}
                                        className="input" style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>🕐 DEFAULT TIME</label>
                                    <input
                                        type="time" value={interviewTime}
                                        onChange={e => setTime(e.target.value)}
                                        className="input" style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            {/* Mode */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>INTERVIEW MODE</label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {[['ONLINE','💻 Online'],['IN_PERSON','🏢 In-Person'],['HYBRID','🔀 Hybrid']].map(([val, label]) => (
                                        <button
                                            key={val} onClick={() => setMode(val)}
                                            style={{
                                                flex: 1, padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                                cursor: 'pointer', transition: 'all 0.15s',
                                                border: interviewMode === val ? `2px solid ${modeColors[val]}` : '2px solid var(--border)',
                                                background: interviewMode === val ? `${modeColors[val]}15` : 'var(--bg-tertiary)',
                                                color: interviewMode === val ? modeColors[val] : 'var(--text-muted)',
                                            }}
                                        >{label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Meeting Link */}
                            {interviewMode === 'ONLINE' || interviewMode === 'HYBRID' ? (
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>🔗 MEETING LINK (optional)</label>
                                    <input
                                        type="url" placeholder="https://meet.google.com/..."
                                        value={meetingLink} onChange={e => setLink(e.target.value)}
                                        className="input" style={{ width: '100%' }}
                                    />
                                </div>
                            ) : null}

                            {/* Notes */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>📌 NOTES FOR CANDIDATES (optional)</label>
                                <textarea
                                    placeholder="e.g. Please bring your ID. Dress formally."
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    className="input" rows={2}
                                    style={{ width: '100%', resize: 'none', fontFamily: 'inherit' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 2 — Preview */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{
                                padding: '14px 16px', borderRadius: 12,
                                background: 'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(124,58,237,0.04))',
                                border: '1px solid rgba(99,102,241,0.2)',
                                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 4,
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{shortlisted.length}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CANDIDATES</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{interviewDate || 'Not set'}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>DEFAULT DATE</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: modeColor }}>
                                        {interviewMode === 'ONLINE' ? '💻' : interviewMode === 'IN_PERSON' ? '🏢' : '🔀'} {interviewMode.replace('_',' ')}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>MODE</div>
                                </div>
                            </div>

                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                                <span>CANDIDATES WHO WILL RECEIVE INVITES:</span>
                                <span>ADJUST INDIVIDUAL TIMES BELOW 👇</span>
                            </div>
                            {shortlisted.map((c, i) => {
                                const cDate = schedules[c.candidateEmail]?.date || interviewDate
                                const cTime = schedules[c.candidateEmail]?.time || interviewTime
                                
                                const updateSchedule = (field, val) => {
                                    setSchedules(prev => ({
                                        ...prev,
                                        [c.candidateEmail]: {
                                            date: prev[c.candidateEmail]?.date || interviewDate,
                                            time: prev[c.candidateEmail]?.time || interviewTime,
                                            [field]: val
                                        }
                                    }))
                                }

                                return (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 14px', borderRadius: 10,
                                    background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                                }}>
                                    <div style={{
                                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0, fontSize: 13,
                                        background: `linear-gradient(135deg, hsl(${c.candidateName?.charCodeAt(0)*137.5%360||200},60%,55%), hsl(${((c.candidateName?.charCodeAt(0)||0)*137.5+40)%360},70%,45%))`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white',
                                    }}>{(c.candidateName||'?').slice(0,2).toUpperCase()}</div>
                                    <div style={{ flex: 1, minWidth: 150 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.candidateName} <span style={{fontSize:10, color:'var(--text-muted)'}}>(#{i+1})</span></div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.candidateEmail}</div>
                                    </div>
                                    
                                    {/* Individual Pickers */}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input 
                                            type="date" 
                                            value={cDate} 
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={e => updateSchedule('date', e.target.value)}
                                            style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                        <input 
                                            type="time" 
                                            value={cTime} 
                                            onChange={e => updateSchedule('time', e.target.value)}
                                            style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}

                    {/* STEP 3 — Done */}
                    {step === 3 && (
                        <div style={{ textAlign: 'center', padding: '32px 0' }}>
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                                style={{
                                    width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                                    background: 'linear-gradient(135deg,#10b981,#059669)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                                }}
                            >✅</motion.div>
                            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                                Invites Sent Successfully!
                            </h3>
                            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                <strong style={{ color: '#10b981' }}>{shortlisted.length} candidates</strong> have been sent
                                professional interview invitation emails.
                                <br/>They will receive a confirmation link in their inbox.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                {step !== 3 && (
                    <div style={{
                        padding: '16px 24px', borderTop: '1px solid var(--border)',
                        display: 'flex', gap: 10, justifyContent: 'flex-end',
                        background: 'var(--bg-tertiary)',
                    }}>
                        {step === 2 && (
                            <button onClick={() => setStep(1)} className="btn-secondary">
                                ← Back
                            </button>
                        )}
                        {step === 1 && (
                            <button
                                onClick={() => {
                                    if (!interviewDate) { toast.error('Please select interview date'); return }
                                    if (shortlisted.length === 0) { toast.error('No candidates with email found'); return }
                                    setStep(2)
                                }}
                                className="btn-primary"
                            >
                                Preview Invites ({shortlisted.length}) →
                            </button>
                        )}
                        {step === 2 && (
                            <button
                                onClick={() => sendMutation.mutate()}
                                className="btn-primary"
                                disabled={sendMutation.isPending}
                                style={{ minWidth: 160 }}
                            >
                                {sendMutation.isPending
                                    ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
                                    : <><Send size={14} /> Send {shortlisted.length} Invites</>}
                            </button>
                        )}
                    </div>
                )}
                {step === 3 && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-tertiary)', textAlign: 'center' }}>
                        <button onClick={onClose} className="btn-primary">Close</button>
                    </div>
                )}
            </motion.div>
        </>
    )
}

export default function RankingPage() {
    const { jobId: paramJobId }           = useParams()
    const { recruiterId }                 = useAuthStore()
    const [selectedJobId, setSelectedJobId] = useState(paramJobId || '')
    const [selectedCandidate, setSelected]  = useState(null)
    const [showInviteModal, setShowInviteModal] = useState(false)

    const { data: jobsRes } = useQuery({
        queryKey: ['jobs', recruiterId],
        queryFn: () => jobsApi.getByRecruiter(recruiterId),
        enabled: !!recruiterId,
    })
    const jobs = jobsRes?.data || []

    useEffect(() => {
        if (!selectedJobId && jobs.length > 0) setSelectedJobId(jobs[0].id)
    }, [jobs])

    const { data: rankRes, isLoading, refetch } = useQuery({
        queryKey: ['ranking', selectedJobId],
        queryFn: () => rankingApi.getRanked(selectedJobId),
        enabled: !!selectedJobId,
    })

    const ranked      = rankRes?.data || []
    const selectedJob = jobs.find(j => j.id === selectedJobId)

    return (
        <div>
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Rankings</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                        {ranked.length} candidate{ranked.length !== 1 ? 's' : ''} ranked for{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>{selectedJob?.title || '...'}</strong>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {ranked.length > 0 && (
                        <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => setShowInviteModal(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                                border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                color: 'white', boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                            }}
                        >
                            <Mail size={15} /> Schedule Interview Invites
                        </motion.button>
                    )}
                    <button onClick={() => refetch()} className="btn-secondary">
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {/* Job selector */}
            <div style={{ marginBottom: 24 }}>
                <label className="label">Select job position</label>
                <div style={{ position: 'relative', maxWidth: 440 }}>
                    <select
                        value={selectedJobId}
                        onChange={e => { setSelectedJobId(e.target.value); setSelected(null) }}
                        className="input"
                        style={{ paddingRight: 36, appearance: 'none', cursor: 'pointer' }}
                    >
                        <option value="">Select a job...</option>
                        {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </select>
                    <ChevronDown size={14} style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        pointerEvents: 'none', color: 'var(--text-muted)',
                    }} />
                </div>
            </div>

            {/* Top 3 podium — only if 3+ candidates */}
            {ranked.length >= 3 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                    {[1, 0, 2].map(pos => {
                        const c     = ranked[pos]
                        const score = c?.matchScore || 0
                        const color = pos === 0 ? '#f59e0b' : pos === 1 ? '#94a3b8' : '#92400e'
                        const hue   = c?.candidateName?.charCodeAt(0) * 137.5 % 360 || 200
                        const isTop = pos === 0
                        return (
                            <motion.div
                                key={pos}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: pos === 0 ? 0.1 : pos === 1 ? 0 : 0.15 }}
                                className="card"
                                style={{
                                    padding: '18px 16px', textAlign: 'center', cursor: 'pointer',
                                    border: isTop ? `1px solid rgba(245,158,11,0.3)` : '1px solid var(--border)',
                                    background: isTop ? 'rgba(245,158,11,0.03)' : 'var(--bg-primary)',
                                    marginTop: isTop ? 0 : 12,
                                }}
                                onClick={() => setSelected(c === selectedCandidate ? null : c)}
                                whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
                            >
                                <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 8, letterSpacing: '0.05em' }}>
                                    {pos === 0 ? '🥇 1ST' : pos === 1 ? '🥈 2ND' : '🥉 3RD'}
                                </div>
                                <div style={{
                                    width: 42, height: 42, borderRadius: '50%', margin: '0 auto 10px',
                                    background: `linear-gradient(135deg, hsl(${hue},60%,55%), hsl(${(hue+40)%360},70%,45%))`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 16, fontWeight: 800, color: 'white',
                                }}>
                                    {(c?.candidateName || '?').slice(0, 2).toUpperCase()}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {c?.candidateName || 'Unknown'}
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 800, color }}>
                                    {score.toFixed(1)}%
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* State: no job selected */}
            {!selectedJobId ? (
                <div style={{ textAlign: 'center', padding: '56px 0' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                        background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <TrendingUp size={24} style={{ color: 'var(--text-faint)' }} />
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Select a job to view candidate rankings</p>
                </div>
            ) : isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="card" style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%' }} />
                            <div style={{ flex: 1 }}>
                                <div className="skeleton" style={{ height: 13, width: '30%', marginBottom: 6, borderRadius: 6 }} />
                                <div className="skeleton" style={{ height: 11, width: '20%', borderRadius: 6 }} />
                            </div>
                            <div className="skeleton" style={{ height: 6, width: 72, borderRadius: 99 }} />
                        </div>
                    ))}
                </div>
            ) : ranked.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '56px 0' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))',
                        border: '1px solid rgba(245,158,11,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Award size={24} style={{ color: '#f59e0b' }} />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>No candidates ranked yet</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 340, margin: '0 auto' }}>
                        Upload resumes and they will be automatically screened and ranked by AI.
                    </p>
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    {/* Table header */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '48px 2fr 2fr 160px 80px',
                        gap: 12, padding: '10px 16px',
                        borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)',
                    }}>
                        {['#', 'Candidate', 'Email', 'Score', ''].map((h, i) => (
                            <span key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                        ))}
                    </div>

                    {ranked.map((c, idx) => {
                        const score     = c.matchScore || 0
                        const isSelected = selectedCandidate?.resumeId === c.resumeId
                        const hue       = c.candidateName?.charCodeAt(0) * 137.5 % 360 || 200
                        return (
                            <motion.div
                                key={c.resumeId || idx}
                                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                                style={{
                                    display: 'grid', gridTemplateColumns: '48px 2fr 2fr 160px 80px',
                                    gap: 12, padding: '12px 16px',
                                    borderBottom: idx < ranked.length - 1 ? '1px solid var(--border)' : 'none',
                                    alignItems: 'center', cursor: 'pointer',
                                    background: isSelected ? 'rgba(6,182,212,0.04)' : 'transparent',
                                    transition: 'background 0.15s',
                                }}
                                onClick={() => setSelected(isSelected ? null : c)}
                                onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                                onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <RankBadge rank={idx} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                        background: `linear-gradient(135deg, hsl(${hue},60%,55%), hsl(${(hue+40)%360},70%,45%))`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 12, fontWeight: 800, color: 'white',
                                    }}>
                                        {(c.candidateName || '?').slice(0, 2).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {c.candidateName || 'Unknown'}
                                    </span>
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {c.candidateEmail || '—'}
                                </span>
                                <ScoreBar score={score} />
                                <span style={{
                                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, textAlign: 'center',
                                    background: isSelected ? 'rgba(6,182,212,0.12)' : 'var(--bg-tertiary)',
                                    color: isSelected ? '#06b6d4' : 'var(--text-muted)',
                                    border: isSelected ? '1px solid rgba(6,182,212,0.2)' : '1px solid var(--border)',
                                }}>
                                    {isSelected ? 'Open ↗' : 'Details'}
                                </span>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* Candidate drawer + overlay */}
            <AnimatePresence>
                {selectedCandidate && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 49, backdropFilter: 'blur(2px)' }}
                            onClick={() => setSelected(null)}
                        />
                        <CandidateDrawer
                            candidate={selectedCandidate}
                            onClose={() => setSelected(null)}
                            jobId={selectedJobId}
                            jobTitle={selectedJob?.title || 'the position'}
                        />
                    </>
                )}
            </AnimatePresence>

            {/* Bulk Interview Invite Modal */}
            <AnimatePresence>
                {showInviteModal && (
                    <BulkInviteModal
                        ranked={ranked}
                        jobTitle={selectedJob?.title || 'the position'}
                        onClose={() => setShowInviteModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}