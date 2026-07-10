export const endpoints = {
    // Auth Service
    signupOtp:      '/api/v1/auth/signup-otp',
    verifyOtp:      '/api/v1/auth/verify-otp',
    resendOtp:      '/api/v1/auth/resend-otp',
    login:          '/api/v1/auth/login',
    forgotPassword: '/api/v1/auth/forgot-password',
    resetPassword:  '/api/v1/auth/reset-password',
    changePassword: '/api/v1/auth/change-password',

    // User Management Service
    users:        '/api/v1/users',
    userById:     (id)    => `/api/v1/users/${id}`,
    userByEmail:  (email) => `/api/v1/users/email/${email}`,
    updateUser:   (id)    => `/api/v1/users/${id}`,

    // Job Description Service
    jobs: {
        create:      '/api/v1/jobs',
        byId:        (id)  => `/api/v1/jobs/${id}`,
        byRecruiter: (rid) => `/api/v1/jobs/recruiter/${rid}`,
    },

    // Resume Management Service
    resumes: {
        upload:      '/api/v1/resumes/upload',
        uploadBulk:  '/api/v1/resumes/upload-bulk',
        byId:        (id)  => `/api/v1/resumes/${id}`,
        byRecruiter: (rid) => `/api/v1/resumes/recruiter/${rid}`,
    },

    // AI Screening
    screening: {
        screen: '/api/v1/screening/screen',
        ollama: '/api/v1/screening/ollama',
    },

    // Ranking — flat keys for rankingApi.js compatibility
    rankingByJob:  (jobId) => `/api/v1/ranking/${jobId}`,
    rankingRaw:    (jobId) => `/api/v1/ranking/raw/${jobId}`,
    screenTrigger: '/api/v1/screening/screen',

    ranking: {
        byJob: (jobId) => `/api/v1/ranking/${jobId}`,
        raw:   (jobId) => `/api/v1/ranking/raw/${jobId}`,
    },

    // Chat — flat keys for chatApi.js compatibility
    chatMessage:  '/api/v1/chat/message',
    copilotChat:  '/api/v1/copilot/chat',

    chat: {
        message:            '/api/v1/chat/message',
        interviewQuestions: (resumeId) => `/api/v1/chat/interview-questions/${resumeId}`,
        sessions:           (id)       => `/api/v1/chat/sessions/${id}`,
    },
}