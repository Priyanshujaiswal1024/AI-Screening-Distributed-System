package com.talent.platform.aiscreening.tools;

import com.talent.platform.aiscreening.client.ScreeningReportClient;
import com.talent.platform.aiscreening.tools.dto.ToolDtos;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Tool: CandidateRankingTool
 *
 * FIXED: Was doing a JdbcTemplate JOIN across:
 *   screening_reports  (candidate-ranking-service's table)
 *   candidate_resumes  (resume-management-service's table)
 *
 * Both are cross-service boundary violations from ai-screening-service.
 *
 * NOW:
 *   getRankedCandidates → Feign → candidate-ranking-service
 *     GET /internal/screening-reports/ranked?jobDescriptionId=&minScore=&topN=
 *   getCandidateScore   → Feign → candidate-ranking-service
 *     GET /internal/screening-reports/score?resumeId=&jobDescriptionId=
 *
 * candidate-ranking-service owns screening_reports AND may join
 * candidate_resumes via its own Feign client to resume-management-service.
 * The JOIN logic moves to where it belongs — into the owning service.
 *
 * JdbcTemplate REMOVED entirely from this class.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CandidateRankingTool {

    private final ScreeningReportClient screeningReportClient;
    // JdbcTemplate REMOVED — screening_reports and candidate_resumes are not our tables

    @Tool(description = """
            Retrieve ranked candidates for a specific job description.
            Use this tool when the recruiter asks for top candidates, rankings, or match scores.
            Requires a job description ID (UUID format).
            Returns candidates sorted by match score descending with strengths and skill gaps.
            """)
    public List<ToolDtos.RankedCandidate> getRankedCandidates(
            @ToolParam(description = "The job description UUID to retrieve rankings for") String jobDescriptionId,
            @ToolParam(description = "Minimum match score filter (0-100). Use 0 to include all.") double minScore,
            @ToolParam(description = "Maximum number of candidates to return (1-20)") int topN
    ) {
        log.info("[CandidateRankingTool] jobId='{}' minScore={} topN={}", jobDescriptionId, minScore, topN);

        int safeTopN = Math.min(Math.max(topN, 1), 20);

        try {
            UUID jobId = UUID.fromString(jobDescriptionId.trim());

            // Feign → candidate-ranking-service owns screening_reports
            List<ScreeningReportClient.RankedCandidateDto> ranked =
                    screeningReportClient.getRankedCandidates(jobId, minScore, safeTopN);

            List<ToolDtos.RankedCandidate> result = ranked.stream()
                    .map(dto -> new ToolDtos.RankedCandidate(
                            dto.resumeId(),
                            dto.candidateName(),
                            dto.candidateEmail(),
                            dto.matchScore(),
                            dto.confidenceScore(),
                            dto.rank(),
                            dto.strengths(),
                            dto.skillGaps(),
                            dto.structuredSummary()
                    ))
                    .toList();

            log.info("[CandidateRankingTool] Returning {} ranked candidates", result.size());
            return result;

        } catch (IllegalArgumentException e) {
            log.error("[CandidateRankingTool] Invalid UUID: {}", jobDescriptionId);
            return List.of();
        } catch (Exception e) {
            log.error("[CandidateRankingTool] Failed: {}", e.getMessage());
            return List.of();
        }
    }

    @Tool(description = """
            Get the match score and ranking details for a specific candidate and job combination.
            Use when the recruiter asks about one specific candidate's fit for a specific job.
            """)
    public ToolDtos.RankedCandidate getCandidateScore(

            @ToolParam(description = "The resume UUID of the candidate") String resumeId,
            @ToolParam(description = "The job description UUID") String jobDescriptionId
    ) {
        log.info("[CandidateRankingTool] getCandidateScore resumeId='{}' jobId='{}'",
                resumeId, jobDescriptionId);
        try {
            UUID rId = UUID.fromString(resumeId.trim());
            UUID jId = UUID.fromString(jobDescriptionId.trim());

            // Feign → candidate-ranking-service
            ScreeningReportClient.RankedCandidateDto dto =
                    screeningReportClient.getCandidateScore(rId, jId);

            if (dto == null) return null;

            return new ToolDtos.RankedCandidate(
                    dto.resumeId(),
                    dto.candidateName(),
                    dto.candidateEmail(),
                    dto.matchScore(),
                    dto.confidenceScore(),
                    dto.rank(),
                    dto.strengths(),
                    dto.skillGaps(),
                    dto.structuredSummary()
            );
        } catch (Exception e) {
            log.error("[CandidateRankingTool] getCandidateScore failed: {}", e.getMessage());
            return null;
        }
    }
}