import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Trash2, Minimize2, Volume2, VolumeX } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { speakText, stopSpeaking } from '../../utils/speech'
import { useRobotStore } from '../../store/robotStore'
import { useAuthStore } from '../../store/authStore'
import { chatApi } from '../../../features/chat/api/chatApi'
import RobotSVG from './RobotSVG'
import { cn } from '../../utils/cn'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function TypingDots() {
    return (
        <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl rounded-tl-sm border"
             style={{ background:'var(--bg-tertiary)', borderColor:'var(--border)', width:'fit-content' }}>
            {[0,1,2].map(i => (
                <span key={i} style={{
                    width:6, height:6, borderRadius:'50%', background:'#06b6d4',
                    display:'inline-block',
                    animation:`typing-bounce 1.1s ease-in-out infinite`,
                    animationDelay:`${i*0.15}s`,
                }}/>
            ))}
            <style>{`
        @keyframes typing-bounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}
      `}</style>
        </div>
    )
}

export default function FloatingRobot() {
    const {
        isOpen, toggle, close, mood, setMood,
        messages, addMessage, conversationId, setConversationId, clearMessages,
        currentJobId, currentResumeId, unreadCount,
    } = useRobotStore()

    const { email, recruiterId } = useAuthStore()
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [autoSpeak, setAutoSpeak] = useState(() => localStorage.getItem('robot_autoSpeak') === 'true')
    const [speakingIndex, setSpeakingIndex] = useState(null)

    useEffect(() => {
        return () => {
            stopSpeaking()
        }
    }, [])

    const toggleAutoSpeak = () => {
        const newVal = !autoSpeak
        setAutoSpeak(newVal)
        localStorage.setItem('robot_autoSpeak', String(newVal))
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
    const inputRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    useEffect(() => {
        if (isOpen) inputRef.current?.focus()
    }, [isOpen])

    const send = async (e) => {
        e.preventDefault()
        const text = input.trim()
        if (!text || loading) return

        setInput('')
        addMessage({ role: 'user', text })
        setLoading(true)
        setMood('thinking')

        try {
            const convId = conversationId || `robot-${email}-${Date.now()}`
            if (!conversationId) setConversationId(convId)

            const res = await chatApi.sendMessage({
                message: text,
                jobId: currentJobId || undefined,
                resumeId: currentResumeId || undefined,
                conversationId: convId,
            })

            const reply = res.data.reply
            addMessage({ role: 'ai', text: reply })
            if (autoSpeak) {
                const nextIndex = messages.length
                setTimeout(() => {
                    speakText(reply,
                        () => setSpeakingIndex(nextIndex),
                        () => setSpeakingIndex(null),
                        () => setSpeakingIndex(null)
                    )
                }, 50)
            }
            setMood('happy')
            setTimeout(() => setMood('idle'), 2000)
        } catch (err) {
            let errReply = 'I had trouble connecting to the backend. Make sure all services are running.'
            const msg = err.response?.data?.message || ''
            if (err.response?.status === 429 || msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
                errReply = "Groq's AI limit reached, please try again after 20 seconds ⏳"
            }
            addMessage({
                role: 'ai',
                text: errReply,
            })
            if (autoSpeak) {
                const nextIndex = messages.length
                setTimeout(() => {
                    speakText(errReply,
                        () => setSpeakingIndex(nextIndex),
                        () => setSpeakingIndex(null),
                        () => setSpeakingIndex(null)
                    )
                }, 50)
            }
            setMood('sad')
            setTimeout(() => setMood('idle'), 3000)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* Floating button */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity:0, y:20, scale:.95 }}
                            animate={{ opacity:1, y:0, scale:1 }}
                            exit={{ opacity:0, y:20, scale:.95 }}
                            transition={{ type:'spring', stiffness:340, damping:26 }}
                            style={{
                                width: 'calc(100vw - 32px)',
                                maxWidth: 360,
                                height: 'min(520px, calc(100vh - 100px))',
                                borderRadius: 20,
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border)',
                                boxShadow: '0 24px 60px rgba(0,0,0,.18)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                padding: '14px 16px',
                                borderBottom: '1px solid var(--border)',
                                background: '#09090b',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <div className="flex items-center gap-2.5">
                                    <RobotSVG size={34} mood={mood} active={loading} />
                                    <div>
                                        <div className="text-white font-semibold text-sm">Talent AI</div>
                                        <div className="flex items-center gap-1.5">
                      <span style={{
                          width:6, height:6, borderRadius:'50%',
                          background: loading ? '#a78bfa' : '#10b981',
                          display:'inline-block',
                          boxShadow: loading ? '0 0 6px #a78bfa' : '0 0 6px #10b981',
                      }}/>
                                            <span style={{ fontSize:11, color:'#71717a' }}>
                        {loading ? 'Thinking...' : 'Active'}
                      </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        type="button"
                                        onClick={toggleAutoSpeak} 
                                        className="btn-ghost p-1.5" 
                                        title={autoSpeak ? "Disable auto read aloud" : "Enable auto read aloud"}
                                        style={{ color: autoSpeak ? '#06b6d4' : '#52525b' }}
                                    >
                                        {autoSpeak ? <Volume2 size={14} style={{ color: '#06b6d4' }} /> : <VolumeX size={14} />}
                                    </button>
                                    <button onClick={() => { stopSpeaking(); setSpeakingIndex(null); clearMessages() }} className="btn-ghost p-1.5" title="Clear chat">
                                        <Trash2 size={14} style={{ color:'#52525b' }} />
                                    </button>
                                    <button onClick={close} className="btn-ghost p-1.5" title="Close">
                                        <Minimize2 size={14} style={{ color:'#52525b' }} />
                                    </button>
                                </div>
                            </div>

                            {/* Context pill */}
                            {(currentJobId || currentResumeId) && (
                                <div style={{
                                    padding: '6px 14px',
                                    background: 'rgba(6,182,212,.08)',
                                    borderBottom: '1px solid rgba(6,182,212,.15)',
                                    fontSize: 11, color:'#0891b2',
                                    display:'flex', gap:8,
                                }}>
                                    {currentJobId && <span>📋 Job context active</span>}
                                    {currentResumeId && <span>👤 Candidate context active</span>}
                                </div>
                            )}

                            {/* Messages */}
                            <div style={{ flex:1, overflowY:'auto', padding:'16px 14px', display:'flex', flexDirection:'column', gap:10 }}>
                                {messages.map((msg, i) => (
                                    <div key={i} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
                                        <div className="flex items-end gap-1.5" style={{ flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', maxWidth: '85%' }}>
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
                                            {msg.role === 'ai' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSpeak(msg.text, i)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        padding: 4,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: speakingIndex === i ? '#06b6d4' : '#52525b',
                                                        borderRadius: '50%',
                                                        transition: 'all 0.15s ease',
                                                        flexShrink: 0,
                                                    }}
                                                    title={speakingIndex === i ? "Stop speaking" : "Speak message"}
                                                >
                                                    {speakingIndex === i ? (
                                                        <Volume2 size={13} className="animate-pulse" />
                                                    ) : (
                                                        <Volume2 size={13} />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <span style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                      {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
                    </span>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex items-start">
                                        <TypingDots />
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={send} style={{
                                padding:'10px 12px',
                                borderTop:'1px solid var(--border)',
                                display:'flex', gap:8, alignItems:'center',
                            }}>
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Ask about candidates, jobs..."
                                    className="input flex-1"
                                    style={{ fontSize:13, padding:'8px 12px' }}
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || loading}
                                    className="btn-primary"
                                    style={{ padding:'8px 12px', flexShrink:0 }}
                                >
                                    <Send size={15} />
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Robot toggle button */}
                <motion.button
                    onClick={toggle}
                    whileHover={{ scale:1.05 }}
                    whileTap={{ scale:.95 }}
                    style={{
                        width:64, height:64, borderRadius:'50%',
                        background:'#09090b',
                        border:'2px solid rgba(6,182,212,.4)',
                        boxShadow:'0 8px 32px rgba(0,0,0,.3), 0 0 0 4px rgba(6,182,212,.1)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        cursor:'pointer', position:'relative', overflow:'visible',
                    }}
                >
                    <RobotSVG size={42} mood={isOpen ? 'idle' : mood} active={loading} />
                    {unreadCount > 0 && !isOpen && (
                        <motion.div
                            initial={{ scale:0 }}
                            animate={{ scale:1 }}
                            style={{
                                position:'absolute', top:-4, right:-4,
                                width:20, height:20, borderRadius:'50%',
                                background:'#06b6d4', color:'white',
                                fontSize:11, fontWeight:700,
                                display:'flex', alignItems:'center', justifyContent:'center',
                                border:'2px solid var(--bg-primary)',
                            }}
                        >
                            {unreadCount}
                        </motion.div>
                    )}
                </motion.button>
            </div>
        </>
    )
}