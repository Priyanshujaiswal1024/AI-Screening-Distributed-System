import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, Video, MapPin, Search, Filter, RefreshCw, Mail, XCircle, CheckCircle2, AlertCircle, Briefcase, Trash2, Archive } from 'lucide-react'
import toast from 'react-hot-toast'
import { interviewApi } from '../api/interviewApi'
import Pagination from '../../../shared/components/Pagination'

export default function InterviewsPage() {
    const [filter, setFilter] = useState('ALL')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const qc = useQueryClient()

    React.useEffect(() => {
        setPage(1)
    }, [filter, search])

    const { data: interviews = [], isLoading, refetch } = useQuery({
        queryKey: ['myInterviews'],
        queryFn: async () => {
            const res = await interviewApi.getMyInterviews()
            return res.data
        }
    })

    const cancelMutation = useMutation({
        mutationFn: (id) => interviewApi.cancel(id),
        onSuccess: () => {
            qc.invalidateQueries(['myInterviews'])
            toast.success('Interview cancelled successfully 🚫')
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to cancel interview')
        }
    })

    const deletePermanentMutation = useMutation({
        mutationFn: (id) => interviewApi.deletePermanent(id),
        onSuccess: () => {
            qc.invalidateQueries(['myInterviews'])
            toast.success('Interview record removed 🗑️')
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to remove interview')
        }
    })

    const today = new Date().toISOString().split('T')[0]
    const processedInterviews = interviews.map(inv => {
        const isPast = inv.interviewDate && inv.interviewDate < today
        if (inv.status === 'PENDING' && isPast) {
            return { ...inv, status: 'NO_RESPONSE' }
        }
        return inv
    })

    const filtered = processedInterviews.filter(inv => {
        const matchStatus = filter === 'ALL' || inv.status === filter
        const matchSearch = (inv.candidateName || '').toLowerCase().includes(search.toLowerCase()) ||
                            (inv.jobTitle || '').toLowerCase().includes(search.toLowerCase())
        return matchStatus && matchSearch
    })

    const stats = {
        total: processedInterviews.length,
        pending: processedInterviews.filter(i => i.status === 'PENDING').length,
        confirmed: processedInterviews.filter(i => i.status === 'CONFIRMED').length,
        no_response: processedInterviews.filter(i => i.status === 'NO_RESPONSE').length,
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'CONFIRMED': return { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircle2 size={14}/>, label: 'Confirmed' }
            case 'PENDING': return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <Clock size={14}/>, label: 'Pending' }
            case 'NO_RESPONSE': return { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', icon: <AlertCircle size={14}/>, label: 'No Response (Expired)' }
            case 'CANCELLED': return { color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: <XCircle size={14}/>, label: 'Cancelled' }
            default: return { color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: <Clock size={14}/>, label: status }
        }
    }

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">Interview Schedule</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        Track and manage candidate interviews across all jobs
                    </p>
                </div>
                <button onClick={() => refetch()} className="btn-secondary">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Total Invites', val: stats.total, color: '#38bdf8' },
                    { label: 'Confirmed', val: stats.confirmed, color: '#10b981' },
                    { label: 'Pending Reply', val: stats.pending, color: '#f59e0b' },
                    { label: 'No Response', val: stats.no_response, color: '#f43f5e' },
                ].map(s => (
                    <div key={s.label} style={{
                        background: 'var(--bg-primary)', padding: '16px 20px', borderRadius: 12,
                        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div style={{
                display: 'flex', gap: 12, marginBottom: 20, padding: 12,
                background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border)'
            }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search candidate or job..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input"
                        style={{ width: '100%', paddingLeft: 36, height: 38 }}
                    />
                </div>
                <select
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="input"
                    style={{ width: 200, height: 38 }}
                >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending Reply</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="NO_RESPONSE">No Response</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>

            {/* List */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading interviews...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <Calendar size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.5 }} />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>No interviews found</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Try changing your filters or search query.</p>
                </div>
            ) : (
                <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <AnimatePresence>
                            {filtered.slice((page - 1) * pageSize, page * pageSize).map(inv => {
                                const style = getStatusStyle(inv.status)
                                const hue = inv.candidateName?.charCodeAt(0) * 137.5 % 360 || 200

                                return (
                                    <motion.div
                                        key={inv.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        style={{
                                            background: 'var(--bg-primary)', padding: '16px 20px', borderRadius: 12,
                                            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 20,
                                            boxShadow: 'var(--shadow-sm)'
                                        }}
                                    >
                                        {/* Avatar */}
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                            background: `linear-gradient(135deg, hsl(${hue},60%,55%), hsl(${(hue+40)%360},70%,45%))`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 16, fontWeight: 800, color: 'white'
                                        }}>
                                            {(inv.candidateName || '?').slice(0, 2).toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                                                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                                                    {inv.candidateName}
                                                </span>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                    background: style.bg, color: style.color
                                                }}>
                                                    {style.icon} {style.label}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Briefcase size={13}/> {inv.jobTitle}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={13}/> {inv.candidateEmail}</span>
                                            </div>
                                        </div>

                                        {/* Schedule */}
                                        <div style={{ textAlign: 'right', minWidth: 160 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                                                {inv.interviewDate}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                                                <Clock size={12}/> {inv.interviewTime}
                                                <span style={{ margin: '0 4px' }}>•</span>
                                                {inv.interviewMode === 'ONLINE' ? <Video size={12}/> : <MapPin size={12}/>}
                                                {inv.interviewMode}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>
                                            {inv.status === 'NO_RESPONSE' && (
                                                <button
                                                    onClick={() => {
                                                        toast.success(`Invite resent to ${inv.candidateEmail || 'candidate'} 📧`)
                                                    }}
                                                    className="btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                                >
                                                    Resend
                                                </button>
                                            )}
                                            {inv.status !== 'CANCELLED' && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Are you sure you want to cancel the interview for ${inv.candidateName || 'this candidate'}?`)) {
                                                            cancelMutation.mutate(inv.id)
                                                        }
                                                    }}
                                                    disabled={cancelMutation.isPending}
                                                    className="btn-ghost"
                                                    style={{ padding: '6px 12px', fontSize: 12, color: 'var(--rose)' }}
                                                >
                                                    {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                                                </button>
                                            )}
                                            {/* Remove / Archive button */}
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`Remove interview record for ${inv.candidateName || 'this candidate'} permanently?`)) {
                                                        deletePermanentMutation.mutate(inv.id)
                                                    }
                                                }}
                                                disabled={deletePermanentMutation.isPending}
                                                className="btn-ghost"
                                                style={{
                                                    padding: '6px 8px',
                                                    fontSize: 12,
                                                    color: 'var(--text-muted)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                                title="Delete / Archive record"
                                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--rose)' }}
                                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                                            >
                                                <Trash2 size={14} />
                                                {inv.status === 'CANCELLED' ? 'Remove' : ''}
                                            </button>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>

                    {filtered.length > 0 && (
                        <Pagination
                            currentPage={page}
                            totalItems={filtered.length}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={setPageSize}
                            itemName="interviews"
                        />
                    )}
                </div>
            )}
        </div>
    )
}
