import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, Briefcase, FileText, BarChart3,
    MessageSquare, Settings, LogOut, Sun, Moon,
    ChevronLeft, ChevronRight, Zap, TrendingUp, Menu, X, Calendar
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import FloatingRobot from '../robot/FloatingRobot'
import { cn } from '../../utils/cn'

const NAV = [
    { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',     color: '#06b6d4' },
    { to: '/jobs',       icon: Briefcase,       label: 'Jobs',          color: '#8b5cf6' },
    { to: '/resumes',    icon: FileText,        label: 'Resumes',       color: '#10b981' },
    { to: '/ranking',    icon: TrendingUp,      label: 'Rankings',      color: '#f59e0b' },
    { to: '/interviews', icon: Calendar,        label: 'Interviews',    color: '#ec4899' },
    { to: '/chat',       icon: MessageSquare,   label: 'Recruiter Chat',color: '#06b6d4' },
    { to: '/analytics',  icon: BarChart3,       label: 'Analytics',     color: '#f43f5e' },
    { to: '/settings',   icon: Settings,        label: 'Settings',      color: '#64748b' },
]

function UserAvatar({ email, size = 32 }) {
    const initials = email ? email.slice(0, 2).toUpperCase() : '?'
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: size * 0.35, fontWeight: 700, color: 'white',
            boxShadow: '0 2px 8px rgba(6,182,212,0.35)',
        }}>
            {initials}
        </div>
    )
}

function Sidebar({ collapsed, setCollapsed }) {
    const { logout, email } = useAuthStore()
    const { isDark, toggle } = useThemeStore()
    const navigate = useNavigate()

    return (
        <aside style={{
            width: collapsed ? 68 : 232,
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'hidden',
        }}>

            {/* Ambient glow top */}
            <div style={{
                position: 'absolute', top: -40, left: -40,
                width: 160, height: 160,
                background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Logo area */}
            <div style={{
                padding: collapsed ? '16px 0' : '16px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                gap: 8,
            }}>
                <AnimatePresence mode="wait">
                    {!collapsed ? (
                        <motion.div
                            key="full"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}
                        >
                            <div style={{
                                width: 30, height: 30, borderRadius: 9,
                                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(6,182,212,0.4)',
                                flexShrink: 0,
                            }}>
                                <Zap size={16} color="white" strokeWidth={2.5} fill="white" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1 }}>
                                    TalentIQ
                                </div>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                                    AI SCREENING
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="icon"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            style={{
                                width: 34, height: 34, borderRadius: 10,
                                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(6,182,212,0.4)',
                            }}
                        >
                            <Zap size={18} color="white" strokeWidth={2.5} fill="white" />
                        </motion.div>
                    )}
                </AnimatePresence>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="btn-ghost"
                    style={{ padding: 5, flexShrink: 0 }}
                    title={collapsed ? 'Expand' : 'Collapse'}
                >
                    {collapsed
                        ? <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                        : <ChevronLeft  size={14} style={{ color: 'var(--text-muted)' }} />
                    }
                </button>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {NAV.map(({ to, icon: Icon, label, color }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => cn('sidebar-link', isActive && 'active')}
                        style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                        title={collapsed ? label : undefined}
                    >
                        {({ isActive }) => (
                            <>
                                <div style={{
                                    width: 28, height: 28, borderRadius: 8,
                                    background: isActive ? `${color}18` : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, transition: 'all 0.15s',
                                }}>
                                    <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8}
                                        style={{ color: isActive ? color : 'var(--text-muted)', transition: 'color 0.15s' }} />
                                </div>
                                {!collapsed && (
                                    <span style={{
                                        fontSize: 13, overflow: 'hidden', whiteSpace: 'nowrap',
                                        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                                    }}>
                                        {label}
                                    </span>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '0 8px' }} />

            {/* Bottom section */}
            <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Theme toggle */}
                <button
                    onClick={toggle}
                    className="sidebar-link"
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                    title="Toggle theme"
                >
                    <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        {isDark
                            ? <Sun  size={15} strokeWidth={1.8} style={{ color: 'var(--amber)' }} />
                            : <Moon size={15} strokeWidth={1.8} style={{ color: '#8b5cf6' }} />
                        }
                    </div>
                    {!collapsed && (
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            {isDark ? 'Light mode' : 'Dark mode'}
                        </span>
                    )}
                </button>

                {/* User info */}
                {!collapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            padding: '10px 12px', borderRadius: 10,
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border)',
                            margin: '4px 0',
                            display: 'flex', alignItems: 'center', gap: 9,
                        }}
                    >
                        <UserAvatar email={email} size={28} />
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontSize: 11, fontWeight: 600,
                                color: 'var(--text-primary)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                                {email?.split('@')[0]}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Recruiter</div>
                        </div>
                    </motion.div>
                )}

                {/* Logout */}
                <button
                    onClick={() => { logout(); navigate('/auth') }}
                    className="sidebar-link"
                    style={{ color: 'var(--rose)', justifyContent: collapsed ? 'center' : 'flex-start' }}
                    title="Sign out"
                >
                    <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <LogOut size={15} strokeWidth={1.8} />
                    </div>
                    {!collapsed && <span style={{ fontSize: 13 }}>Sign out</span>}
                </button>
            </div>
        </aside>
    )
}

export default function AppShell() {
    const [collapsed, setCollapsed]   = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-secondary)' }}>

            {/* Desktop sidebar */}
            <div className="hidden md:block">
                <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            </div>

            {/* Mobile sidebar overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, backdropFilter: 'blur(4px)' }}
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.div
                            initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                            style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50 }}
                        >
                            <Sidebar collapsed={false} setCollapsed={() => setMobileOpen(false)} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                {/* Mobile topbar */}
                <div
                    className="md:hidden"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        backdropFilter: 'blur(12px)',
                        position: 'sticky', top: 0, zIndex: 30,
                    }}
                >
                    <button onClick={() => setMobileOpen(true)} className="btn-ghost" style={{ padding: 8 }}>
                        <Menu size={20} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 26, height: 26, borderRadius: 7,
                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(6,182,212,0.4)',
                        }}>
                            <Zap size={14} color="white" fill="white" />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.02em' }}>TalentIQ</span>
                    </div>
                    <div style={{ width: 36 }} />
                </div>

                {/* Page content */}
                <main className="app-main-content">
                    <Outlet />
                </main>
            </div>

            <FloatingRobot />
        </div>
    )
}