package com.talent.platform.aiscreening.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.UUID;

/**
 * Internal Feign client → job-description-service.
 *
 * WHY THIS EXISTS
 * ───────────────
 * InterviewQuestionTool was querying job_descriptions and job_skills tables
 * directly via JdbcTemplate. Those tables are owned by job-description-service.
 *
 * CandidateRankingTool joins screening_reports → candidate_resumes
 * (candidate_resumes is resume-management-service's table).
 *
 * This client replaces ALL cross-service JdbcTemplate SQL in the tools.
 */
@FeignClient(
        name = "job-description-service",
        path = "/internal",
        configuration = FeignClientConfig.class
)
public interface JobDescriptionClient {

    /**
     * Get job title + required skills for a given job.
     * Replaces:
     *   SELECT title FROM job_descriptions WHERE id = ?
     *   SELECT skill FROM job_skills WHERE job_description_id = ?
     */
    @GetMapping("/jobs/{jobId}/details")
    JobDetailsDto getJobDetails(@PathVariable("jobId") UUID jobId);

    @GetMapping("/jobs/{jobId}/text")
    String getJobText(@PathVariable("jobId") UUID jobId);

    record JobDetailsDto(
            UUID jobId,
            String title,
            List<String> requiredSkills
    ) {}
}