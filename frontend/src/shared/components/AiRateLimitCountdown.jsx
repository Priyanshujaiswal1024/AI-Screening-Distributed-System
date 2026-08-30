import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, RefreshCw, Zap, Clock } from 'lucide-react'

/**
 * Reusable Groq AI Rate Limit & Token Cooldown Banner / Bubble
 * Shows a real-time countdown timer (in seconds) and an interactive Retry button.
 */
export default function AiRateLimitCountdown({ 
    initialSeconds = 12, 
    onRetry, 
    customMessage,
    compact = false 
}) {
    const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
    const [isRetrying, setIsRetrying] = useState(false)

    useEffect(() => {
        if (secondsLeft > 0) {
            const timer = setTimeout(() => {
                setSecondsLeft(prev => prev - 1)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [secondsLeft])

    const handleRetry = async () => {
        if (!onRetry || isRetrying) return
        try {
            setIsRetrying(true)
            await onRetry()
        } catch (err) {
            console.error('Retry failed:', err)
        } finally {
            setIsRetrying(false)
        }
    }

    const progressPct = (secondsLeft / initialSeconds) * 100

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(99,102,241,0.08))',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    boxShadow: '0 4px 16px rgba(245,158,11,0.12)',
                    fontSize: 12,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#f59e0b' }}>
                        <AlertCircle size={14} />
                        <span>{secondsLeft > 0 ? 'Groq Rate Limit Active' : 'Cooldown Complete!'}</span>
                    </div>
                    <span style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 99,
                        fontWeight: 800,
                        background: secondsLeft > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                        color: secondsLeft > 0 ? '#b45309' : '#047857',
                        border: `1px solid ${secondsLeft > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`
                    }}>
                        {secondsLeft > 0 ? `${secondsLeft}s left` : 'Ready'}
                    </span>
                </div>

                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.45 }}>
                    {customMessage || (secondsLeft > 0
                        ? `Groq free tier (8,000 TPM limit) reached. Token bucket resetting in ${secondsLeft}s...`
                        : 'Token bucket refreshed! Click below to send your request again.')}
                </p>

                {secondsLeft > 0 && (
                    <div style={{ width: '100%', height: 3, background: 'rgba(245,158,11,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: '100%' }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 1, ease: 'linear' }}
                            style={{ height: '100%', background: 'linear-gradient(90deg, #f59e0b, #6366f1)', borderRadius: 99 }}
                        />
                    </div>
                )}

                {onRetry && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleRetry}
                            disabled={isRetrying || secondsLeft > 0}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 12px',
                                borderRadius: 7,
                                fontSize: 11,
                                fontWeight: 700,
                                border: 'none',
                                cursor: (isRetrying || secondsLeft > 0) ? 'not-allowed' : 'pointer',
                                background: secondsLeft > 0
                                    ? 'var(--bg-tertiary)'
                                    : 'linear-gradient(135deg, #10b981, #059669)',
                                color: secondsLeft > 0 ? 'var(--text-muted)' : '#ffffff',
                                boxShadow: secondsLeft === 0 ? '0 2px 10px rgba(16,185,129,0.35)' : 'none',
                                opacity: secondsLeft > 0 ? 0.7 : 1,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {isRetrying ? (
                                <><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
                            ) : secondsLeft > 0 ? (
                                <><Clock size={11} /> Wait {secondsLeft}s</>
                            ) : (
                                <><Zap size={11} /> ⚡ Retry Now</>
                            )}
                        </motion.button>
                    </div>
                )}
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(245,158,11,0.09) 0%, rgba(99,102,241,0.06) 100%)',
                border: '1px solid rgba(245,158,11,0.35)',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 6px 24px rgba(245,158,11,0.08)',
                width: '100%',
                maxWidth: 620,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 11,
                        background: secondsLeft > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        color: secondsLeft > 0 ? '#d97706' : '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        flexShrink: 0,
                        boxShadow: `0 2px 10px ${secondsLeft > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`
                    }}>
                        {secondsLeft > 0 ? '⏳' : '⚡'}
                    </div>
                    <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {secondsLeft > 0 ? 'Groq AI Token Limit Reached' : 'Groq Token Cooldown Complete!'}
                            <span style={{
                                fontSize: 10,
                                padding: '2px 9px',
                                borderRadius: 99,
                                fontWeight: 800,
                                background: secondsLeft > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                                color: secondsLeft > 0 ? '#b45309' : '#047857',
                                border: `1px solid ${secondsLeft > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`
                            }}>
                                {secondsLeft > 0 ? `${secondsLeft}s Cooldown` : 'Ready to Request'}
                            </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                            {customMessage || (secondsLeft > 0
                                ? `Groq Free Tier (8,000 Tokens/Min limit) was reached during simultaneous AI operations. The token bucket will automatically replenish in ${secondsLeft} seconds.`
                                : 'The Groq API token bucket is replenished! Click below to send your message or re-evaluate.')}
                        </div>
                    </div>
                </div>

                {secondsLeft > 0 && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: 'var(--bg-primary)',
                        border: '2px solid #f59e0b',
                        boxShadow: '0 0 14px rgba(245,158,11,0.3)',
                        flexShrink: 0
                    }}>
                        <span style={{ fontSize: 17, fontWeight: 900, color: '#d97706', lineHeight: 1 }}>{secondsLeft}</span>
                        <span style={{ fontSize: 8.5, fontWeight: 800, color: 'var(--text-muted)' }}>SEC</span>
                    </div>
                )}
            </div>

            {secondsLeft > 0 && (
                <div style={{ width: '100%', height: 4, background: 'rgba(245,158,11,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div
                        initial={{ width: '100%' }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 1, ease: 'linear' }}
                        style={{ height: '100%', background: 'linear-gradient(90deg, #f59e0b, #6366f1)', borderRadius: 99 }}
                    />
                </div>
            )}

            {onRetry && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 2 }}>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRetry}
                        disabled={isRetrying || secondsLeft > 0}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '8px 16px',
                            borderRadius: 9,
                            fontSize: 12,
                            fontWeight: 700,
                            border: 'none',
                            cursor: (isRetrying || secondsLeft > 0) ? 'not-allowed' : 'pointer',
                            background: secondsLeft > 0
                                ? 'var(--bg-secondary)'
                                : 'linear-gradient(135deg, #10b981, #059669)',
                            color: secondsLeft > 0 ? 'var(--text-muted)' : '#ffffff',
                            boxShadow: secondsLeft === 0 ? '0 4px 14px rgba(16,185,129,0.35)' : 'none',
                            opacity: secondsLeft > 0 ? 0.7 : 1,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {isRetrying ? (
                            <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                        ) : secondsLeft > 0 ? (
                            <><Clock size={13} /> Unlocking in {secondsLeft}s...</>
                        ) : (
                            <><Zap size={13} /> ⚡ Retry Message</>
                        )}
                    </motion.button>
                </div>
            )}
        </motion.div>
    )
}
