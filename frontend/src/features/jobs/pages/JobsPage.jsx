import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
    Plus, Briefcase, Trash2, Edit2, ChevronRight, X,
    Search, RefreshCw, Clock, Tag, FileText, TrendingUp, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import { jobsApi } from '../api/jobsApi'
import { useAuthStore } from '../../../shared/store/authStore'
import Pagination from '../../../shared/components/Pagination'

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

const ALL_TECH_SKILLS = [
    { name: 'Java', category: 'Language' },
    { name: 'JavaScript', category: 'Language' },
    { name: 'TypeScript', category: 'Language' },
    { name: 'Python', category: 'Language' },
    { name: 'C++', category: 'Language' },
    { name: 'C#', category: 'Language' },
    { name: 'C', category: 'Language' },
    { name: 'Go', category: 'Language' },
    { name: 'Rust', category: 'Language' },
    { name: 'PHP', category: 'Language' },
    { name: 'Ruby', category: 'Language' },
    { name: 'Kotlin', category: 'Language' },
    { name: 'Swift', category: 'Language' },
    { name: 'Scala', category: 'Language' },
    { name: 'Dart', category: 'Language' },
    { name: 'SQL', category: 'Language' },
    { name: 'HTML5', category: 'Language' },
    { name: 'CSS3', category: 'Language' },
    { name: 'Bash / Shell', category: 'Language' },
    { name: 'Solidity', category: 'Language' },
    { name: 'Node.js', category: 'Backend' },
    { name: 'Express.js', category: 'Backend' },
    { name: 'NestJS', category: 'Backend' },
    { name: 'Spring Boot', category: 'Backend' },
    { name: 'Django', category: 'Backend' },
    { name: 'Flask', category: 'Backend' },
    { name: 'FastAPI', category: 'Backend' },
    { name: 'ASP.NET Core', category: 'Backend' },
    { name: 'Ruby on Rails', category: 'Backend' },
    { name: 'Laravel', category: 'Backend' },
    { name: 'GraphQL', category: 'Backend' },
    { name: 'gRPC', category: 'Backend' },
    { name: 'REST APIs', category: 'Backend' },
    { name: 'Microservices', category: 'Backend' },
    { name: 'Socket.io', category: 'Backend' },
    { name: 'React', category: 'Frontend' },
    { name: 'Next.js', category: 'Frontend' },
    { name: 'Vue.js', category: 'Frontend' },
    { name: 'Angular', category: 'Frontend' },
    { name: 'Redux', category: 'Frontend' },
    { name: 'Tailwind CSS', category: 'Frontend' },
    { name: 'Bootstrap', category: 'Frontend' },
    { name: 'React Native', category: 'Mobile' },
    { name: 'Flutter', category: 'Mobile' },
    { name: 'MongoDB', category: 'Database' },
    { name: 'PostgreSQL', category: 'Database' },
    { name: 'MySQL', category: 'Database' },
    { name: 'Redis', category: 'Database' },
    { name: 'Elasticsearch', category: 'Database' },
    { name: 'Cassandra', category: 'Database' },
    { name: 'DynamoDB', category: 'Database' },
    { name: 'Prisma ORM', category: 'Database' },
    { name: 'Terraform', category: 'DevOps' },
    { name: 'Docker', category: 'DevOps' },
    { name: 'Kubernetes', category: 'DevOps' },
    { name: 'AWS', category: 'Cloud' },
    { name: 'Azure', category: 'Cloud' },
    { name: 'GCP', category: 'Cloud' },
    { name: 'GitHub Actions', category: 'DevOps' },
    { name: 'Jenkins', category: 'DevOps' },
    { name: 'Ansible', category: 'DevOps' },
    { name: 'Linux', category: 'DevOps' },
    { name: 'Apache Kafka', category: 'Messaging' },
    { name: 'RabbitMQ', category: 'Messaging' },
    { name: 'PyTorch', category: 'AI/ML' },
    { name: 'TensorFlow', category: 'AI/ML' },
    { name: 'LangChain', category: 'AI/ML' },
    { name: 'PGVector', category: 'AI/ML' },
    { name: 'Jest', category: 'Testing' },
    { name: 'Supertest', category: 'Testing' },
    { name: 'Postman', category: 'Testing' },
    { name: 'JWT', category: 'Security' },
    { name: 'OAuth2', category: 'Security' },
    { name: 'Git', category: 'Tools' }
];

