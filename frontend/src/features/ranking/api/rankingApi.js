import { api } from '../../../shared/api/axios'
import { endpoints } from '../../../shared/api/endpoints'

export const rankingApi = {
    getRanked:     (jobId)             => api.get(endpoints.rankingByJob(jobId)),
    getRaw:        (jobId)             => api.get(endpoints.rankingRaw(jobId)),
    triggerScreen: (jobId, resumeId)   => api.post(endpoints.screenTrigger, { jobId, resumeId }),
    getReport:     (resumeId, jobId)   => api.get(`/api/v1/ranking/report/${resumeId}?jobId=${jobId}`),
    getReportsByResume: (resumeId)     => api.get(`/api/v1/ranking/reports/resume/${resumeId}`),
}