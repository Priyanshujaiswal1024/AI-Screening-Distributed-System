package com.talent.platform.aiscreening.tools;

import com.talent.platform.aiscreening.client.ResumeManagementClient;
import com.talent.platform.aiscreening.client.ScreeningReportClient;
import com.talent.platform.aiscreening.repository.ResumeChunkRepository;
import com.talent.platform.aiscreening.tools.dto.ToolDtos;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Tool: CandidateSummaryTool
 *
 * FIXED: Was doing JdbcTemplate queries on:
 *   candidate_resumes  (owned by resume-management-service)      ← VIOLATION
 *   screening_reports  (owned by candidate-ranking-service)      ← VIOLATION
 *   resume_chunks      (owned by ai-screening-service)           ← OK
 *
 * NOW:
 *   candidate_resumes  → Feign → resume-management-service
 *     GET /internal/resumes/{resumeId}/candidate-info
 *
 *   screening_reports  → Feign → candidate-ranking-service
 *     GET /internal/screening-reports/{resumeId}?jobDescriptionId=
 *
 *   resume_chunks      → ResumeChunkRepository (our own table — no change needed)
 *
 * JdbcTemplate REMOVED entirely. ChatClient kept for AI summary generation.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CandidateSummaryTool {

    // Own table — repository is fine
    private final ResumeChunkRepository chunkRepository;

    // Cross-service data — Feign only
    private final ResumeManagementClient resumeManagementClient;
    private final ScreeningReportClient  screeningReportClient;

    private final ChatClient chatClient;

    @Tool(description = """
            Generate an executive AI summary for a candidate.
            Use this when the recruiter asks for a summary, overview, or hiring recommendation for a candidate.
            Requires the resume ID and optionally a job description ID for context.
            Returns an executive summary with hiring recommendation (STRONG_HIRE / HIRE / MAYBE / NO_HIRE).
            """)
    public ToolDtos.CandidateSummary generateCandidateSummary(
            @ToolParam(description = "The resume UUID of the candidate") String resumeId,
            @ToolParam(description = "The job description UUID for context. Pass empty string if not job-specific.") String jobDescriptionId
    ) {
        log.info("[CandidateSummaryTool] resumeId='{}' jobId='{}'", resumeId, jobDescriptionId);

        try {
            UUID rId = UUID.fromString(resumeId.trim());

            // ── Step 1: Fetch candidate info via Feign ────────────────────────
            // REPLACED: jdbcTemplate.queryForMap("SELECT candidate_name, candidate_email
            //            FROM candidate_resumes WHERE id = ?", rId)
            ResumeManagementClient.CandidateInfoDto candidateInfo =
                    resumeManagementClient.getCandidateInfo(rId);

            String name  = candidateInfo.candidateName();
            String email = candidateInfo.candidateEmail();

            // ── Step 2: Fetch screening report via Feign ──────────────────────
            // REPLACED: jdbcTemplate.queryForMap("SELECT match_score, strengths, skill_gaps,
            //            structured_summary FROM screening_reports WHERE resume_id = ?
            //            AND job_description_id = ?", rId, jId)
            String strengths = "No screening data available.";
            String gaps      = "No screening data available.";
            String summary   = "No structured summary available.";
            double score     = 0.0;

            if (jobDescriptionId != null && !jobDescriptionId.isBlank()) {
                try {
                    UUID jId = UUID.fromString(jobDescriptionId.trim());
                    ScreeningReportClient.ScreeningReportDto report =
                            screeningReportClient.getScreeningReport(rId, jId);

                    if (report != null) {
                        score     = report.matchScore();
                        strengths = report.strengths();
                        gaps      = report.skillGaps();
                        summary   = report.structuredSummary();
                    }
                } catch (Exception e) {
                    log.warn("[CandidateSummaryTool] No screening report found: {}", e.getMessage());
                }
            }

            // ── Step 3: Fetch resume chunks — OUR OWN TABLE, repository is fine ──
            // resume_chunks belongs to ai-screening-service → no boundary violation
            List<String> topChunks = chunkRepository.findByResumeId(rId)
                    .stream()
                    .limit(3)
                    .map(chunk -> chunk.getContent())
                    .toList();
            String resumeContext = String.join("\n\n", topChunks);

            // ── Step 4: Generate AI summary ───────────────────────────────────
            final String finalStrengths = strengths;
            final String finalGaps      = gaps;
            final String finalSummary   = summary;
            final double finalScore     = score;
            final String finalName      = name;
            final String safeContext    = resumeContext.substring(
                    0, Math.min(800, resumeContext.length()));

            String aiSummary = chatClient.prompt()
                    .user(u -> u.text("""
                            Generate a concise executive summary for this candidate.
                            
                            Candidate: {name}
                            Match Score: {score}%
                            Strengths: {strengths}
                            Skill Gaps: {gaps}
                            Summary: {summary}
                            Resume Excerpt: {resume}
                            
                            Provide:
                            1. executiveSummary (2-3 sentences)
                            2. topStrengths (3 bullet points)
                            3. redFlags (any concerns, or "None identified")
                            4. hiringRecommendation: STRONG_HIRE, HIRE, MAYBE, or NO_HIRE with reason
                            
                            Keep it factual and concise. Format as plain text.
                            """)
                            .param("name",      finalName)
                            .param("score",     String.format("%.1f", finalScore))
                            .param("strengths", finalStrengths)
                            .param("gaps",      finalGaps)
                            .param("summary",   finalSummary)
                            .param("resume",    safeContext))
                    .call()
                    .content();

            // ── Step 5: Parse recommendation ──────────────────────────────────
            String recommendation = "MAYBE";
            if (aiSummary.contains("STRONG_HIRE"))    recommendation = "STRONG_HIRE";
            else if (aiSummary.contains("NO_HIRE"))   recommendation = "NO_HIRE";
            else if (aiSummary.contains("HIRE"))      recommendation = "HIRE";

            return new ToolDtos.CandidateSummary(
                    rId, name, email, score,
                    aiSummary,
                    List.of(strengths.split(",")),
                    gaps.equals("None identified")
                            ? List.of("None identified")
                            : List.of(gaps.split(",")),
                    recommendation
            );

        } catch (Exception e) {
            log.error("[CandidateSummaryTool] Failed: {}", e.getMessage());
            return new ToolDtos.CandidateSummary(
                    safeUUID(resumeId), "Unknown", "", 0.0,
                    "Unable to generate summary: " + e.getMessage(),
                    List.of(), List.of(), "UNKNOWN"
            );
        }
    }

    private UUID safeUUID(String s) {
        try { return UUID.fromString(s.trim()); }
        catch (Exception e) { return UUID.randomUUID(); }
    }
}