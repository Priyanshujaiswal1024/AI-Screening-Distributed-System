package com.talent.platform.aiscreening.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.UUID;

/**
 * Internal Feign client → candidate-ranking-service.
 *
 * WHY THIS EXISTS
 * ───────────────
 * CandidateRankingTool, CandidateSummaryTool, and InterviewQuestionTool
 * were all doing JdbcTemplate queries against screening_reports:
 *
 *   SELECT * FROM screening_reports WHERE job_description_id = ?
 *   SELECT * FROM screening_reports WHERE resume_id = ? AND job_description_id = ?
 *
 * screening_reports is owned by candidate-ranking-service — only it may
 * read/write that table. These Feign calls replace all direct SQL.
 */
@FeignClient(
        name = "candidate-ranking-service",
        path = "/internal",
        configuration = FeignClientConfig.class
)
public interface ScreeningReportClient {

    /**
     * Get ranked candidates for a job.
     * Replaces the big JOIN query in CandidateRankingTool.getRankedCandidates().
     */
    @GetMapping("/screening-reports/ranked")
    List<RankedCandidateDto> getRankedCandidates(
            @RequestParam("jobDescriptionId") UUID jobDescriptionId,
            @RequestParam("minScore") double minScore,
            @RequestParam("topN") int topN
    );

    /**
     * Get a single candidate's score for a job.
     * Replaces getCandidateScore() SQL in CandidateRankingTool.
     */
    @GetMapping("/screening-reports/score")
    RankedCandidateDto getCandidateScore(
            @RequestParam("resumeId") UUID resumeId,
            @RequestParam("jobDescriptionId") UUID jobDescriptionId
    );

    /**
     * Get the screening report for summary/interview tools.
     * Replaces queryForMap("SELECT match_score, strengths, skill_gaps, structured_summary …")
     */
    @GetMapping("/screening-reports/{resumeId}")
    ScreeningReportDto getScreeningReport(
            @PathVariable("resumeId") UUID resumeId,
            @RequestParam("jobDescriptionId") UUID jobDescriptionId
    );

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record RankedCandidateDto(
            UUID resumeId,
            String candidateName,
            String candidateEmail,
            double matchScore,
            double confidenceScore,
            int rank,
            String strengths,
            String skillGaps,
            String structuredSummary
    ) {}

    record ScreeningReportDto(
            UUID resumeId,
            UUID jobDescriptionId,
            double matchScore,
            String strengths,
            String skillGaps,
            String structuredSummary
    ) {}
}