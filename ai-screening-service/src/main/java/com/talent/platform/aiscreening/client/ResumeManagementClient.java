package com.talent.platform.aiscreening.client;

import com.talent.platform.aiscreening.dto.ResumeMetadataDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.UUID;

/**
 * Internal Feign client → resume-management-service.
 *
 * All endpoints are /internal/** — NOT exposed via API Gateway.
 *
 * WHY THIS EXISTS
 * ───────────────
 * Tools (CandidateRankingTool, CandidateSummaryTool, ResumeSearchTool,
 * InterviewQuestionTool, SkillGapAnalysisTool) were previously querying
 * candidate_resumes directly via JdbcTemplate — a hard cross-service
 * DB boundary violation.
 *
 * Every SELECT on candidate_resumes from ai-screening-service is now
 * a Feign call to resume-management-service, which owns that table.
 */
@FeignClient(
        name = "resume-management-service",
        path = "/internal",
        configuration = FeignClientConfig.class,
        fallbackFactory = ResumeManagementClientFallbackFactory.class
)
public interface ResumeManagementClient {

    // ── Used by AIScreeningService ────────────────────────────────────────────

    /** Fetch candidate name + email for a given resume. */
    @GetMapping("/resumes/{resumeId}/metadata")
    ResumeMetadataDto getResumeMetadata(@PathVariable("resumeId") UUID resumeId);

    /** Ask resume-management-service to update status on candidate_resumes. */
    @PutMapping("/resumes/{resumeId}/status")
    void updateResumeStatus(
            @PathVariable("resumeId") UUID resumeId,
            @RequestParam("status") String status
    );

    // ── Used by Tools ─────────────────────────────────────────────────────────

    /**
     * Search candidates — replaces the JdbcTemplate SELECT in ResumeSearchTool.
     * resume-management-service owns candidate_resumes; only it may query it.
     */
    @GetMapping("/resumes/search")
    List<CandidateSearchDto> searchCandidates(
            @RequestParam(value = "skillKeyword",   defaultValue = "") String skillKeyword,
            @RequestParam(value = "candidateName",  defaultValue = "") String candidateName,
            @RequestParam(value = "status",         defaultValue = "ALL") String status,
            @RequestParam(value = "limit",          defaultValue = "20") int limit
    );

    /**
     * Get full candidate info for the summary / ranking tools.
     * Returns name, email — same shape as metadata but named consistently.
     */
    @GetMapping("/resumes/{resumeId}/candidate-info")
    CandidateInfoDto getCandidateInfo(@PathVariable("resumeId") UUID resumeId);

    // ── Inner DTOs (owned here — just projection shapes) ─────────────────────

    record CandidateSearchDto(
            java.util.UUID resumeId,
            String candidateName,
            String candidateEmail,
            String status,
            String fileUrl
    ) {}

    record CandidateInfoDto(
            java.util.UUID resumeId,
            String candidateName,
            String candidateEmail
    ) {}
}