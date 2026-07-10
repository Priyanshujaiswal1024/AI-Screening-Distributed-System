import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
    Plus, Briefcase, Trash2, Edit2, ChevronRight, X,
    Search, RefreshCw, Clock, Tag, FileText, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { jobsApi } from '../api/jobsApi'
import { useAuthStore } from '../../../shared/store/authStore'

/* ── Skill tag with color cycling ── */
const SKILL_COLORS = [
    { bg: 'rgba(6,182,212,0.1)',  color: '#06b6d4',  border: 'rgba(6,182,212,0.2)'  },
    { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6',  border: 'rgba(139,92,246,0.2)' },
    { bg: 'rgba(16,185,129,0.1)', color: '#10b981',  border: 'rgba(16,185,129,0.2)' },
    { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b',  border: 'rgba(245,158,11,0.2)' },
    { bg: 'rgba(244,63,94,0.1)',  color: '#f43f5e',  border: 'rgba(244,63,94,0.2)'  },
]
function SkillTag({ skill, idx = 0 }) {
    const c = SKILL_COLORS[idx % SKILL_COLORS.length]
    return (
        <span style={{
            padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: c.bg, color: c.color, border: `1px solid ${c.border}`,
        }}>
            {skill}
        </span>
    )
}

/* ── Job form dialog ── */
function JobFormDialog({ open, onClose, editing }) {
    const { recruiterId } = useAuthStore()
    const qc = useQueryClient()
    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
        defaultValues: editing ? {
            title: editing.title,
            rawText: editing.rawText,
            keySkills: editing.keySkills?.join(', '),
            minExperienceYears: editing.minExperienceYears,
        } : {},
    })

    React.useEffect(() => {
        if (editing) {
            setValue('title', editing.title)
            setValue('rawText', editing.rawText)
            setValue('keySkills', editing.keySkills?.join(', '))
            setValue('minExperienceYears', editing.minExperienceYears)
        } else {
            reset()
        }
    }, [editing])

    const createMut = useMutation({
        mutationFn: jobsApi.create,
        onSuccess: () => { qc.invalidateQueries(['jobs']); toast.success('Job posted 🎉'); onClose() },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create job'),
    })
    const updateMut = useMutation({
        mutationFn: ({ id, data }) => jobsApi.update(id, data),
        onSuccess: () => { qc.invalidateQueries(['jobs']); toast.success('Job updated'); onClose() },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update job'),
    })

    const isLoading = createMut.isPending || updateMut.isPending

    const onSubmit = (data) => {
        const payload = {
            ...data, recruiterId,
            minExperienceYears: parseInt(data.minExperienceYears) || 0,
            keySkills: data.keySkills.split(',').map(s => s.trim()).filter(Boolean),
        }
        if (editing) updateMut.mutate({ id: editing.id, data: payload })
        else createMut.mutate(payload)
    }

    if (!open) return null

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 16 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                style={{
                    width: '100%', maxWidth: 560,
                    background: 'var(--bg-primary)',
                    borderRadius: 20, border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-xl)', overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Dialog header */}
                <div style={{
                    padding: '18px 24px', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--bg-tertiary)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 9,
                            background: editing
                                ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                                : 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {editing ? <Edit2 size={14} color="white" /> : <Plus size={14} color="white" />}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                                {editing ? 'Edit job' : 'Post a new job'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {editing ? 'Update job details' : 'Create a job description for AI screening'}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}><X size={16} /></button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                        <label className="label">Job title *</label>
                        <input className="input" placeholder="e.g. Senior Backend Engineer"
                            {...register('title', { required: 'Required' })} />
                        {errors.title && <p style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>{errors.title.message}</p>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label className="label">Min experience (years)</label>
                            <input className="input" type="number" min="0" placeholder="3"
                                {...register('minExperienceYears')} />
                        </div>
                        <div>
                            <label className="label">Key skills (comma-separated) *</label>
                            <input className="input" placeholder="Java, Spring Boot, Kafka"
                                {...register('keySkills', { required: 'Required' })} />
                            {errors.keySkills && <p style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>{errors.keySkills.message}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="label">Job description *</label>
                        <textarea className="input" rows={5}
                            placeholder="Describe the role, responsibilities, and requirements..."
                            style={{ resize: 'vertical', lineHeight: 1.6 }}
                            {...register('rawText', { required: 'Required' })} />
                        {errors.rawText && <p style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>{errors.rawText.message}</p>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading
                                ? <RefreshCw size={14} className="animate-spin" />
                                : (editing ? 'Save changes' : 'Post job')
                            }
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

export default function JobsPage() {
    const { recruiterId } = useAuthStore()
    const qc = useQueryClient()
    const navigate = useNavigate()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing]       = useState(null)
    const [search, setSearch]         = useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['jobs', recruiterId],
        queryFn: () => jobsApi.getByRecruiter(recruiterId),
        enabled: !!recruiterId,
    })

    const deleteMut = useMutation({
        mutationFn: jobsApi.delete,
        onSuccess: () => { qc.invalidateQueries(['jobs']); toast.success('Job deleted') },
        onError: () => toast.error('Failed to delete'),
    })

    const jobs = (data?.data || []).filter(j =>
        !search || j.title?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div>
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Jobs</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                        {jobs.length} active position{jobs.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button onClick={() => { setEditing(null); setDialogOpen(true) }} className="btn-primary">
                    <Plus size={15} /> Post job
                </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 24, maxWidth: 400 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    className="input"
                    placeholder="Search jobs..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: 36 }}
                />
            </div>

            {/* Jobs grid */}
            {isLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card" style={{ padding: 20, height: 180 }}>
                            <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 10, borderRadius: 6 }} />
                            <div className="skeleton" style={{ height: 11, width: '45%', marginBottom: 20, borderRadius: 6 }} />
                            <div style={{ display: 'flex', gap: 6 }}>
                                <div className="skeleton" style={{ height: 22, width: 56, borderRadius: 6 }} />
                                <div className="skeleton" style={{ height: 22, width: 64, borderRadius: 6 }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : jobs.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ textAlign: 'center', padding: '72px 0' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
                        background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(6,182,212,0.05))',
                        border: '1px solid rgba(6,182,212,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Briefcase size={28} style={{ color: '#06b6d4' }} />
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                        {search ? 'No matching jobs' : 'No jobs posted yet'}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
                        {search ? 'Try a different search term' : 'Create your first job description to start AI-powered candidate screening.'}
                    </p>
                    {!search && (
                        <button onClick={() => { setEditing(null); setDialogOpen(true) }} className="btn-primary">
                            <Plus size={14} /> Post first job
                        </button>
                    )}
                </motion.div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {jobs.map((job, idx) => (
                        <motion.div
                            key={job.id}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="card"
                            style={{ padding: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                            onClick={() => navigate(`/ranking/${job.id}`)}
                            whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
                        >
                            {/* Background glow */}
                            <div style={{
                                position: 'absolute', top: -40, right: -40, width: 120, height: 120,
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
                                pointerEvents: 'none',
                            }} />

                            {/* Header row */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10,
                                    background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))',
                                    border: '1px solid rgba(6,182,212,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Briefcase size={16} style={{ color: '#06b6d4' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => { setEditing(job); setDialogOpen(true) }}
                                        className="btn-ghost" style={{ padding: 6 }}
                                        title="Edit job"
                                    >
                                        <Edit2 size={13} />
                                    </button>
                                    <button
                                        onClick={() => { if (window.confirm('Delete this job?')) deleteMut.mutate(job.id) }}
                                        className="btn-ghost" style={{ padding: 6, color: 'var(--rose)' }}
                                        title="Delete job"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>

                            {/* Title & meta */}
                            <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.35 }}>
                                {job.title}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                                    <Clock size={11} />
                                    <span>Min {job.minExperienceYears}y exp</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                                    <Tag size={11} />
                                    <span>{job.keySkills?.length || 0} skills</span>
                                </div>
                            </div>

                            {/* Skills */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                                {job.keySkills?.slice(0, 4).map((s, i) => <SkillTag key={s} skill={s} idx={i} />)}
                                {job.keySkills?.length > 4 && (
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '3px 6px' }}>
                                        +{job.keySkills.length - 4} more
                                    </span>
                                )}
                            </div>

                            {/* CTA */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                color: '#06b6d4', fontSize: 12, fontWeight: 600,
                                borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4,
                            }}>
                                <TrendingUp size={12} />
                                <span>View rankings</span>
                                <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {dialogOpen && <JobFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} />}
            </AnimatePresence>
        </div>
    )
}