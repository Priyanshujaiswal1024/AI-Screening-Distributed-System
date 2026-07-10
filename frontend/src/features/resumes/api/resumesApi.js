import { api, endpoints } from '../../../shared/api/axios'

export const resumesApi = {

    getByRecruiter: (recruiterId, archived = false) =>
        api.get(`${endpoints.resumes.byRecruiter(recruiterId)}?archived=${archived}`),

    getById: (id) =>
        api.get(endpoints.resumes.byId(id)),

    archive: (id, archive = true) =>
        api.put(`/api/v1/resumes/${id}/archive?archive=${archive}`),

    delete: (id) =>
        api.delete(`/api/v1/resumes/${id}`),

    upload: (file, recruiterId, jobId, candidateName, candidateEmail) => {
        const form = new FormData()
        form.append('file', file)
        form.append('recruiterId', recruiterId)
        if (jobId) form.append('jobId', jobId)
        if (candidateName)  form.append('candidateName', candidateName)
        if (candidateEmail) form.append('candidateEmail', candidateEmail)

        return api.post(endpoints.resumes.upload, form)
        // NOTE: do NOT set Content-Type manually for multipart —
        // axios sets it automatically with the correct boundary
    },

    uploadBulk: (files, recruiterId, jobId, onProgress) => {
        const form = new FormData()
        files.forEach(f => form.append('files', f))
        form.append('recruiterId', recruiterId)
        if (jobId) form.append('jobId', jobId)

        return api.post(endpoints.resumes.uploadBulk, form, {
            onUploadProgress: onProgress,
            // NOTE: no Content-Type header — axios handles multipart boundary automatically
        })
    },
}