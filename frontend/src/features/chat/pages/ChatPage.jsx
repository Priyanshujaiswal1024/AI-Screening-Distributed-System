import React, { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, RefreshCw, ChevronDown, Bot, Trash2, Sparkles, User, Volume2, VolumeX } from 'lucide-react'
import { speakText, stopSpeaking } from '../../../shared/utils/speech'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { chatApi } from '../api/chatApi'
import { jobsApi } from '../../jobs/api/jobsApi'
import { resumesApi } from '../../resumes/api/resumesApi'
import { rankingApi } from '../../ranking/api/rankingApi'
import { useAuthStore } from '../../../shared/store/authStore'
import { useRobotStore } from '../../../shared/store/robotStore'
import FuturisticRobot3D from '../../../shared/components/robot/FuturisticRobot3D'

/* ── Typing animation ── */
function TypingDots() {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))',
                border: '1px solid rgba(6,182,212,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Bot size={13} style={{ color: '#06b6d4' }} />
            </div>
            <div className="chat-bubble-ai" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {[0, 1, 2].map(i => (
                    <span key={i} style={{
                        width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)',
                        display: 'inline-block',
                        animation: 'typing-bounce 1.1s ease-in-out infinite',
                        animationDelay: `${i * 0.15}s`,
                    }} />
                ))}
            </div>
        </div>
    )
}

/* ── Suggestion pills ── */
const SUGGESTIONS = [
    { text: 'Who are the top candidates?',              emoji: '🏆' },
    { text: 'What skill gaps does this candidate have?',emoji: '🔍' },
    { text: 'Generate interview questions',             emoji: '❓' },
    { text: 'Compare the top 3 candidates',             emoji: '📊' },
]

