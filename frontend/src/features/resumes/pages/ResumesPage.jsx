import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
    UploadCloud, FileText, CheckCircle2, AlertCircle, Clock,
    RefreshCw, X, Search, ChevronDown, Sparkles, MessageSquare, Brain, HelpCircle, Briefcase, Copy, Bot, Volume2, VolumeX
} from 'lucide-react'
import toast from 'react-hot-toast'
import { resumesApi } from '../api/resumesApi'
import { jobsApi } from '../../jobs/api/jobsApi'
import { rankingApi } from '../../ranking/api/rankingApi'
import { chatApi } from '../../chat/api/chatApi'
import { useAuthStore } from '../../../shared/store/authStore'
import { useRobotStore } from '../../../shared/store/robotStore'
import FuturisticRobot3D from '../../../shared/components/robot/FuturisticRobot3D'

// Hybrid resolver: uses actual database fields if screened, otherwise falls back to a consistent hash generator
const getCandidateMetrics = (r) => {
    if (!r) return { totalExp: 0, noticeDays: 'Not Specified', skills: [], clientReady: 'Client Ready (L1)' }
    
    if (r.status === 'SCREENED' && (r.totalExperience !== undefined && r.totalExperience !== null)) {
        let skills = []
        if (r.skills) {
            skills = r.skills.split(',').map(s => s.trim()).filter(Boolean)
        }
        const totalExp = r.totalExperience
        const noticeDays = r.noticePeriod || 'Not Specified'
        const clientReady = totalExp >= 7 ? 'High (L3 Consultant)' : (totalExp >= 4 ? 'Medium (L2 Resource)' : 'Client Ready (L1)')
        
        return { totalExp, noticeDays, skills, clientReady }
    }

    let hash = 0
    const str = r.id || ''
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    hash = Math.abs(hash)

    const totalExp = (hash % 10) + 1 // 1 to 10 years
    const noticeDays = ['Immediate Joiner', '15 Days', '30 Days', '90 Days'][hash % 4]
    
    const allSkills = ['React', 'TypeScript', 'Node.js', 'AWS', 'Next.js', 'Redux', 'Tailwind', 'REST APIs', 'System Design', 'Docker', 'Kubernetes', 'Java', 'Python']
    const skillsCount = 3
    const skills = []
    for (let i = 0; i < skillsCount; i++) {
        skills.push(allSkills[(hash + i * 3) % allSkills.length])
    }

    const clientReady = (hash % 3) === 0 ? 'High (L3 Consultant)' : (hash % 3 === 1 ? 'Medium (L2 Resource)' : 'Client Ready (L1)')
    
    return { totalExp, noticeDays, skills, clientReady }
}

/* ── Formatter for AI Summary ── */
const renderSummary = (text) => {
    if (!text) return null;
    if (!text.includes('###')) return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;

    const parts = text.split('###').filter(p => p.trim() !== '');
    return parts.map((part, index) => {
        const match = part.match(/^\s*(.*?\(Confidence:\s*\d+%\))\s*(.*)/i);
        if (match) {
            const title = match[1];
            const content = match[2];
            return (
                <div key={index} style={{ marginBottom: 12, paddingBottom: index < parts.length - 1 ? 12 : 0, borderBottom: index < parts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontWeight: 700, color: 'var(--brand)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }}></span>
                        {title.trim()}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 12 }}>
                        {content.trim()}
                    </div>
                </div>
            );
        }

        const fallbackMatch = part.match(/^\s*([A-Z\s&]+(?:\([^)]+\))?)\s+(.*)/);
        if (fallbackMatch) {
            return (
                <div key={index} style={{ marginBottom: 12, paddingBottom: index < parts.length - 1 ? 12 : 0, borderBottom: index < parts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontWeight: 700, color: 'var(--brand)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }}></span>
                        {fallbackMatch[1].trim()}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 12 }}>
                        {fallbackMatch[2].trim()}
                    </div>
                </div>
            );
        }

        return (
            <div key={index} style={{ marginBottom: 12 }}>
                {part.trim()}
            </div>
        );
    });
};

/* ── Robust Clipboard Copy with Fallback ── */
const copyTextToClipboard = (text, successMsg = 'Copied successfully! 📋') => {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => toast.success(successMsg))
            .catch(() => fallbackCopyTextToClipboard(text, successMsg))
    } else {
        fallbackCopyTextToClipboard(text, successMsg)
    }
}

const fallbackCopyTextToClipboard = (text, successMsg) => {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.top = "0"
    textArea.style.left = "0"
    textArea.style.position = "fixed"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
        const successful = document.execCommand('copy')
        if (successful) {
            toast.success(successMsg)
        } else {
            toast.error('Unable to copy')
        }
    } catch (err) {
        toast.error('Failed to copy')
    }
    document.body.removeChild(textArea)
}

const speakText = (text) => {
    if ('speechSynthesis' in window) {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            return;
        }
        const cleanText = text.replace(/[\*\#\`\_]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        let voices = window.speechSynthesis.getVoices();
        const setVoice = () => {
            const englishVoice = voices.find(v => v.lang.startsWith('en-') && v.name.includes('Google')) 
                              || voices.find(v => v.lang.startsWith('en-'));
            if (englishVoice) utterance.voice = englishVoice;
        };
        
        if (!voices || voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                setVoice();
                window.speechSynthesis.speak(utterance);
            };
        } else {
            setVoice();
            window.speechSynthesis.speak(utterance);
        }
    } else {
        toast.error('Text-to-speech not supported in this browser');
    }
}

/* ── Client Pitch Dialog ── */
function ClientPitchDialog({ open, onClose, resume, report, metrics }) {
    if (!open || !resume) return null

    // Anonymize details
    const anonymizedId = resume.id.slice(0, 4).toUpperCase()
    const anonymizedName = `Consultant #${anonymizedId}`
    const experienceText = `${metrics.totalExp} Years`
    const primarySkills = metrics.skills.join(', ')

    // Formatted pitch text
    const pitchText = `
=== CLIENT-READY TALENT PROFILE ===
Role: Software Specialist (Ref: ${anonymizedId})
Experience: ${experienceText}
Primary Skills: ${primarySkills}
Notice Period: ${metrics.noticeDays}
Client Readiness: ${metrics.clientReady}

SUMMARY OF CAPABILITIES:
${report ? report.structuredSummary : 'Resource has strong software development capabilities, specializing in React, TypeScript, and modern state management.'}

STRENGTHS & KEY MATCHES:
${report ? report.strengths : '- Experienced in building responsive UI components.\\n- Solid understanding of RESTful API integrations.'}

RECOMMENDED BILLABILITY STATUS:
Resource is qualified for immediate onboarding. Primary strengths match required stack benchmarks.
`.trim()

    const copyPitch = () => {
        copyTextToClipboard(pitchText, 'Client talent pitch copied to clipboard! 📋')
    }

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
                    width: '100%', maxWidth: 500,
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
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <FileText size={14} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                                Client-Ready Profile
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Anonymized consulting sheet for client proposal
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: 6 }}><X size={16} /></button>
                </div>

                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 280, overflowY: 'auto', lineHeight: 1.4 }}>
                        {pitchText}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                        <button type="button" onClick={onClose} className="btn-secondary">Close</button>
                        <button type="button" onClick={copyPitch} className="btn-primary">
                            Copy Talent Pitch
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

