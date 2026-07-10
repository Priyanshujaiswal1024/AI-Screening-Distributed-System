import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { useAuthStore } from '../shared/store/authStore'
import { useThemeStore } from '../shared/store/themeStore'

// Layout
import AppShell from '../shared/components/layout/AppShell'

// Pages
import AuthPage       from '../features/auth/pages/AuthPage'
import DashboardPage  from '../features/dashboard/pages/DashboardPage'
import JobsPage       from '../features/jobs/pages/JobsPage'
import ResumesPage    from '../features/resumes/pages/ResumesPage'
import RankingPage    from '../features/ranking/pages/RankingPage'
import InterviewsPage from '../features/interviews/pages/InterviewsPage'
import ChatPage       from '../features/chat/pages/ChatPage'
import AnalyticsPage  from '../features/analytics/pages/AnalyticsPage'
import SettingsPage   from '../features/settings/pages/SettingsPage'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 30_000,
        },
    },
})

function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuthStore()
    return isAuthenticated ? children : <Navigate to="/auth" replace />
}

function ThemeInit() {
    const { init } = useThemeStore()
    useEffect(() => { init() }, [])
    return null
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeInit />
            <BrowserRouter>
                <Routes>
                    {/* Public */}
                    <Route path="/auth" element={<AuthPage />} />

                    {/* Protected — wrapped in AppShell */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <AppShell />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard"   element={<DashboardPage />} />
                        <Route path="jobs"        element={<JobsPage />} />
                        <Route path="resumes"     element={<ResumesPage />} />
                        <Route path="ranking"     element={<RankingPage />} />
                        <Route path="ranking/:jobId" element={<RankingPage />} />
                        <Route path="interviews"  element={<InterviewsPage />} />
                        <Route path="chat"        element={<ChatPage />} />
                        <Route path="analytics"   element={<AnalyticsPage />} />
                        <Route path="settings"    element={<SettingsPage />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>

            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#18181b',
                        color: '#fafafa',
                        border: '1px solid #27272a',
                        fontSize: 13,
                    },
                    success: { iconTheme: { primary: '#06b6d4', secondary: '#fff' } },
                }}
            />
        </QueryClientProvider>
    )
}