/* ── Job form dialog ── */
function JobFormDialog({ open, onClose, editing }) {
    const { recruiterId } = useAuthStore()
    const qc = useQueryClient()
    const [skillQuery, setSkillQuery] = useState('')
    const [showSkillSuggestions, setShowSkillSuggestions] = useState(false)
    const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
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

    const currentSkillsStr = watch('keySkills') || '';
    const selectedSkills = currentSkillsStr.split(',').map(s => s.trim().toLowerCase());
    const matchingSkills = skillQuery
        ? ALL_TECH_SKILLS.filter(s => 
            s.name.toLowerCase().includes(skillQuery.toLowerCase()) &&
            !selectedSkills.includes(s.name.toLowerCase())
          ).slice(0, 8)
        : [];

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
                            <label className="label">Experience Level *</label>
                            <select className="input" style={{ cursor: 'pointer' }}
                                {...register('minExperienceYears')}>
                                <option value="0">Fresher (0 - 1 years)</option>
                                <option value="1">Junior (1 - 3 years)</option>
                                <option value="3">Mid-Level (3 - 5 years)</option>
                                <option value="5">Senior (5 - 8 years)</option>
                                <option value="8">Lead / Principal (8+ years)</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Employment & Work Mode</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                <select className="input" style={{ cursor: 'pointer', fontSize: 12 }}
                                    {...register('employmentType')}>
                                    <option value="Full-Time">Full-Time</option>
                                    <option value="Internship">Internship</option>
                                    <option value="Contract">Contract</option>
                                </select>
                                <select className="input" style={{ cursor: 'pointer', fontSize: 12 }}
                                    {...register('workMode')}>
                                    <option value="Remote">Remote</option>
                                    <option value="Hybrid">Hybrid</option>
                                    <option value="On-Site">On-Site</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <label className="label" style={{ marginBottom: 0 }}>Key skills (comma-separated) *</label>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Live skill search active</span>
                        </div>
                        <input
                            className="input"
                            placeholder="Type skills e.g. Java, Terraform, Node.js..."
                            autoComplete="off"
                            value={watch('keySkills') || ''}
                            onChange={e => {
                                setValue('keySkills', e.target.value, { shouldValidate: true });
                                const last = e.target.value.split(',').pop().trim();
                                setSkillQuery(last);
                                setShowSkillSuggestions(last.length >= 1);
                            }}
                            onFocus={() => {
                                const last = (watch('keySkills') || '').split(',').pop().trim();
                                if (last.length >= 1) {
                                    setSkillQuery(last);
                                    setShowSkillSuggestions(true);
                                }
                            }}
                            onBlur={() => {
                                // Delay close slightly so click events on suggestions register
                                setTimeout(() => setShowSkillSuggestions(false), 200);
                            }}
                        />
                        {errors.keySkills && <p style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>{errors.keySkills.message}</p>}

                        {/* Live Autocomplete Suggestions Dropdown */}
                        {showSkillSuggestions && matchingSkills.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 100,
                                marginTop: 4,
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                boxShadow: 'var(--shadow-xl)',
                                maxHeight: 220,
                                overflowY: 'auto',
                                padding: 4,
                            }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px', letterSpacing: '0.04em' }}>
                                    Matching Skills ({matchingSkills.length})
                                </div>
                                {matchingSkills.map((skillItem, idx) => (
                                    <div
                                        key={idx}
                                        onMouseDown={() => {
                                            const current = watch('keySkills') || '';
                                            const parts = current.split(',');
                                            parts.pop(); // Remove partial token
                                            const cleanParts = parts.map(p => p.trim()).filter(Boolean);
                                            const updated = [...cleanParts, skillItem.name].join(', ') + ', ';
                                            setValue('keySkills', updated, { shouldValidate: true });
                                            setShowSkillSuggestions(false);
                                        }}
                                        style={{
                                            padding: '8px 10px',
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: 12.5,
                                            color: 'var(--text-primary)',
                                            transition: 'background 0.15s ease',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = 'var(--bg-tertiary)';
                                            e.currentTarget.style.color = 'var(--brand)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontWeight: 600 }}>{skillItem.name}</span>
                                        </div>
                                        <span style={{
                                            fontSize: 10,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-muted)',
                                            border: '1px solid var(--border)',
                                        }}>
                                            {skillItem.category}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
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

/* ── View Job Details Modal ── */
function ViewJobDialog({ open, onClose, job, onEdit, onRankings, onScreenResumes }) {
    if (!open || !job) return null

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
                    width: '100%', maxWidth: 640, maxHeight: '90vh',
                    background: 'var(--bg-primary)',
                    borderRadius: 20, border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-xl)', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    background: 'var(--bg-tertiary)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
                        }}>
                            <Briefcase size={20} color="white" />
                        </div>
                        <div>
                            <h2 style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', margin: 0 }}>
                                {job.title}
                            </h2>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {job.minExperienceYears === 0 ? 'Fresher (0 - 1y exp)' : `${job.minExperienceYears}y+ Experience`}
                                </span>
                                {job.employmentType && (
                                    <span style={{
                                        fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                                        background: job.employmentType.toLowerCase().includes('intern') ? 'rgba(245,158,11,0.1)' : 'rgba(139,92,246,0.1)',
                                        color: job.employmentType.toLowerCase().includes('intern') ? '#f59e0b' : '#8b5cf6',
                                        border: job.employmentType.toLowerCase().includes('intern') ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(139,92,246,0.25)',
                                    }}>
                                        {job.employmentType}
                                    </span>
                                )}
                                {job.workMode && (
                                    <span style={{
                                        fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                                        background: 'rgba(6,182,212,0.08)', color: '#06b6d4',
                                        border: '1px solid rgba(6,182,212,0.2)',
                                    }}>
                                        {job.workMode}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}><X size={16} /></button>
                </div>

                {/* Body Content */}
                <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
                    {/* Key skills required */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                            Key Required Skills ({job.keySkills?.length || 0})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {job.keySkills?.map((s, i) => <SkillTag key={s} skill={s} idx={i} />)}
                        </div>
                    </div>

                    {/* Full Job Description */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                            Job Description & Requirements
                        </div>
                        <div style={{
                            fontSize: 13, color: 'var(--text-secondary)',
                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                            borderRadius: 10, padding: 16, lineHeight: 1.6,
                            whiteSpace: 'pre-wrap', maxHeight: 260, overflowY: 'auto'
                        }}>
                            {job.rawText || 'No detailed description provided.'}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '14px 24px', borderTop: '1px solid var(--border)',
                    background: 'var(--bg-tertiary)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap'
                }}>
                    <button
                        type="button"
                        onClick={() => { onClose(); onEdit(job); }}
                        className="btn-secondary"
                        style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <Edit2 size={13} /> Edit Job
                    </button>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            onClick={() => { onClose(); onScreenResumes(job.id); }}
                            className="btn-secondary"
                            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <FileText size={13} /> Upload Resumes
                        </button>
                        <button
                            type="button"
                            onClick={() => { onClose(); onRankings(job.id); }}
                            className="btn-primary"
                            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <TrendingUp size={13} /> View Ranked Candidates
                        </button>
                    </div>
                </div>
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
    const [viewingJob, setViewingJob] = useState(null)
    const [search, setSearch]         = useState('')
    const [page, setPage]             = useState(1)
    const [pageSize, setPageSize]     = useState(6)

    React.useEffect(() => {
        setPage(1)
    }, [search])

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
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                        {jobs.slice((page - 1) * pageSize, page * pageSize).map((job, idx) => (
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
                                            onClick={() => setViewingJob(job)}
                                            className="btn-ghost" style={{ padding: 6, color: '#06b6d4' }}
                                            title="View job description"
                                        >
                                            <Eye size={14} />
                                        </button>
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
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                                        <Clock size={11} />
                                        <span>{job.minExperienceYears === 0 ? 'Fresher (0y)' : `${job.minExperienceYears}y+ exp`}</span>
                                    </div>
                                    {job.workMode && (
                                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}>
                                            {job.workMode}
                                        </span>
                                    )}
                                    {job.employmentType && (
                                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.08)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}>
                                            {job.employmentType}
                                        </span>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
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

                                {/* CTA Footer */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4,
                                }} onClick={e => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onClick={() => setViewingJob(job)}
                                        className="btn-secondary"
                                        style={{
                                            padding: '4px 10px', fontSize: 11.5, fontWeight: 600,
                                            display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8
                                        }}
                                    >
                                        <Eye size={12} style={{ color: '#06b6d4' }} />
                                        <span>View Job</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/ranking/${job.id}`)}
                                        className="btn-ghost"
                                        style={{
                                            padding: '4px 8px', fontSize: 12, fontWeight: 600, color: '#06b6d4',
                                            display: 'flex', alignItems: 'center', gap: 4
                                        }}
                                    >
                                        <TrendingUp size={12} />
                                        <span>View rankings</span>
                                        <ChevronRight size={12} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {jobs.length > 0 && (
                        <Pagination
                            currentPage={page}
                            totalItems={jobs.length}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={setPageSize}
                            pageSizeOptions={[6, 12, 24]}
                            itemName="jobs"
                        />
                    )}
                </div>
            )}

            <AnimatePresence>
                {dialogOpen && <JobFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} />}
                {viewingJob && (
                    <ViewJobDialog
                        open={!!viewingJob}
                        onClose={() => setViewingJob(null)}
                        job={viewingJob}
                        onEdit={(j) => { setEditing(j); setDialogOpen(true) }}
                        onRankings={(id) => navigate(`/ranking/${id}`)}
                        onScreenResumes={() => navigate(`/resumes`)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}