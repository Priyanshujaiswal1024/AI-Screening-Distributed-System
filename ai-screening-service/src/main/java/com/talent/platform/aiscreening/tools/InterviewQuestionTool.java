package com.talent.platform.aiscreening.tools;

import com.talent.platform.aiscreening.client.JobDescriptionClient;
import com.talent.platform.aiscreening.client.ResumeManagementClient;
import com.talent.platform.aiscreening.client.ScreeningReportClient;
import com.talent.platform.aiscreening.tools.dto.ToolDtos;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Tool: InterviewQuestionTool
 *
 * FIXED: Was doing JdbcTemplate queries on THREE tables across TWO foreign services:
 *
 *   candidate_resumes   (resume-management-service)     ← VIOLATION
 *     SELECT candidate_name FROM candidate_resumes WHERE id = ?
 *
 *   job_descriptions    (job-description-service)       ← VIOLATION
 *     SELECT title FROM job_descriptions WHERE id = ?
 *
 *   job_skills          (job-description-service)       ← VIOLATION
 *     SELECT skill FROM job_skills WHERE job_description_id = ?
 *
 *   screening_reports   (candidate-ranking-service)     ← VIOLATION
 *     SELECT strengths, skill_gaps FROM screening_reports WHERE …
 *
 * NOW (all cross-service reads via Feign):
 *   candidate info   → resume-management-service GET /internal/resumes/{id}/candidate-info
 *   job details      → job-description-service   GET /internal/jobs/{id}/details
 *   screening report → candidate-ranking-service GET /internal/screening-reports/{id}?jobDescriptionId=
 *
 * JdbcTemplate REMOVED entirely. ChatClient kept for question generation.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class InterviewQuestionTool {

    // Cross-service Feign clients
    private final ResumeManagementClient resumeManagementClient;
    private final JobDescriptionClient   jobDescriptionClient;
    private final ScreeningReportClient  screeningReportClient;

    private final ChatClient chatClient;
    // JdbcTemplate REMOVED — this service owns NONE of the tables queried here

    @Tool(description = """
            Generate targeted interview questions for a specific candidate and job.
            Use this when the recruiter asks to create interview questions, prepare for an interview,
            or generate questions based on a candidate's profile.
            Requires resume ID and job description ID.
            Returns 5-10 questions with expected answers and difficulty levels.
            """)
    public ToolDtos.InterviewQuestionSet generateInterviewQuestions(
            @ToolParam(description = "The resume UUID of the candidate") String resumeId,
            @ToolParam(description = "The job description UUID") String jobDescriptionId,
            @ToolParam(description = "Number of questions to generate (3-10)") int questionCount,
            @ToolParam(description = "Focus area: TECHNICAL, BEHAVIORAL, MIXED") String focusArea
    ) {
        log.info("[InterviewQuestionTool] resumeId='{}' jobId='{}' count={} focus={}",
                resumeId, jobDescriptionId, questionCount, focusArea);

        int safeCount = Math.min(Math.max(questionCount, 3), 10);

        try {
            UUID rId = UUID.fromString(resumeId.trim());
            UUID jId = UUID.fromString(jobDescriptionId.trim());

            // ── Step 1: Fetch candidate name ──────────────────────────────────
            // REPLACED: SELECT candidate_name FROM candidate_resumes WHERE id = ?
            ResumeManagementClient.CandidateInfoDto candidateInfo =
                    resumeManagementClient.getCandidateInfo(rId);
            String candidateName = candidateInfo.candidateName();

            // ── Step 2: Fetch job title + required skills ─────────────────────
            // REPLACED: SELECT title FROM job_descriptions WHERE id = ?
            //           SELECT skill FROM job_skills WHERE job_description_id = ?
            JobDescriptionClient.JobDetailsDto jobDetails =
                    jobDescriptionClient.getJobDetails(jId);
            String jobTitle  = jobDetails.title();
            String jobSkills = String.join(", ", jobDetails.requiredSkills());

            // ── Step 3: Fetch screening report ────────────────────────────────
            // REPLACED: SELECT strengths, skill_gaps FROM screening_reports
            //           WHERE resume_id = ? AND job_description_id = ?
            String strengths = "General technical skills";
            String gaps      = "To be assessed";
            try {
                ScreeningReportClient.ScreeningReportDto report =
                        screeningReportClient.getScreeningReport(rId, jId);
                if (report != null) {
                    strengths = report.strengths();
                    gaps      = report.skillGaps();
                }
            } catch (Exception e) {
                log.warn("[InterviewQuestionTool] No screening report — using defaults");
            }

            // ── Step 4: Generate questions via LLM ───────────────────────────
            final String finalStrengths = strengths;
            final String finalGaps      = gaps;

            String rawResponse = chatClient.prompt()
                    .user(u -> u.text("""
                            Generate exactly {count} {focus} interview questions for:
                            
                            Candidate: {candidate}
                            Position: {job}
                            Required Skills: {skills}
                            Candidate Strengths: {strengths}
                            Skill Gaps: {gaps}
                            
                            For each question provide (format each as a numbered block):
                            Q[N]: <question text>
                            SKILL: <skill being tested>
                            EXPECTED: <brief expected answer or keywords>
                            DIFFICULTY: EASY|MEDIUM|HARD
                            
                            Rules:
                            - Mix questions that verify strengths AND probe skill gaps
                            - Make technical questions specific, not generic
                            - For BEHAVIORAL focus, use STAR method scenarios
                            - Keep expected answers concise (2-3 sentences max)
                            """)
                            .param("count",     String.valueOf(safeCount))
                            .param("focus",     focusArea)
                            .param("candidate", candidateName)
                            .param("job",       jobTitle)
                            .param("skills",    jobSkills)
                            .param("strengths", finalStrengths)
                            .param("gaps",      finalGaps))
                    .call()
                    .content();

            List<ToolDtos.InterviewQuestion> questions = parseQuestions(rawResponse);
            return new ToolDtos.InterviewQuestionSet(rId, candidateName, jobTitle, questions);

        } catch (Exception e) {
            log.error("[InterviewQuestionTool] Failed: {}", e.getMessage());
            return new ToolDtos.InterviewQuestionSet(
                    safeUUID(resumeId), "Unknown", "Unknown",
                    List.of(new ToolDtos.InterviewQuestion(
                            1, "Unable to generate questions: " + e.getMessage(),
                            "ERROR", "", "UNKNOWN"
                    ))
            );
        }
    }

    // ── Question parser ───────────────────────────────────────────────────────

    private List<ToolDtos.InterviewQuestion> parseQuestions(String raw) {
        List<ToolDtos.InterviewQuestion> questions = new ArrayList<>();
        String[] blocks = raw.split("(?=Q\\d+:)");
        int num = 1;
        for (String block : blocks) {
            if (block.isBlank()) continue;
            try {
                String q        = extractLine(block, "Q" + num + ":");
                String skill    = extractLine(block, "SKILL:");
                String expected = extractLine(block, "EXPECTED:");
                String diff     = extractLine(block, "DIFFICULTY:");
                if (!q.isEmpty()) {
                    questions.add(new ToolDtos.InterviewQuestion(num++, q, skill, expected, diff));
                }
            } catch (Exception e) {
                log.debug("[InterviewQuestionTool] Parse block failed: {}", e.getMessage());
            }
        }
        return questions;
    }

    private String extractLine(String block, String prefix) {
        for (String line : block.split("\n")) {
            if (line.trim().startsWith(prefix)) {
                return line.trim().substring(prefix.length()).trim();
            }
        }
        return "";
    }

    private UUID safeUUID(String s) {
        try { return UUID.fromString(s.trim()); }
        catch (Exception e) { return UUID.randomUUID(); }
    }
}