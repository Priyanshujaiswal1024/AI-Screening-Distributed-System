import { api, endpoints } from '../../../shared/api/axios'

/**
 * jobsApi.js
 *
 * Maps to JobDescriptionController endpoints:
 *   POST   /api/v1/jobs                         → create
 *   GET    /api/v1/jobs/recruiter/:recruiterId   → getByRecruiter
 *   GET    /api/v1/jobs/:id                      → getById
 *   PUT    /api/v1/jobs/:id                      → update
 *   DELETE /api/v1/jobs/:id                      → delete
 *
 * CreateJobRequest (backend DTO) requires:
 *   - recruiterId: UUID  (@NotNull)   ← comes from authStore.recruiterId
 *   - title: string      (@NotBlank)
 *   - rawText: string    (@NotBlank)
 *   - keySkills: string[] (@NotEmpty) ← must be non-empty array, not string
 *   - minExperienceYears: int (@Min(0) @Max(30))
 */
export const jobsApi = {
    /**
     * GET /api/v1/jobs/recruiter/:recruiterId
     * Returns all jobs for this recruiter.
     */
    getByRecruiter: (recruiterId) =>
        api.get(endpoints.jobs.byRecruiter(recruiterId)),

    /**
     * GET /api/v1/jobs/:id
     */
    getById: (id) =>
        api.get(endpoints.jobs.byId(id)),

    /**
     * POST /api/v1/jobs
     *
     * Payload shape expected by backend:
     * {
     *   recruiterId: "uuid",          ← authStore.recruiterId (=== userId)
     *   title: "Senior Java Dev",
     *   rawText: "Full description...",
     *   keySkills: ["Java", "Kafka"], ← array, not comma-string
     *   minExperienceYears: 3
     * }
     *
     * JobsPage sends this correctly via onSubmit():
     *   keySkills: data.keySkills.split(',').map(s => s.trim()).filter(Boolean)
     *   recruiterId comes from useAuthStore().recruiterId
     */
    create: (data) =>
        api.post(endpoints.jobs.create, data),

    /**
     * PUT /api/v1/jobs/:id
     */
    update: (id, data) =>
        api.put(endpoints.jobs.byId(id), data),

    /**
     * DELETE /api/v1/jobs/:id
     * Returns 204 No Content on success.
     */
    delete: (id) =>
        api.delete(endpoints.jobs.byId(id)),
}