export default function ChatPage() {
    const [searchParams] = useSearchParams()
    const initJobId    = searchParams.get('jobId')    || ''
    const initResumeId = searchParams.get('resumeId') || ''

    const { recruiterId, email } = useAuthStore()
    const { setContext }         = useRobotStore()

    const [messages, setMessages] = useState([
        {
            role: 'ai',
            text: "Hi! I'm your Talent Intelligence Assistant. Ask me about candidates, rankings, or job fit — I'm powered by RAG with full context of your pipeline.",
            ts: new Date().toISOString(),
        }
    ])
    const [input, setInput]           = useState('')
    const [loading, setLoading]       = useState(false)
    const [conversationId, setConvId] = useState(null)
    const [selectedJobId, setJobId]   = useState(initJobId)
    const [selectedResumeId, setResume] = useState(initResumeId)
    const [mood, setMood]             = useState('idle')
    const [autoSpeak, setAutoSpeak]   = useState(() => localStorage.getItem('chat_autoSpeak') === 'true')
    const [speakingIndex, setSpeakingIndex] = useState(null)

    useEffect(() => {
        return () => {
            stopSpeaking()
        }
    }, [])

    const toggleAutoSpeak = () => {
        const newVal = !autoSpeak
        setAutoSpeak(newVal)
        localStorage.setItem('chat_autoSpeak', String(newVal))
        if (!newVal) {
            stopSpeaking()
            setSpeakingIndex(null)
        }
    }

    const handleSpeak = (text, index) => {
        if (speakingIndex === index) {
            stopSpeaking()
            setSpeakingIndex(null)
        } else {
            setSpeakingIndex(index)
            speakText(text,
                () => setSpeakingIndex(index),
                () => setSpeakingIndex(null),
                () => setSpeakingIndex(null)
            )
        }
    }

    const bottomRef = useRef(null)
    const inputRef  = useRef(null)

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
    useEffect(() => { setContext({ jobId: selectedJobId, resumeId: selectedResumeId }) }, [selectedJobId, selectedResumeId])

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

    const { data: reportsRes } = useQuery({
        queryKey: ['chatReports', selectedResumeId],
        queryFn: () => rankingApi.getReportsByResume(selectedResumeId),
        enabled: !!selectedResumeId,
    })
    const reports = reportsRes?.data || []
    const activeReport = reports.find(r => r.jobDescriptionId === selectedJobId) || reports[0]

    useEffect(() => {
        if (selectedResumeId && resumes.length > 0 && jobs.length > 0) {
            const candidate = resumes.find(r => r.id === selectedResumeId)
            const job = jobs.find(j => j.id === selectedJobId)
            const name = candidate?.candidateName || 'the candidate'
            const title = job?.title || 'the position'
            
            if (activeReport) {
                const strengths = activeReport.strengths || ''
                const gaps = activeReport.skillGaps || ''
                
                setMessages([
                    {
                        role: 'ai',
                        text: `Hi! I've loaded ${name}'s resume for the **${title}** role. Based on my screening, their match score is **${Math.round(activeReport.matchScore)}%**.\n\n` +
                              `✅ **Matched Skills:** ${strengths || 'None identified'}\n` +
                              `❌ **Missing from Job Requirements:** ${gaps && gaps.trim() && gaps !== 'None identified' ? gaps : '✨ None — all required skills matched!'}\n\n` +
                              `I've grounded my knowledge to their resume. Would you like me to generate targeted interview questions, or do you have specific questions about their background?`,
                        ts: new Date().toISOString(),
                    }
                ])
            } else {
                setMessages([
                    {
                        role: 'ai',
                        text: `Hi! I've loaded ${name}'s resume for the ${title} role. Ask me anything about their background, skills, or experience, and I will answer based on their resume context.`,
                        ts: new Date().toISOString(),
                    }
                ])
            }
        } else if (!selectedResumeId) {
            setMessages([
                {
                    role: 'ai',
                    text: "Hi! I'm your Talent Intelligence Assistant. Ask me about candidates, rankings, or job fit — I'm powered by RAG with full context of your pipeline.",
                    ts: new Date().toISOString(),
                }
            ])
        }
    }, [selectedResumeId, selectedJobId, resumes, jobs, activeReport])

    const send = async (e) => {
        e?.preventDefault()
        const text = input.trim()
        if (!text || loading) return

        setInput('')
        setMessages(prev => [...prev, { role: 'user', text, ts: new Date().toISOString() }])
        setLoading(true)
        setMood('thinking')

        try {
            const convId = conversationId || `chat-${email}-${Date.now()}`
            if (!conversationId) setConvId(convId)

            const res = await chatApi.sendMessage({
                message: text,
                jobId:          selectedJobId    || undefined,
                resumeId:       selectedResumeId || undefined,
                conversationId: convId,
            })

            const reply = res.data?.reply || res.data?.answer || 'No response received.'
            setMessages(prev => {
                const next = [...prev, { role: 'ai', text: reply, ts: new Date().toISOString() }]
                if (autoSpeak) {
                    const nextIndex = next.length - 1
                    setTimeout(() => {
                        speakText(reply,
                            () => setSpeakingIndex(nextIndex),
                            () => setSpeakingIndex(null),
                            () => setSpeakingIndex(null)
                        )
                    }, 50)
                }
                return next
            })
            setMood('happy')
            setTimeout(() => setMood('idle'), 2000)
        } catch (err) {
            let msg = err.response?.data?.message || 'Chat service unavailable. Ensure all backend services are running.'
            if (err.response?.status === 429 || msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
                msg = "Groq's AI limit reached, please try again after 20 seconds ⏳"
            }
            setMessages(prev => {
                const next = [...prev, { role: 'ai', text: msg, ts: new Date().toISOString() }]
                if (autoSpeak) {
                    const nextIndex = next.length - 1
                    setTimeout(() => {
                        speakText(msg,
                            () => setSpeakingIndex(nextIndex),
                            () => setSpeakingIndex(null),
                            () => setSpeakingIndex(null)
                        )
                    }, 50)
                }
                return next
            })
            setMood('sad')
            toast.error('Chat failed — check backend')
            setTimeout(() => setMood('idle'), 3000)
        } finally {
            setLoading(false)
        }
    }

    const clearChat = () => {
        stopSpeaking()
        setSpeakingIndex(null)
        setMessages([{ role: 'ai', text: 'Chat cleared. What would you like to know?', ts: new Date().toISOString() }])
        setConvId(null)
    }

    const sendSuggestion = (text) => {
        setInput(text)
        setTimeout(() => inputRef.current?.focus(), 50)
    }

    const filteredResumes = resumes.filter(r => ['PARSED', 'SCREENED', 'RANKED'].includes(r.status))

    return (
        <div className="chat-page-container">

            {/* ── Context sidebar ── */}
            <div className="chat-sidebar-container">

                {/* Context selectors */}
                <div className="card" style={{ padding: 16 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
                        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                        <Sparkles size={11} style={{ color: 'var(--brand)' }} />
                        Context
                    </div>

                    {/* Job select */}
                    <div style={{ marginBottom: 12 }}>
                        <label className="label">Job</label>
                        <div style={{ position: 'relative' }}>
                            <select value={selectedJobId} onChange={e => setJobId(e.target.value)} className="input"
                                style={{ paddingRight: 30, appearance: 'none', fontSize: 12 }}>
                                <option value="">No job selected</option>
                                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                            </select>
                            <ChevronDown size={12} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                        </div>
                    </div>

                    {/* Candidate select */}
                    <div>
                        <label className="label">Candidate</label>
                        <div style={{ position: 'relative' }}>
                            <select value={selectedResumeId} onChange={e => setResume(e.target.value)} className="input"
                                style={{ paddingRight: 30, appearance: 'none', fontSize: 12 }}>
                                <option value="">No candidate selected</option>
                                {filteredResumes
                                    .sort((a, b) => (a.candidateName || '').localeCompare(b.candidateName || ''))
                                    .map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.candidateName && r.candidateName !== 'Unknown'
                                                ? r.candidateName
                                                : `Resume ${r.id.slice(0, 8)}…`}
                                        </option>
                                    ))
                                }
                            </select>
                            <ChevronDown size={12} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 5 }}>
                            {filteredResumes.length} candidate{filteredResumes.length !== 1 ? 's' : ''} available
                        </div>
                    </div>

                    {/* Active context indicator */}
                    {(selectedJobId || selectedResumeId) && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            style={{
                                marginTop: 12, padding: '8px 10px', borderRadius: 8,
                                background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)',
                                fontSize: 11, color: 'var(--brand)', lineHeight: 1.7,
                            }}
                        >
                            {selectedJobId    && <div>📋 Job context active</div>}
                            {selectedResumeId && <div>👤 Candidate context active</div>}
                        </motion.div>
                    )}
                </div>

                {/* Robot mood */}
                <div className="card" style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
                    <div style={{ width: '100%', height: 165 }}>
                        <FuturisticRobot3D mood={loading ? 'thinking' : mood} active={loading} height={165} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500 }}>
                        {loading ? '🤔 Thinking...' : mood === 'happy' ? '😊 Got it!' : mood === 'sad' ? '😞 Something went wrong' : '🤖 Ready'}
                    </div>
                </div>

                {/* Suggestions */}
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                        Try asking
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {SUGGESTIONS.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => sendSuggestion(s.text)}
                                style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 7,
                                    padding: '7px 8px', borderRadius: 8, width: '100%', textAlign: 'left',
                                    background: 'none', border: '1px solid transparent',
                                    cursor: 'pointer', transition: 'all 0.12s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' }}
                            >
                                <span style={{ fontSize: 13, flexShrink: 0 }}>{s.emoji}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{s.text}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Chat main area ── */}
            <div className="chat-main-container">

                {/* Chat header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: 'var(--bg-primary)', borderRadius: '14px 14px 0 0',
                    border: '1px solid var(--border)', borderBottom: 'none',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: 10,
                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(6,182,212,0.35)',
                        }}>
                            <Bot size={16} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Recruiter Chat</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>RAG + Tools · Powered by Ollama</div>
                        </div>
                        <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                            background: 'rgba(6,182,212,0.1)', color: '#06b6d4',
                            border: '1px solid rgba(6,182,212,0.2)',
                            letterSpacing: '0.04em',
                        }}>LIVE</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button 
                            type="button"
                            onClick={toggleAutoSpeak} 
                            className="btn-ghost"
                            style={{ 
                                fontSize: 11, 
                                padding: '5px 10px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 6,
                                color: autoSpeak ? 'var(--brand)' : 'var(--text-muted)',
                            }}
                            title={autoSpeak ? "Disable auto read aloud" : "Enable auto read aloud"}
                        >
                            {autoSpeak ? <Volume2 size={13} style={{ color: 'var(--brand)' }} /> : <VolumeX size={13} />}
                            {autoSpeak ? 'Read Aloud: On' : 'Read Aloud: Off'}
                        </button>
                        <button onClick={clearChat} className="btn-ghost"
                            style={{ fontSize: 11, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Trash2 size={12} /> Clear chat
                        </button>
                    </div>
                </div>

                {/* Messages area */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '20px 18px',
                    display: 'flex', flexDirection: 'column', gap: 18,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    minHeight: 0,
                }}>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                gap: 4,
                            }}
                        >
                            {/* AI label */}
                            {msg.role === 'ai' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))',
                                        border: '1px solid rgba(6,182,212,0.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Bot size={11} style={{ color: '#06b6d4' }} />
                                    </div>
                                    <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600 }}>TalentAI</span>
                                    
                                    <button 
                                        type="button"
                                        onClick={() => handleSpeak(msg.text, i)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '2px 4px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            color: speakingIndex === i ? 'var(--brand)' : 'var(--text-faint)',
                                            transition: 'color 0.15s ease',
                                        }}
                                        title={speakingIndex === i ? "Stop speaking" : "Speak message"}
                                    >
                                        {speakingIndex === i ? (
                                            <>
                                                <Volume2 size={12} className="animate-pulse" style={{ color: 'var(--brand)' }} />
                                                <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand)' }}>Speaking...</span>
                                            </>
                                        ) : (
                                            <Volume2 size={12} />
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* User label */}
                            {msg.role === 'user' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                    <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600 }}>You</span>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <User size={11} color="white" />
                                    </div>
                                </div>
                            )}

                            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} style={msg.role === 'ai' ? { display: 'flex', flexDirection: 'column', gap: '0.5rem' } : {}}>
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
                            <span style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>
                                {msg.ts ? format(new Date(msg.ts), 'HH:mm') : ''}
                            </span>
                        </motion.div>
                    ))}
                    {loading && <TypingDots />}
                    <div ref={bottomRef} />
                </div>

                {/* Input area */}
                <form onSubmit={send} style={{
                    display: 'flex', gap: 10, padding: '12px 16px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)', borderTop: '1px solid var(--border)',
                    borderRadius: '0 0 14px 14px',
                    alignItems: 'flex-end',
                }}>
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={
                            selectedResumeId
                                ? 'Ask about this candidate...'
                                : selectedJobId
                                    ? 'Ask about candidates for this job...'
                                    : 'Ask anything about your talent pipeline...'
                        }
                        className="input"
                        style={{ flex: 1, fontSize: 13, resize: 'none' }}
                        disabled={loading}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e) }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="btn-primary"
                        style={{ padding: '10px 16px', flexShrink: 0 }}
                    >
                        {loading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                    </button>
                </form>
            </div>
        </div>
    )
}