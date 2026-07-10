import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './shared/store/authStore'

// Layout & Pages
import AppShell from './shared/components/layout/AppShell'
import AuthPage from './features/auth/pages/AuthPage.jsx'
import DashboardPage from './features/dashboard/pages/DashboardPage.jsx'
import JobsPage from './features/jobs/pages/JobsPage.jsx'
import ResumesPage from './features/resumes/pages/ResumesPage'
import RankingPage from './features/ranking/pages/RankingPage'
import ChatPage from './features/chat/pages/ChatPage'
import AnalyticsPage from './features/analytics/pages/AnalyticsPage.jsx'
import SettingsPage from './features/settings/pages/SettingsPage'

import RecruiterBanner from './shared/components/layout/RecruiterBanner'

const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <>
      <RecruiterBanner />
      <BrowserRouter>
        <Routes>
          {/* Auth Route */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected App Routes */}
          <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="resumes" element={<ResumesPage />} />
            <Route path="ranking" element={<RankingPage />} />
            <Route path="ranking/:jobId" element={<RankingPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}