import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    User, Mail, Building2, Lock, Sun, Moon, Save,
    RefreshCw, Shield, Phone, Zap, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../shared/store/authStore'
import { useThemeStore } from '../../../shared/store/themeStore'
import { settingsApi } from '../api/settngsApi'
import { authApi } from '../../auth/api/authApi'

function SectionCard({ title, subtitle, icon: Icon, iconGradient, children }) {
    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
                padding: '18px 22px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-tertiary)',
                display: 'flex', alignItems: 'center', gap: 12,
            }}>
                <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: iconGradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
                }}>
                    <Icon size={15} color="white" strokeWidth={2} />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{title}</div>
                    {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
                </div>
            </div>
            <div style={{ padding: 22 }}>{children}</div>
        </div>
    )
}

function IconInput({ icon: Icon, children }) {
    return (
        <div style={{ position: 'relative' }}>
            <Icon size={14} style={{
                position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1,
            }} />
            <div style={{ paddingLeft: 0 }}>{children}</div>
        </div>
    )
}

const TABS = [
    { id: 'profile',   label: 'Profile',    icon: User,   grad: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    { id: 'security',  label: 'Security',   icon: Shield, grad: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
    { id: 'appearance',label: 'Appearance', icon: Sun,    grad: 'linear-gradient(135deg, #f59e0b, #d97706)' },
]

export default function SettingsPage() {
    const { userId, email, role } = useAuthStore()
    const { isDark, toggle }      = useThemeStore()
    const [activeTab, setTab]     = useState('profile')

    const queryClient = useQueryClient()

    const { data: profileRes, isLoading: isProfileLoading } = useQuery({
        queryKey: ['profile', userId],
        queryFn: () => settingsApi.getProfile(userId),
        enabled: !!userId,
    })

    /* ── Profile form ── */
    const { register: regP, handleSubmit: submitP, reset: resetP } = useForm({
        defaultValues: { email: email || '', fullName: '', companyName: '', phone: '' },
    })

    useEffect(() => {
        if (profileRes?.data) {
            resetP({
                email: profileRes.data.email || email || '',
                fullName: profileRes.data.fullName || '',
                companyName: profileRes.data.companyName || '',
                phone: profileRes.data.phone || '',
            })
        }
    }, [profileRes, resetP, email])

    const profileMut = useMutation({
        mutationFn: (data) => settingsApi.updateProfile(userId, {
            email: data.email,
            companyName: data.companyName,
            fullName: data.fullName,
            phone: data.phone
        }),
        onSuccess: () => {
            toast.success('Profile updated ✓')
            queryClient.invalidateQueries({ queryKey: ['profile', userId] })
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
    })

    /* ── Send OTP for password reset ── */
    const sendOtpMut = useMutation({
        mutationFn: () => authApi.forgotPassword(email),
        onSuccess: () => toast.success(`OTP sent to ${email} ✓`),
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to send OTP'),
    })

    /* ── Password form ── */
    const { register: regW, handleSubmit: submitW, formState: { errors: errW }, reset: resetW, watch } = useForm()
    const newPwd = watch('newPassword')

    const pwdMut = useMutation({
        mutationFn: (data) => authApi.resetPassword({ email, otp: data.otp, newPassword: data.newPassword }),
        onSuccess: () => { toast.success('Password updated ✓'); resetW() },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed — check OTP'),
    })

    const initials = (email || '?').slice(0, 2).toUpperCase()

    return (
        <div style={{ maxWidth: 660 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                        Manage your account and preferences
                    </p>
                </div>
            </div>

            {/* Tab nav */}
            <div style={{
                display: 'flex', gap: 4, marginBottom: 24,
                borderBottom: '1px solid var(--border)', paddingBottom: 0,
            }}>
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setTab(id)} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '9px 14px', fontSize: 13, fontWeight: 600,
                        border: 'none', background: 'none', cursor: 'pointer',
                        color: activeTab === id ? 'var(--brand)' : 'var(--text-muted)',
                        borderBottom: `2px solid ${activeTab === id ? 'var(--brand)' : 'transparent'}`,
                        transition: 'all 0.15s', marginBottom: -1,
                    }}>
                        <Icon size={14} />
                        {label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
                >
                    {/* ── Profile tab ── */}
                    {activeTab === 'profile' && (
                        <>
                            {/* User identity card */}
                            <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{
                                    width: 60, height: 60, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 22, fontWeight: 800, color: 'white',
                                    boxShadow: '0 4px 16px rgba(6,182,212,0.35)',
                                }}>
                                    {initials}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>{email}</div>
                                    <span style={{
                                        fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 700,
                                        background: 'rgba(6,182,212,0.1)', color: '#06b6d4',
                                        border: '1px solid rgba(6,182,212,0.2)',
                                    }}>
                                        {role || 'RECRUITER'}
                                    </span>
                                </div>
                            </div>

                            <SectionCard
                                title="Profile Information"
                                subtitle="Update your account details"
                                icon={User}
                                iconGradient="linear-gradient(135deg, #06b6d4, #0891b2)"
                            >
                                {isProfileLoading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 0', gap: 8, color: 'var(--text-muted)' }}>
                                        <RefreshCw size={18} className="animate-spin" />
                                        <span>Loading profile details...</span>
                                    </div>
                                ) : (
                                    <form onSubmit={submitP(data => profileMut.mutate(data))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                            <div>
                                                <label className="label">Full name</label>
                                                <div style={{ position: 'relative' }}>
                                                    <User size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                    <input className="input" placeholder="Jane Doe" style={{ paddingLeft: 32 }} {...regP('fullName')} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label">Company</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Building2 size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                    <input className="input" placeholder="Acme Corp" style={{ paddingLeft: 32 }} {...regP('companyName')} />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label">Email <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(read-only)</span></label>
                                            <div style={{ position: 'relative' }}>
                                                <Mail size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input className="input" value={email || ''} readOnly style={{ paddingLeft: 32, opacity: 0.55, cursor: 'not-allowed' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label">Phone</label>
                                            <div style={{ position: 'relative' }}>
                                                <Phone size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input className="input" placeholder="+91 98765 43210" style={{ paddingLeft: 32 }} {...regP('phone')} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <button type="submit" className="btn-primary" disabled={profileMut.isPending}>
                                                {profileMut.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                                Save changes
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </SectionCard>
                        </>
                    )}

                    {/* ── Security tab ── */}
                    {activeTab === 'security' && (
                        <SectionCard
                            title="Change Password"
                            subtitle={`OTP will be sent to ${email}`}
                            icon={Shield}
                            iconGradient="linear-gradient(135deg, #8b5cf6, #6d28d9)"
                        >
                            <div style={{
                                padding: '12px 14px', borderRadius: 10, marginBottom: 20,
                                background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)',
                                fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Zap size={13} style={{ color: '#06b6d4', flexShrink: 0 }} />
                                    <span>Send an OTP to your email to verify password reset.</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => sendOtpMut.mutate()} 
                                    className="btn-primary" 
                                    style={{ padding: '6px 12px', fontSize: 11, flexShrink: 0 }}
                                    disabled={sendOtpMut.isPending}
                                >
                                    {sendOtpMut.isPending ? <RefreshCw size={12} className="animate-spin" /> : 'Send OTP'}
                                </button>
                            </div>
                            <form onSubmit={submitW(data => pwdMut.mutate(data))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label className="label">OTP code (from email)</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input className="input" placeholder="6-digit code" maxLength={6}
                                            style={{ paddingLeft: 32, letterSpacing: '0.25em', fontWeight: 700 }}
                                            {...regW('otp', { required: 'Required', minLength: { value: 6, message: '6 digits required' } })} />
                                    </div>
                                    {errW.otp && <p style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>{errW.otp.message}</p>}
                                </div>
                                <div>
                                    <label className="label">New password</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input type="password" className="input" placeholder="Min 8 characters"
                                            style={{ paddingLeft: 32 }}
                                            {...regW('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
                                    </div>
                                    {errW.newPassword && <p style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>{errW.newPassword.message}</p>}
                                </div>
                                <div>
                                    <label className="label">Confirm new password</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input type="password" className="input" placeholder="Repeat password"
                                            style={{ paddingLeft: 32 }}
                                            {...regW('confirm', { required: 'Required', validate: v => v === newPwd || 'Passwords do not match' })} />
                                    </div>
                                    {errW.confirm && <p style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>{errW.confirm.message}</p>}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button type="submit" className="btn-primary" disabled={pwdMut.isPending}>
                                        {pwdMut.isPending ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                        Update password
                                    </button>
                                </div>
                            </form>
                        </SectionCard>
                    )}

                    {/* ── Appearance tab ── */}
                    {activeTab === 'appearance' && (
                        <SectionCard
                            title="Appearance"
                            subtitle="Choose your preferred color scheme"
                            icon={Sun}
                            iconGradient="linear-gradient(135deg, #f59e0b, #d97706)"
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                {[
                                    { id: 'light', label: 'Light Mode', icon: Sun,  desc: 'Clean and bright interface' },
                                    { id: 'dark',  label: 'Dark Mode',  icon: Moon, desc: 'Easy on the eyes at night' },
                                ].map(({ id, label, icon: Icon, desc }) => {
                                    const isActive = (id === 'dark') === isDark
                                    return (
                                        <motion.button
                                            key={id}
                                            onClick={() => { if (!isActive) toggle() }}
                                            whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
                                            style={{
                                                padding: '20px 18px', borderRadius: 14, cursor: 'pointer',
                                                border: `2px solid ${isActive ? 'rgba(6,182,212,0.5)' : 'var(--border)'}`,
                                                background: isActive ? 'rgba(6,182,212,0.06)' : 'var(--bg-tertiary)',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                                                transition: 'all 0.2s', textAlign: 'center',
                                            }}
                                        >
                                            <div style={{
                                                width: 42, height: 42, borderRadius: 12,
                                                background: isActive ? 'rgba(6,182,212,0.12)' : 'var(--bg-primary)',
                                                border: `1px solid ${isActive ? 'rgba(6,182,212,0.2)' : 'var(--border)'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Icon size={20} style={{ color: isActive ? '#06b6d4' : 'var(--text-muted)' }} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#06b6d4' : 'var(--text-primary)', marginBottom: 3 }}>
                                                    {label}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
                                            </div>
                                            {isActive && (
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                                                    background: 'rgba(6,182,212,0.12)', color: '#06b6d4',
                                                    border: '1px solid rgba(6,182,212,0.2)',
                                                }}>
                                                    ✓ Active
                                                </span>
                                            )}
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </SectionCard>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}