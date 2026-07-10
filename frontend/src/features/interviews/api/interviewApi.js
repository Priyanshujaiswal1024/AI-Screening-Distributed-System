import axios from '../../../shared/api/axios'

export const interviewApi = {
    // Schedule a single interview invite
    schedule: (data) =>
        axios.post('/api/v1/interviews', data),

    // Bulk schedule for top-N candidates
    scheduleBulk: (data) =>
        axios.post('/api/v1/interviews/bulk', data),

    // Get all interviews scheduled by recruiter
    getMyInterviews: () =>
        axios.get('/api/v1/interviews'),

    // Get interviews for a specific job
    getByJob: (jobId) =>
        axios.get(`/api/v1/interviews/job/${jobId}`),
}