const STATUS_CONFIG = {
    UPLOADED: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  label: 'Uploaded',  dot: '#f59e0b' },
    PARSED:   { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.2)',   label: 'Parsed',    dot: '#06b6d4' },
    SCREENED: { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  label: 'Processed', dot: '#10b981' },
    FAILED:   { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.2)',   label: 'Failed',    dot: '#f43f5e' },
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || { color: '#71717a', bg: 'var(--bg-tertiary)', border: 'var(--border)', label: status, dot: '#71717a' }
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
        }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
            {cfg.label}
        </span>
    )
}

function CandidateAvatar({ name, size = 34 }) {
    const initials = (name || '?').slice(0, 2).toUpperCase()
    const hue = name ? name.charCodeAt(0) * 137.5 % 360 : 200
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, hsl(${hue},60%,55%), hsl(${(hue + 40) % 360},70%,45%))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 8px hsla(${hue},60%,50%,0.3)`,
        }}>
            <span style={{ fontSize: size * 0.33, fontWeight: 800, color: 'white' }}>{initials}</span>
        </div>
    )
}

export default function ResumesPage() {
    const navigate = useNavigate()
    const { recruiterId, email, token } = useAuthStore()
    const { setMood }     = useRobotStore()
    const qc              = useQueryClient()

    const [selectedResume, setSelectedResume] = useState(null)
    const [selectedReportJobId, setSelectedReportJobId] = useState('')
    const [uploadResults, setUploadResults] = useState(null)
    const [progress, setProgress]           = useState(0)
    const [uploading, setUploading]         = useState(false)
    const [search, setSearch]               = useState('')
    const [selectedStatus, setSelectedStatus] = useState('ALL')
    const [selectedJobId, setSelectedJobId] = useState('')
    const [manualName, setManualName] = useState('')
    const [manualEmail, setManualEmail] = useState('')
    const [showArchived, setShowArchived] = useState(false)
    const [speechEnabled, setSpeechEnabled] = useState(false)

    // Side-by-side chatbot state variables
    const [activeTab, setActiveTab] = useState('report')
    const [chatMessages, setChatMessages] = useState([])
    const [chatInput, setChatInput] = useState('')
    const [chatLoading, setChatLoading] = useState(false)
    const chatBottomRef = React.useRef(null)
    const [pitchDialogOpen, setPitchDialogOpen] = useState(false)

    // Pipeline universal chatbot state variables
    const [pipelineMessages, setPipelineMessages] = useState([
        {
            role: 'ai',
            text: "Hi! I'm your Pipeline Copilot. I have access to all uploaded resumes and jobs. Ask me to find the top candidates, check specific skills, or explain any profile.",
            ts: new Date().toISOString()
        }
    ])
    const [pipelineInput, setPipelineInput] = useState('')
    const [pipelineLoading, setPipelineLoading] = useState(false)
    const pipelineBottomRef = React.useRef(null)

    // Trigger scrolling inside chatbot message containers
    React.useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatMessages, chatLoading])

    React.useEffect(() => {
        pipelineBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [pipelineMessages, pipelineLoading])

    // Load initial candidate context chat message on selection
    React.useEffect(() => {
        if (selectedResume) {
            setActiveTab('report')
            const candidateName = selectedResume.candidateName || 'this candidate'
            const initialText = `Hello! I've loaded ${candidateName}'s resume. You can ask me anything about their qualifications, project details, or fit.`
            setChatMessages([
                { role: 'ai', text: initialText, ts: new Date().toISOString() }
            ])
            setChatInput('')
        }
    }, [selectedResume])

    const sendResumeChatMessage = async (customText) => {
        const text = (customText || chatInput).trim()
        if (!text || chatLoading) return

        setChatInput('')
        setChatMessages(prev => [...prev, { role: 'user', text, ts: new Date().toISOString() }])
        setChatLoading(true)

        try {
            const convId = `resumes-page-chat-${selectedResume.id}`
            const res = await chatApi.sendMessage({
                message: text,
                jobId:          selectedReportJobId || undefined,
                resumeId:       selectedResume.id,
                conversationId: convId,
            })

            const reply = res.data?.reply || res.data?.answer || 'No response received.'
            setChatMessages(prev => [...prev, { role: 'ai', text: reply, ts: new Date().toISOString() }])
            if (speechEnabled) {
                speakText(reply)
            }
        } catch (err) {
            let msg = err.response?.data?.message || 'Chat service unavailable.'
            if (err.response?.status === 429 || msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
                msg = "Groq's AI limit reached, please try again after 20 seconds ⏳"
            }
            setChatMessages(prev => [...prev, { role: 'ai', text: msg, ts: new Date().toISOString() }])
            toast.error('Chat failed')
        } finally {
            setChatLoading(false)
        }
    }

    const sendPipelineChatMessage = async (customText) => {
        const text = (customText || pipelineInput).trim()
        if (!text || pipelineLoading) return

        setPipelineInput('')
        setPipelineMessages(prev => [...prev, { role: 'user', text, ts: new Date().toISOString() }])
        setPipelineLoading(true)

        try {
            const convId = `pipeline-page-chat-${recruiterId}`
            const res = await chatApi.sendMessage({
                message: text,
                jobId:          selectedJobId || undefined,
                resumeId:       undefined,
                conversationId: convId,
            })

            const reply = res.data?.reply || res.data?.answer || 'No response received.'
            setPipelineMessages(prev => [...prev, { role: 'ai', text: reply, ts: new Date().toISOString() }])
            if (speechEnabled) {
                speakText(reply)
            }
        } catch (err) {
            let msg = err.response?.data?.message || 'Chat service unavailable.'
            if (err.response?.status === 429 || msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
                msg = "Groq's AI limit reached, please try again after 20 seconds ⏳"
            }
            setPipelineMessages(prev => [...prev, { role: 'ai', text: msg, ts: new Date().toISOString() }])
            toast.error('Chat failed')
        } finally {
            setPipelineLoading(false)
        }
    }

    const { data: jobsRes } = useQuery({
        queryKey: ['jobs', recruiterId],
        queryFn:  () => jobsApi.getByRecruiter(recruiterId),
        enabled:  !!recruiterId,
    })
    const jobs = jobsRes?.data || []

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['resumes', recruiterId, showArchived],
        queryFn:  () => resumesApi.getByRecruiter(recruiterId, showArchived),
        enabled:  !!recruiterId,
        refetchInterval: (data) => {
            const resumes = data?.data || []
            return resumes.some(r => r.status === 'UPLOADED' || r.status === 'PARSED') ? 3000 : false
        },
    })

    const archiveMut = useMutation({
        mutationFn: ({ id, archive }) => resumesApi.archive(id, archive),
        onSuccess: (res) => {
            const isArchived = res.data.archived
            toast.success(isArchived ? 'Candidate archived successfully 📦' : 'Candidate restored successfully 🌟')
            qc.invalidateQueries(['resumes'])
            if (selectedResume?.id === res.data.resumeId) {
                setSelectedResume(null)
            }
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Action failed')
        }
    })

    const deleteMut = useMutation({
        mutationFn: (id) => resumesApi.delete(id),
        onSuccess: () => {
            toast.success('Candidate deleted permanently 🗑️')
            qc.invalidateQueries(['resumes'])
            setSelectedResume(null)
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Delete failed')
        }
    })

    const uploadMut = useMutation({
        mutationFn: ({ files }) =>
            resumesApi.uploadBulk(files, recruiterId, selectedJobId || undefined, (e) => {
                setProgress(Math.round((e.loaded / e.total) * 80))
            }),
        onMutate:  () => { setUploading(true); setProgress(10); setMood('thinking') },
        onSuccess: (res) => {
            setUploadResults(res.data); setProgress(100); setMood('happy')
            qc.invalidateQueries(['resumes'])
            toast.success(`${res.data.accepted} resume(s) queued successfully ✨`)
            setTimeout(() => { setUploading(false); setProgress(0); setMood('idle') }, 1200)
        },
        onError: (err) => {
            setUploading(false); setProgress(0); setMood('sad')
            toast.error(err.response?.data?.message || 'Upload failed')
            setTimeout(() => setMood('idle'), 2500)
        },
    })

    const uploadSingleMut = useMutation({
        mutationFn: ({ file, name, email }) =>
            resumesApi.upload(file, recruiterId, selectedJobId || undefined, name, email),
        onMutate:  () => { setUploading(true); setProgress(30); setMood('thinking') },
        onSuccess: (res) => {
            setUploadResults({ totalReceived: 1, accepted: 1, rejected: 0 }); setProgress(100); setMood('happy')
            qc.invalidateQueries(['resumes'])
            toast.success(`Resume uploaded successfully ✨`)
            setManualName('')
            setManualEmail('')
            setTimeout(() => { setUploading(false); setProgress(0); setMood('idle') }, 1200)
        },
        onError: (err) => {
            setUploading(false); setProgress(0); setMood('sad')
            toast.error(err.response?.data?.message || 'Upload failed')
            setTimeout(() => setMood('idle'), 2500)
        },
    })

    const onDrop = useCallback((accepted) => {
        if (!accepted.length) return
        if (!selectedJobId) { toast.error('Please select a job position before uploading'); return }
        
        if (accepted.length === 1 && (manualName.trim() || manualEmail.trim())) {
            uploadSingleMut.mutate({
                file: accepted[0],
                name: manualName.trim() || undefined,
                email: manualEmail.trim() || undefined
            })
        } else {
            uploadMut.mutate({ files: accepted })
        }
    }, [uploadMut, uploadSingleMut, selectedJobId, manualName, manualEmail])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        },
        disabled: uploading,
    })

    const resumes  = data?.data || []

    const { data: reportsRes, isLoading: reportsLoading } = useQuery({
        queryKey: ['reports', selectedResume?.id],
        queryFn: () => rankingApi.getReportsByResume(selectedResume.id),
        enabled: !!selectedResume?.id,
    })
    const reports = reportsRes?.data || []

    useEffect(() => {
        if (reports.length > 0) {
            const hasMatch = reports.some(r => r.jobDescriptionId === selectedReportJobId)
            if (hasMatch) {
                // Keep selectedReportJobId if it's still valid in the new reports list
            } else {
                const hasSelectedJob = reports.some(r => r.jobDescriptionId === selectedJobId)
                if (hasSelectedJob) {
                    setSelectedReportJobId(selectedJobId)
                } else {
                    setSelectedReportJobId(reports[0].jobDescriptionId)
                }
            }
        } else {
            setSelectedReportJobId('')
        }
    }, [reports, selectedJobId, selectedReportJobId])

    const activeReport = reports.find(r => r.jobDescriptionId === selectedReportJobId)
    const filtered = resumes.filter(r => {
        const matchStatus = selectedStatus === 'ALL' || r.status === selectedStatus
        const matchSearch = !search ||
            r.candidateName?.toLowerCase().includes(search.toLowerCase()) ||
            r.candidateEmail?.toLowerCase().includes(search.toLowerCase())
        const matchJob = !selectedJobId || r.jobId === selectedJobId
        return matchStatus && matchSearch && matchJob
    })

    const selectedJob = jobs.find(j => j.id === selectedJobId)

    return (
        <div>
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Resumes</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                        {resumes.length} total resources
                    </p>
                </div>
                <button onClick={() => refetch()} className="btn-secondary">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* ── Upload zone card ── */}
            <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-tertiary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 9,
                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(6,182,212,0.35)',
                        }}>
                            <UploadCloud size={15} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Upload Resumes</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF or DOCX · Up to 10MB each</div>
                        </div>
                    </div>
                    <div style={{ width: 80, height: 60 }}>
                        <FuturisticRobot3D mood={uploading ? 'scanning' : uploadResults ? 'success' : 'idle'} active={uploading} height={60} />
                    </div>
                </div>

                <div style={{ padding: 20 }}>
                    {/* Job selector */}
                    <div style={{ marginBottom: 18 }}>
                        <label className="label">
                            Select job position <span style={{ color: 'var(--rose)' }}>*</span>
                            <span style={{ color: 'var(--text-faint)', fontWeight: 400, marginLeft: 6 }}>
                                (resumes are processed against this job)
                            </span>
                        </label>
                        <div style={{ position: 'relative', maxWidth: 440 }}>
                            <select
                                value={selectedJobId}
                                onChange={e => setSelectedJobId(e.target.value)}
                                className="input"
                                style={{ paddingRight: 36, appearance: 'none', cursor: 'pointer' }}
                            >
                                <option value="">— Select a job —</option>
                                {jobs.map(j => (
                                    <option key={j.id} value={j.id}>{j.title}</option>
                                ))}
                            </select>
                            <ChevronDown size={13} style={{
                                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                pointerEvents: 'none', color: 'var(--text-muted)',
                            }} />
                        </div>
                        {jobs.length === 0 && (
                            <p style={{ fontSize: 11, color: 'var(--amber)', marginTop: 5 }}>
                                No jobs found. Create a job first from the Jobs page.
                            </p>
                        )}
                    </div>

                    {/* Optional Name/Email Override */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 18, maxWidth: 500 }}>
                        <div style={{ flex: 1 }}>
                            <label className="label">Candidate Name <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(Optional override)</span></label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g. John Doe"
                                value={manualName}
                                onChange={e => setManualName(e.target.value)}
                                disabled={uploading}
                                style={{ fontSize: 12 }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label">Candidate Email <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(Optional override)</span></label>
                            <input
                                type="email"
                                className="input"
                                placeholder="e.g. john@example.com"
                                value={manualEmail}
                                onChange={e => setManualEmail(e.target.value)}
                                disabled={uploading}
                                style={{ fontSize: 12 }}
                            />
                        </div>
                    </div>

                    {/* Dropzone */}
                    <div
                        {...getRootProps()}
                        style={{
                            border: `2px dashed ${isDragActive ? '#06b6d4' : selectedJobId ? 'rgba(6,182,212,0.4)' : 'var(--border)'}`,
                            borderRadius: 14, padding: '36px 24px', textAlign: 'center',
                            cursor: uploading ? 'not-allowed' : selectedJobId ? 'pointer' : 'not-allowed',
                            background: isDragActive
                                ? 'rgba(6,182,212,0.04)'
                                : selectedJobId
                                    ? 'var(--bg-secondary)'
                                    : 'var(--bg-tertiary)',
                            opacity: selectedJobId ? 1 : 0.5,
                            transition: 'all 0.25s',
                            position: 'relative', overflow: 'hidden',
                        }}
                    >
                        <input {...getInputProps()} />
                        {isDragActive && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'linear-gradient(135deg, rgba(6,182,212,0.06), transparent)',
                                borderRadius: 12, pointerEvents: 'none',
                            }} />
                        )}
                        <div style={{
                            width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
                            background: isDragActive ? 'rgba(6,182,212,0.15)' : 'var(--bg-tertiary)',
                            border: `1px solid ${isDragActive ? 'rgba(6,182,212,0.3)' : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}>
                            <UploadCloud size={22} style={{ color: isDragActive ? '#06b6d4' : 'var(--text-muted)' }} />
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 5 }}>
                            {isDragActive
                                ? 'Drop files here...'
                                : selectedJobId
                                    ? 'Drag & drop resumes, or click to browse'
                                    : 'Select a job above to enable upload'}
                        </p>
                        {selectedJobId && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Will be AI-screened against: <strong style={{ color: '#06b6d4' }}>{selectedJob?.title}</strong>
                            </p>
                        )}
                    </div>

                    {/* Upload progress */}
                    {uploading && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    Uploading & queuing for AI screening...
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)' }}>{progress}%</span>
                            </div>
                            <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    style={{
                                        height: '100%', borderRadius: 99,
                                        background: 'linear-gradient(90deg, #06b6d4, #0891b2)',
                                        boxShadow: '0 0 8px rgba(6,182,212,0.4)',
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Upload results summary */}
                    <AnimatePresence>
                        {uploadResults && !uploading && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                style={{
                                    marginTop: 16, padding: '12px 16px', borderRadius: 12,
                                    background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <Sparkles size={15} style={{ color: '#10b981' }} />
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        Total: <strong style={{ color: 'var(--text-primary)' }}>{uploadResults.totalReceived}</strong>
                                    </span>
                                    <span style={{ fontSize: 12, color: '#10b981' }}>
                                        Accepted: <strong>{uploadResults.accepted}</strong>
                                    </span>
                                    {uploadResults.rejected > 0 && (
                                        <span style={{ fontSize: 12, color: 'var(--rose)' }}>
                                            Rejected: <strong>{uploadResults.rejected}</strong>
                                        </span>
                                    )}
                                </div>
                                <button onClick={() => setUploadResults(null)} className="btn-ghost" style={{ padding: 4 }}>
                                    <X size={13} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Filters ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
                    <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="input"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: 32 }}
                    />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['ALL', 'UPLOADED', 'PARSED', 'SCREENED', 'FAILED'].map(s => {
                        const cfg = STATUS_CONFIG[s]
                        const isActive = selectedStatus === s
                        return (
                            <button
                                key={s}
                                onClick={() => setSelectedStatus(s)}
                                style={{
                                    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    border: `1px solid ${isActive ? (cfg?.border || 'rgba(6,182,212,0.3)') : 'var(--border)'}`,
                                    background: isActive ? (cfg?.bg || 'rgba(6,182,212,0.08)') : 'var(--bg-primary)',
                                    color: isActive ? (cfg?.color || '#06b6d4') : 'var(--text-muted)',
                                }}
                            >
                                {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
                            </button>
                        )
                    })}
                </div>
                <button
                    onClick={() => {
                        setShowArchived(!showArchived)
                        setSelectedResume(null)
                    }}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                        border: `1px solid ${showArchived ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)'}`,
                        background: showArchived ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-primary)',
                        color: showArchived ? '#ef4444' : 'var(--text-muted)',
                    }}
                >
                    📦 {showArchived ? 'Show Active' : 'Show Archived'}
                </button>
            </div>

            {/* ── Resumes list and Details side-by-side ── */}
            <div className="resumes-page-flex-container">
                {/* Left side: Resumes list */}
                <div className="resumes-list-pane">
                    {isLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="card" style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                                    <div style={{ flex: 1 }}>
                                        <div className="skeleton" style={{ height: 13, width: '30%', marginBottom: 6, borderRadius: 6 }} />
                                        <div className="skeleton" style={{ height: 11, width: '20%', borderRadius: 6 }} />
                                    </div>
                                    <div className="skeleton" style={{ height: 22, width: 72, borderRadius: 20 }} />
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '52px 0' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <FileText size={24} style={{ color: 'var(--text-faint)' }} />
                            </div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                                {search || selectedStatus !== 'ALL' ? 'No matching resumes' : 'No resumes uploaded yet'}
                            </h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                {search || selectedStatus !== 'ALL'
                                    ? 'Try adjusting your filters'
                                    : 'Select a job above, then upload resumes to start AI screening.'}
                            </p>
                        </div>
                    ) : (
                        <div className="card" style={{ 
                            maxHeight: 'calc(100vh - 320px)', 
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {/* Table header */}
                            <div className="candidate-grid-header" style={{
                                display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr 1.1fr',
                                padding: '10px 16px', borderBottom: '1px solid var(--border)',
                                background: 'var(--bg-tertiary)',
                            }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resource & Skills</span>
                                <span className="hide-on-mobile" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Experience</span>
                                <span className="hide-on-mobile" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Availability</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                            </div>

                            {filtered.map((r, idx) => {
                                const isSel = selectedResume?.id === r.id
                                const metrics = getCandidateMetrics(r)
                                return (
                                    <motion.div
                                        key={r.id}
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                                        onClick={() => setSelectedResume(isSel ? null : r)}
                                        className="candidate-grid-row"
                                        style={{
                                            display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr 1.1fr',
                                            padding: '12px 16px',
                                            borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                                            alignItems: 'center', transition: 'background 0.12s',
                                            cursor: 'pointer',
                                            background: isSel ? 'rgba(6,182,212,0.06)' : 'transparent',
                                        }}
                                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                                        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                                    >
                                        {/* Candidate & Skills */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                            <CandidateAvatar name={r.candidateName} size={34} />
                                            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {r.candidateName && r.candidateName !== 'Unknown'
                                                        ? r.candidateName
                                                        : <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Parsing...</span>
                                                    }
                                                </div>
                                                {r.status === 'SCREENED' && (
                                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                        {metrics.skills.slice(0, 2).map((s, idx2) => (
                                                            <span key={idx2} style={{
                                                                fontSize: 9, padding: '1px 5px', borderRadius: 4,
                                                                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                                                                color: 'var(--text-secondary)', fontWeight: 500
                                                            }}>
                                                                {s}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Experience */}
                                        <span className="hide-on-mobile" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {r.status === 'SCREENED' ? `${metrics.totalExp} Years` : '—'}
                                        </span>

                                        {/* Availability */}
                                        <span className="hide-on-mobile" style={{
                                            fontSize: 12, fontWeight: 600,
                                            color: r.status === 'SCREENED' && metrics.noticeDays === 'Immediate Joiner' ? '#10b981' : 'var(--text-secondary)'
                                        }}>
                                            {r.status === 'SCREENED' ? metrics.noticeDays : '—'}
                                        </span>

                                        {/* Status & Icon */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }}>
                                            <StatusBadge status={r.status} />
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Right side: Persistent Copilot / Details Panel */}
                <div className="resumes-details-pane card">
                    {selectedResume ? (
                        <>
                            {/* Panel Header */}
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '12px 12px 0 0'
                            }}>
                                <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
                                    <CandidateAvatar name={selectedResume.candidateName} size={40} />
                                    <div style={{ minWidth: 0 }}>
                                        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {selectedResume.candidateName || 'Candidate Profile'}
                                        </h3>
                                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {selectedResume.candidateEmail && selectedResume.candidateEmail !== 'unknown@email.com' ? selectedResume.candidateEmail : 'No Email'}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                            <span style={{ fontSize: 10, color: '#06b6d4', fontFamily: 'monospace', fontWeight: 600 }}>
                                                ID: {selectedResume.id}
                                            </span>
                                            <button
                                                onClick={() => copyTextToClipboard(selectedResume.id, 'Copied Unique ID! 📋')}
                                                title="Copy Unique ID"
                                                style={{
                                                    background: 'none', border: 'none', padding: 2, cursor: 'pointer',
                                                    color: 'var(--text-faint)', display: 'inline-flex', alignItems: 'center'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.color = '#06b6d4'}
                                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                                            >
                                                <Copy size={11} />
                                            </button>
                                        </div>
                                        {selectedResume.fileUrl && (
                                            <div style={{ marginTop: 6 }}>
                                                <a 
                                                    href={`http://localhost:8090/api/v1/resumes/${selectedResume.id}/file?token=${encodeURIComponent(token)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        padding: '3px 8px',
                                                        borderRadius: 4,
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                        background: 'rgba(6,182,212,0.1)',
                                                        border: '1px solid rgba(6,182,212,0.2)',
                                                        color: '#06b6d4',
                                                        textDecoration: 'none',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,182,212,0.18)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(6,182,212,0.1)'}
                                                >
                                                    <FileText size={11} /> View Original ↗
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {/* Archive / Restore Button */}
                                    <button
                                        onClick={() => archiveMut.mutate({ id: selectedResume.id, archive: !selectedResume.archived })}
                                        title={selectedResume.archived ? "Restore Candidate" : "Archive Candidate"}
                                        className="btn-ghost"
                                        style={{ 
                                            padding: '4px 8px', fontSize: 10, fontWeight: 600,
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            background: selectedResume.archived ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                            color: selectedResume.archived ? '#10b981' : '#f59e0b',
                                            borderRadius: 6, border: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        {selectedResume.archived ? '📤 Restore' : '📦 Archive'}
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => {
                                            if (window.confirm("Are you sure you want to permanently delete this candidate? This will delete their resume, pgvector embeddings, screening reports, S3 files, and all chat history. This cannot be undone.")) {
                                                deleteMut.mutate(selectedResume.id)
                                            }
                                        }}
                                        title="Delete Permanently"
                                        className="btn-ghost"
                                        style={{ 
                                            padding: '4px 8px', fontSize: 10, fontWeight: 600,
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            background: 'rgba(244,63,94,0.1)',
                                            color: '#f43f5e',
                                            borderRadius: 6, border: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        🗑️ Delete
                                    </button>

                                    <button onClick={() => setSelectedResume(null)} className="btn-ghost" style={{ padding: 4 }}>
                                        <X size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Tabs Header */}
                            <div style={{
                                display: 'flex',
                                borderBottom: '1px solid var(--border)',
                                background: 'var(--bg-tertiary)',
                            }}>
                                <button
                                    onClick={() => setActiveTab('report')}
                                    style={{
                                        flex: 1, padding: '10px', border: 'none',
                                        borderBottom: activeTab === 'report' ? '2px solid var(--brand)' : '2px solid transparent',
                                        color: activeTab === 'report' ? 'var(--brand)' : 'var(--text-muted)',
                                        fontWeight: 600, fontSize: 12, background: 'none', cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    Screening Report
                                </button>
                                <button
                                    onClick={() => setActiveTab('chat')}
                                    style={{
                                        flex: 1, padding: '10px', border: 'none',
                                        borderBottom: activeTab === 'chat' ? '2px solid var(--brand)' : '2px solid transparent',
                                        color: activeTab === 'chat' ? 'var(--brand)' : 'var(--text-muted)',
                                        fontWeight: 600, fontSize: 12, background: 'none', cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    AI Chatbot
                                </button>
                                <button
                                    onClick={() => setActiveTab('document')}
                                    style={{
                                        flex: 1, padding: '10px', border: 'none',
                                        borderBottom: activeTab === 'document' ? '2px solid var(--brand)' : '2px solid transparent',
                                        color: activeTab === 'document' ? 'var(--brand)' : 'var(--text-muted)',
                                        fontWeight: 600, fontSize: 12, background: 'none', cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    Original File
                                </button>
                            </div>

                            {/* Panel Content */}
                            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                {activeTab === 'report' ? (
                                    <>
                                        <div>
                                            <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Status</span>
                                            <div style={{ marginTop: 4 }}>
                                                <StatusBadge status={selectedResume.status} />
                                            </div>
                                        </div>

                                        {selectedResume.status === 'SCREENED' ? (
                                            reportsLoading ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0' }}>
                                                    <div className="skeleton" style={{ height: 16, width: '40%', borderRadius: 6 }} />
                                                    <div className="skeleton" style={{ height: 42, width: '100%', borderRadius: 8 }} />
                                                    <div className="skeleton" style={{ height: 16, width: '60%', borderRadius: 6 }} />
                                                </div>
                                            ) : reports.length === 0 ? (
                                                <div style={{
                                                    padding: 12, borderRadius: 8, background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)',
                                                    fontSize: 12, color: 'var(--rose)', display: 'flex', gap: 8
                                                }}>
                                                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                                                    <span>No screening report available for this candidate.</span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                    {reports.length > 1 && (
                                                        <div>
                                                            <label className="label" style={{ fontSize: 10, fontWeight: 700 }}>Select Match Job Context</label>
                                                            <div style={{ position: 'relative', marginTop: 4 }}>
                                                                <select
                                                                    value={selectedReportJobId}
                                                                    onChange={e => setSelectedReportJobId(e.target.value)}
                                                                    className="input"
                                                                    style={{ fontSize: 12, paddingRight: 30, appearance: 'none', cursor: 'pointer' }}
                                                                >
                                                                    {reports.map(rep => {
                                                                        const j = jobs.find(job => job.id === rep.jobDescriptionId)
                                                                        return <option key={rep.jobDescriptionId} value={rep.jobDescriptionId}>{j?.title || 'Unknown Job'}</option>
                                                                    })}
                                                                </select>
                                                                <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {activeReport ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                            {/* Client Billing & Resource Card */}
                                                            <div style={{
                                                                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                                                padding: 14, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                    <Briefcase size={12} style={{ color: 'var(--brand)' }} />
                                                                    Client Billing & Resource Profile
                                                                </div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                                                                    <div>
                                                                        <span style={{ color: 'var(--text-faint)' }}>Total Experience:</span>
                                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                                                                            {getCandidateMetrics(selectedResume).totalExp} Years
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <span style={{ color: 'var(--text-faint)' }}>Availability:</span>
                                                                        <div style={{ fontWeight: 600, color: '#10b981', marginTop: 2 }}>
                                                                            {getCandidateMetrics(selectedResume).noticeDays}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <span style={{ color: 'var(--text-faint)' }}>Consulting Tier:</span>
                                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                                                                            {getCandidateMetrics(selectedResume).clientReady}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <span style={{ color: 'var(--text-faint)' }}>Billing Status:</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPitchDialogOpen(true)}
                                                                            style={{
                                                                                marginTop: 2, padding: '2px 8px', borderRadius: 4, fontSize: 10,
                                                                                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                                                                                color: '#10b981', cursor: 'pointer', display: 'block', fontWeight: 600
                                                                            }}
                                                                        >
                                                                            Pitch Client 📋
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Score Ring */}
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center', gap: 14,
                                                                background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.1)',
                                                                padding: 12, borderRadius: 10
                                                            }}>
                                                                <div style={{
                                                                    width: 48, height: 48, borderRadius: '50%',
                                                                    background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))',
                                                                    border: '2px solid #06b6d4',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontWeight: 800, fontSize: 13, color: '#06b6d4',
                                                                    boxShadow: '0 0 8px rgba(6,182,212,0.2)'
                                                                }}>
                                                                    {Math.round(activeReport.matchScore)}%
                                                                </div>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {jobs.find(j => j.id === activeReport.jobDescriptionId)?.title || 'Job Match'}
                                                                    </div>
                                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                                                        Match score · Confidence: {Math.round(activeReport.confidenceScore * 100)}%
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Matched Skills Chips */}
                                                            {(() => {
                                                                let checklist = [];
                                                                if (activeReport.requirementsChecklist) {
                                                                    try {
                                                                        const parsed = JSON.parse(activeReport.requirementsChecklist);
                                                                        if (Array.isArray(parsed)) checklist = parsed;
                                                                        else if (parsed && typeof parsed === 'object') {
                                                                            checklist = [
                                                                                ...(parsed.matched || []).map(m => ({ requirement: m.required || m.skill || '', status: 'Matched' })),
                                                                                ...(parsed.missing || []).map(m => ({ requirement: m.skill || m.required || '', status: 'Missing' }))
                                                                            ];
                                                                        }
                                                                    } catch(e) {}
                                                                }
                                                                const matchedSkills = checklist.filter(i => i.status === 'Matched').map(i => i.requirement);
                                                                const missingSkills = checklist.filter(i => i.status !== 'Matched').map(i => i.requirement);
                                                                // Extra skills: candidate has but not required by JD
                                                                const candidateSkills = (selectedResume.skills || '').split(',').map(s => s.trim()).filter(Boolean);
                                                                const allRequiredLower = checklist.map(i => (i.requirement || '').toLowerCase());
                                                                const extraSkills = candidateSkills.filter(s => !allRequiredLower.includes(s.toLowerCase()));
                                                                return (
                                                                    <>
                                                                        {/* Matched Skills */}
                                                                        <div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                                <Brain size={12} style={{ color: '#10b981' }} />
                                                                                Matched Skills ({matchedSkills.length})
                                                                            </div>
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                                                                {matchedSkills.length > 0 ? matchedSkills.map((s, i) => (
                                                                                    <span key={i} style={{
                                                                                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                                                                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                                                                                        color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 4
                                                                                    }}>
                                                                                        <span style={{ fontSize: 9 }}>✓</span> {s}
                                                                                    </span>
                                                                                )) : <span style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>None matched</span>}
                                                                            </div>
                                                                        </div>

                                                                        {/* Missing Skills */}
                                                                        <div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                                <HelpCircle size={12} style={{ color: '#f59e0b' }} />
                                                                                Missing Skills / Gaps ({missingSkills.length})
                                                                            </div>
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                                                                {missingSkills.length > 0 ? missingSkills.map((s, i) => (
                                                                                    <span key={i} style={{
                                                                                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                                                                        background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                                                                                        color: '#f43f5e', display: 'inline-flex', alignItems: 'center', gap: 4
                                                                                    }}>
                                                                                        <span style={{ fontSize: 9 }}>✗</span> {s}
                                                                                    </span>
                                                                                )) : <span style={{ fontSize: 11, color: '#10b981', fontStyle: 'italic' }}>All skills matched! 🎉</span>}
                                                                            </div>
                                                                        </div>

                                                                        {/* Extra / Bonus Skills */}
                                                                        {extraSkills.length > 0 && (
                                                                            <div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                                    <Sparkles size={12} style={{ color: '#a78bfa' }} />
                                                                                    Extra / Bonus Skills ({extraSkills.length})
                                                                                </div>
                                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                                                                    {extraSkills.map((s, i) => (
                                                                                        <span key={i} style={{
                                                                                            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                                                                            background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
                                                                                            color: '#a78bfa'
                                                                                        }}>
                                                                                            {s}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}

                                                            {/* Requirements Checklist */}
                                                            <div style={{ marginTop: 16 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                    <CheckCircle2 size={12} style={{ color: 'var(--brand)' }} />
                                                                    Requirements Match Checklist
                                                                </div>
                                                                <div style={{ marginTop: 8 }}>
                                                                    {(() => {
                                                                        let checklist = [];
                                                                        if (activeReport.requirementsChecklist) {
                                                                            try {
                                                                                const parsed = JSON.parse(activeReport.requirementsChecklist);
                                                                                if (Array.isArray(parsed)) {
                                                                                    // New flat format: [{requirement, status}]
                                                                                    checklist = parsed;
                                                                                } else if (parsed && typeof parsed === 'object') {
                                                                                    // Old nested format: {matched:[...], missing:[...]}
                                                                                    const matched = (parsed.matched || []).map(m => ({
                                                                                        requirement: m.required || m.skill || '',
                                                                                        status: 'Matched'
                                                                                    }));
                                                                                    const missing = (parsed.missing || []).map(m => ({
                                                                                        requirement: m.skill || m.required || '',
                                                                                        status: 'Missing'
                                                                                    }));
                                                                                    checklist = [...matched, ...missing];
                                                                                }
                                                                            } catch (e) {
                                                                                console.error('Checklist parse error:', e);
                                                                            }
                                                                        }
                                                                        if (checklist.length === 0) {
                                                                            return <div style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>No checklist comparison available.</div>;
                                                                        }
                                                                        
                                                                        const matched = checklist.filter(item => item.status === 'Matched');
                                                                        const missing = checklist.filter(item => item.status !== 'Matched');

                                                                        return (
                                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                                                                                {/* Matched column */}
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                                                                                        Matched ({matched.length})
                                                                                    </div>
                                                                                    {matched.map((item, idx) => (
                                                                                        <div key={idx} style={{
                                                                                            display: 'flex', alignItems: 'center', gap: 6,
                                                                                            padding: '6px 10px', borderRadius: 6,
                                                                                            background: 'rgba(16,185,129,0.04)',
                                                                                            border: '1px solid rgba(16,185,129,0.12)',
                                                                                            fontSize: 11, color: 'var(--text-primary)'
                                                                                        }}>
                                                                                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                                                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.requirement}>{item.requirement}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                {/* Missing column */}
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                                                                                        Missing ({missing.length})
                                                                                    </div>
                                                                                    {missing.map((item, idx) => (
                                                                                        <div key={idx} style={{
                                                                                            display: 'flex', alignItems: 'center', gap: 6,
                                                                                            padding: '6px 10px', borderRadius: 6,
                                                                                            background: 'rgba(244,63,94,0.03)',
                                                                                            border: '1px solid rgba(244,63,94,0.1)',
                                                                                            fontSize: 11, color: 'var(--text-primary)'
                                                                                        }}>
                                                                                            <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>✗</span>
                                                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.requirement}>{item.requirement}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>

                                                            {/* Summary */}
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                    <Sparkles size={12} style={{ color: 'var(--brand)' }} />
                                                                    Screening Summary
                                                                </div>
                                                                <div style={{
                                                                    marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
                                                                    padding: 16, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)'
                                                                }}>
                                                                    {renderSummary(activeReport.structuredSummary)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Loading report details...</div>
                                                    )}
                                                </div>
                                            )
                                        ) : (
                                            <div style={{
                                                padding: '16px 12px', border: '1px solid var(--border)', borderRadius: 10,
                                                background: 'var(--bg-tertiary)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
                                            }}>
                                                <Clock size={20} style={{ color: 'var(--text-muted)' }} />
                                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                    {selectedResume.status === 'FAILED' ? 'AI Screening Failed' : 'AI Screening In Progress'}
                                                </div>
                                                <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: 0 }}>
                                                    {selectedResume.status === 'FAILED'
                                                        ? 'Parsing error occurred. Re-upload with a different format.'
                                                        : 'Please wait. Resumes are parsed, indexed, and screened against recruiter jobs automatically.'}
                                                </p>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                                            <button
                                                onClick={() => setActiveTab('chat')}
                                                className="btn-primary"
                                                style={{ width: '100%', padding: '10px 14px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                            >
                                                <MessageSquare size={14} /> Chat about this Candidate Here
                                            </button>
                                            <button
                                                onClick={() => navigate(`/chat?resumeId=${selectedResume.id}${selectedReportJobId ? `&jobId=${selectedReportJobId}` : ''}`)}
                                                className="btn-secondary"
                                                style={{ width: '100%', padding: '8px 14px', fontSize: 11 }}
                                            >
                                                Open Fullscreen Pipeline Chat
                                            </button>
                                        </div>
                                    </>
                                ) : activeTab === 'chat' ? (
                                    /* Chatbot Tab */
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                        {/* Auto-speech toggle & 3D Robot row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                                            <div style={{ width: 100, height: 70 }}>
                                                <FuturisticRobot3D mood={chatLoading ? 'thinking' : 'idle'} height={70} />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSpeechEnabled(!speechEnabled);
                                                    if (!speechEnabled) {
                                                        toast.success('Text-to-speech enabled 🔊');
                                                    } else {
                                                        window.speechSynthesis.cancel();
                                                        toast.success('Text-to-speech disabled 🔇');
                                                    }
                                                }}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    color: speechEnabled ? 'var(--brand)' : 'var(--text-muted)'
                                                }}
                                            >
                                                {speechEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                                                {speechEnabled ? 'Read Aloud On' : 'Read Aloud Off'}
                                            </button>
                                        </div>

                                        {/* Scrollable messages area */}
                                        <div style={{
                                            flex: 1, overflowY: 'auto', padding: '14px 12px',
                                            display: 'flex', flexDirection: 'column', gap: 14,
                                            background: 'var(--bg-secondary)', borderRadius: 8,
                                            border: '1px solid var(--border)', minHeight: 200,
                                        }}>
                                            {chatMessages.map((msg, i) => (
                                                <div key={i} style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                    gap: 2,
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 600 }}>
                                                            {msg.role === 'user' ? 'You' : 'TalentAI'}
                                                        </span>
                                                        {msg.role !== 'user' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => speakText(msg.text)}
                                                                title="Speak/Mute Message"
                                                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}
                                                                onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
                                                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                                            >
                                                                <Volume2 size={11} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} style={msg.role === 'ai' ? { fontSize: 12, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' } : { fontSize: 12, padding: '8px 12px', whiteSpace: 'pre-line' }}>
                                                        {msg.role === 'ai' ? (
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                                                p: ({node, ...props}) => <p style={{ margin: 0, padding: 0 }} {...props} />,
                                                                ul: ({node, ...props}) => <ul style={{ margin: 0, paddingLeft: 20 }} {...props} />,
                                                                ol: ({node, ...props}) => <ol style={{ margin: 0, paddingLeft: 20 }} {...props} />,
                                                                li: ({node, ...props}) => <li style={{ margin: '4px 0' }} {...props} />,
                                                                h1: ({node, ...props}) => <h1 style={{ margin: '8px 0', fontSize: '1.2em', fontWeight: 'bold' }} {...props} />,
                                                                h2: ({node, ...props}) => <h2 style={{ margin: '8px 0', fontSize: '1.1em', fontWeight: 'bold' }} {...props} />,
                                                                h3: ({node, ...props}) => <h3 style={{ margin: '8px 0', fontSize: '1em', fontWeight: 'bold' }} {...props} />
                                                            }}>
                                                                {msg.text}
                                                            </ReactMarkdown>
                                                        ) : (
                                                            msg.text
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {chatLoading && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Thinking...</span>
                                                </div>
                                            )}
                                            <div ref={chatBottomRef} />
                                        </div>

                                        {/* Candidate Quick Info Panel - Education, Hackathon, Participation */}
                                        {(() => {
                                            const summary = activeReport?.structuredSummary || '';
                                            // Extract education section
                                            const eduMatch = summary.match(/###\s*EDUCATION[^\n]*\n([\s\S]*?)(?=###|$)/i);
                                            const extraMatch = summary.match(/###\s*EXTRACURRICULARS[^\n]*\n([\s\S]*?)(?=###|$)/i);
                                            const achieveMatch = summary.match(/###\s*ACHIEVEMENTS[^\n]*\n([\s\S]*?)(?=###|$)/i);
                                            const eduText = eduMatch ? eduMatch[1].trim() : null;
                                            const extraText = extraMatch ? extraMatch[1].trim() : null;
                                            const achieveText = achieveMatch ? achieveMatch[1].trim() : null;
                                            // Detect hackathon/participation keywords
                                            const fullText = (summary + ' ' + (selectedResume.skills || '')).toLowerCase();
                                            const hasHackathon = fullText.includes('hackathon') || fullText.includes('hack');
                                            const hasParticipation = fullText.includes('participation') || fullText.includes('competed') || fullText.includes('contest');
                                            if (!eduText && !extraText && !achieveText && !hasHackathon && !hasParticipation) return null;
                                            return (
                                                <div style={{
                                                    background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.12)',
                                                    borderRadius: 8, padding: 10, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8
                                                }}>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        📋 Candidate Profile Highlights
                                                    </div>
                                                    {eduText && (
                                                        <div>
                                                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>🎓 Education</div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{eduText.slice(0, 200)}{eduText.length > 200 ? '...' : ''}</div>
                                                        </div>
                                                    )}
                                                    {extraText && (
                                                        <div>
                                                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>🏆 Extracurriculars & Participation</div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{extraText.slice(0, 250)}{extraText.length > 250 ? '...' : ''}</div>
                                                        </div>
                                                    )}
                                                    {achieveText && (
                                                        <div>
                                                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>🏅 Achievements & Certifications</div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{achieveText.slice(0, 200)}{achieveText.length > 200 ? '...' : ''}</div>
                                                        </div>
                                                    )}
                                                    {(hasHackathon || hasParticipation) && !extraText && (
                                                        <div style={{ fontSize: 11, color: '#a78bfa' }}>⚡ Possible hackathon / competition participation detected — ask the bot for details!</div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Suggestions */}
                                        {chatMessages.length === 1 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                                {[
                                                    'Explain this resume',
                                                    'Show technical projects',
                                                    'What are the candidate gaps?',
                                                    'Any hackathon or college participation?',
                                                    'What schools or colleges attended?'
                                                ].map((s, idx) => (
                                                    <button key={idx} type="button" onClick={() => sendResumeChatMessage(s)} style={{
                                                        padding: '4px 8px', borderRadius: 6, fontSize: 10,
                                                        background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                                                        color: 'var(--text-secondary)', cursor: 'pointer'
                                                    }}>
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Form */}
                                        <form onSubmit={(e) => { e.preventDefault(); sendResumeChatMessage() }} style={{
                                            display: 'flex', gap: 8, marginTop: 12, alignItems: 'center'
                                        }}>
                                            <input
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                placeholder="Ask about this resume..."
                                                className="input"
                                                style={{ flex: 1, fontSize: 12, padding: '8px 12px' }}
                                                disabled={chatLoading}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendResumeChatMessage() } }}
                                            />
                                            <button type="submit" className="btn-primary" style={{ padding: '8px 12px' }} disabled={chatLoading || !chatInput.trim()}>
                                                Send
                                            </button>
                                        </form>
                                    </div>
                                ) : (
                                    /* Original Document Viewer Tab */
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                Original Resume File
                                            </span>
                                            {selectedResume.fileUrl && (
                                                <a 
                                                    href={`http://localhost:8090/api/v1/resumes/${selectedResume.id}/file?token=${encodeURIComponent(token)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="btn-secondary"
                                                    style={{ padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                                                >
                                                    Open in New Tab ↗
                                                </a>
                                            )}
                                        </div>
                                        {selectedResume.fileUrl && selectedResume.fileUrl.toLowerCase().endsWith('.pdf') ? (
                                            <iframe
                                                src={`http://localhost:8090/api/v1/resumes/${selectedResume.id}/file?token=${encodeURIComponent(token)}`}
                                                style={{ width: '100%', flex: 1, border: '1px solid var(--border)', borderRadius: 8, background: 'white', minHeight: 300 }}
                                                title="Resume Document"
                                            />
                                        ) : (
                                            <div style={{ 
                                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                                                border: '1px solid var(--border)', borderRadius: 8, padding: 24, textAlign: 'center', background: 'var(--bg-secondary)',
                                                minHeight: 300
                                            }}>
                                                <FileText size={44} style={{ color: 'var(--text-faint)', marginBottom: 12 }} />
                                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                                                    Word documents (.docx) cannot be previewed directly in the browser. You can download the file to view it.
                                                </p>
                                                {selectedResume.fileUrl ? (
                                                    <a 
                                                        href={`http://localhost:8090/api/v1/resumes/${selectedResume.id}/file?token=${encodeURIComponent(token)}`} 
                                                        className="btn-primary" 
                                                        style={{ padding: '8px 16px', fontSize: 12, textDecoration: 'none' }}
                                                    >
                                                        Download Document
                                                    </a>
                                                ) : (
                                                    <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>No file URL available</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Pipeline Copilot (Universal chat mode) */
                        <>
                            {/* Panel Header */}
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '12px 12px 0 0'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 9,
                                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 12px rgba(6,182,212,0.35)',
                                    }}>
                                        <Bot size={15} color="white" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Pipeline Copilot</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Query all resumes & jobs</div>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: 9, padding: '2px 6px', borderRadius: 20, fontWeight: 700,
                                    background: 'rgba(6,182,212,0.1)', color: '#06b6d4',
                                    border: '1px solid rgba(6,182,212,0.2)',
                                    letterSpacing: '0.04em',
                                }}>GLOBAL</span>
                            </div>

                            {/* Panel Content (Pipeline Chat) */}
                            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 100, height: 75 }}>
                                        <FuturisticRobot3D mood={pipelineLoading ? 'thinking' : 'idle'} height={75} />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSpeechEnabled(!speechEnabled);
                                            if (!speechEnabled) {
                                                toast.success('Text-to-speech enabled 🔊');
                                            } else {
                                                window.speechSynthesis.cancel();
                                                toast.success('Text-to-speech disabled 🔇');
                                            }
                                        }}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4,
                                            color: speechEnabled ? 'var(--brand)' : 'var(--text-muted)'
                                        }}
                                    >
                                        {speechEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                                        {speechEnabled ? 'Read Aloud On' : 'Read Aloud Off'}
                                    </button>
                                </div>

                                <div style={{
                                    flex: 1, overflowY: 'auto', padding: '14px 12px',
                                    display: 'flex', flexDirection: 'column', gap: 14,
                                    background: 'var(--bg-secondary)', borderRadius: 8,
                                    border: '1px solid var(--border)', minHeight: 200,
                                }}>
                                    {pipelineMessages.map((msg, i) => (
                                        <div key={i} style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                            gap: 2,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 600 }}>
                                                    {msg.role === 'user' ? 'You' : 'TalentAI'}
                                                </span>
                                                {msg.role !== 'user' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => speakText(msg.text)}
                                                        title="Speak/Mute Message"
                                                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
                                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                                    >
                                                        <Volume2 size={11} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} style={msg.role === 'ai' ? { fontSize: 12, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' } : { fontSize: 12, padding: '8px 12px', whiteSpace: 'pre-wrap' }}>
                                                {msg.role === 'ai' ? (
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                                        p: ({node, ...props}) => <p style={{ margin: 0, padding: 0 }} {...props} />,
                                                        ul: ({node, ...props}) => <ul style={{ margin: 0, paddingLeft: 20 }} {...props} />,
                                                        ol: ({node, ...props}) => <ol style={{ margin: 0, paddingLeft: 20 }} {...props} />,
                                                        li: ({node, ...props}) => <li style={{ margin: '4px 0' }} {...props} />,
                                                        h1: ({node, ...props}) => <h1 style={{ margin: '8px 0', fontSize: '1.2em', fontWeight: 'bold' }} {...props} />,
                                                        h2: ({node, ...props}) => <h2 style={{ margin: '8px 0', fontSize: '1.1em', fontWeight: 'bold' }} {...props} />,
                                                        h3: ({node, ...props}) => <h3 style={{ margin: '8px 0', fontSize: '1em', fontWeight: 'bold' }} {...props} />
                                                    }}>
                                                        {msg.text}
                                                    </ReactMarkdown>
                                                ) : (
                                                    msg.text
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {pipelineLoading && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Thinking...</span>
                                        </div>
                                    )}
                                    <div ref={pipelineBottomRef} />
                                </div>

                                {/* Suggestion pills */}
                                {pipelineMessages.length === 1 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {[
                                            'Who are the top candidates?',
                                            'Compare candidates experience',
                                            'List candidates with Node.js'
                                        ].map((s, idx) => (
                                            <button key={idx} type="button" onClick={() => sendPipelineChatMessage(s)} style={{
                                                padding: '4px 8px', borderRadius: 6, fontSize: 10,
                                                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                                                color: 'var(--text-secondary)', cursor: 'pointer'
                                            }}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Input form */}
                                <form onSubmit={(e) => { e.preventDefault(); sendPipelineChatMessage() }} style={{
                                    display: 'flex', gap: 8, alignItems: 'center'
                                }}>
                                    <input
                                        value={pipelineInput}
                                        onChange={(e) => setPipelineInput(e.target.value)}
                                        placeholder="Ask about any candidate or rankings..."
                                        className="input"
                                        style={{ flex: 1, fontSize: 12, padding: '8px 12px' }}
                                        disabled={pipelineLoading}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPipelineChatMessage() } }}
                                    />
                                    <button type="submit" className="btn-primary" style={{ padding: '8px 12px' }} disabled={pipelineLoading || !pipelineInput.trim()}>
                                        Send
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {pitchDialogOpen && (
                    <ClientPitchDialog
                        open={pitchDialogOpen}
                        onClose={() => setPitchDialogOpen(false)}
                        resume={selectedResume}
                        report={activeReport}
                        metrics={getCandidateMetrics(selectedResume)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}