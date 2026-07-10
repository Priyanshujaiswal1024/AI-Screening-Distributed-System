package com.talent.platform.aiscreening.tools;

import com.talent.platform.aiscreening.client.ResumeManagementClient;
import com.talent.platform.aiscreening.repository.ResumeChunkRepository;
import com.talent.platform.aiscreening.tools.dto.ToolDtos;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Tool: SkillGapAnalysisTool
 *
 * FIXED: Was querying candidate_resumes via JdbcTemplate:
 *   SELECT candidate_name FROM candidate_resumes WHERE id = ?  ← VIOLATION
 *
 * NOW:
 *   candidate_name → Feign → resume-management-service
 *     GET /internal/resumes/{resumeId}/candidate-info
 *
 * resume_chunks queries are FINE — resume_chunks is OUR table.
 * Replaced JdbcTemplate chunk query with ResumeChunkRepository (cleaner, no SQL).
 *
 * EmbeddingModel kept — semantic similarity logic is unchanged.
 * JdbcTemplate REMOVED (only had one valid use: resume_chunks, now via repository).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SkillGapAnalysisTool {

    // Cross-service: candidate name lookup
    private final ResumeManagementClient resumeManagementClient;

    // Our own table: resume_chunks — repository is correct here
    private final ResumeChunkRepository chunkRepository;

    private final EmbeddingModel embeddingModel;
    // JdbcTemplate REMOVED

    private static final double SKILL_MATCH_THRESHOLD = 0.55;

    @Tool(description = """
            Analyze the skill gaps for a specific candidate against required skills.
            Use this when the recruiter asks what skills a candidate is missing,
            or how well they match specific technical requirements.
            Provide the resume ID and a comma-separated list of required skills.
            """)
    public ToolDtos.SkillGapReport analyzeSkillGaps(
            @ToolParam(description = "The resume UUID of the candidate to analyze") String resumeId,
            @ToolParam(description = "Comma-separated list of required skills (e.g., 'Java,Spring Boot,Kafka,Docker')") String requiredSkillsCsv
    ) {
        log.info("[SkillGapAnalysisTool] resumeId='{}' skills='{}'", resumeId, requiredSkillsCsv);

        try {
            UUID rId = UUID.fromString(resumeId.trim());

            // ── Step 1: Fetch candidate name via Feign ────────────────────────
            // REPLACED: SELECT candidate_name FROM candidate_resumes WHERE id = ?
            ResumeManagementClient.CandidateInfoDto info =
                    resumeManagementClient.getCandidateInfo(rId);
            String candidateName = info.candidateName();

            // ── Step 2: Fetch resume chunks — OUR TABLE, repository is correct ─
            // REPLACED: jdbcTemplate.queryForList(
            //   "SELECT content FROM resume_chunks WHERE resume_id = ? ORDER BY chunk_index")
            List<String> chunks = chunkRepository.findByResumeId(rId)
                    .stream()
                    .map(chunk -> chunk.getContent())
                    .toList();

            if (chunks.isEmpty()) {
                log.warn("[SkillGapAnalysisTool] No chunks found for resume {}", rId);
                return new ToolDtos.SkillGapReport(rId, candidateName,
                        List.of(), List.of(), List.of(), 0.0);
            }

            // ── Step 3: Semantic skill gap analysis (unchanged logic) ─────────
            List<String> requiredSkills = Arrays.stream(requiredSkillsCsv.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());

            List<float[]> chunkEmbeddings = chunks.stream()
                    .map(embeddingModel::embed)
                    .collect(Collectors.toList());

            List<String> matched = new ArrayList<>();
            List<String> missing = new ArrayList<>();

            for (String skill : requiredSkills) {
                float[] skillEmb = embeddingModel.embed(skill);
                double maxSim = chunkEmbeddings.stream()
                        .mapToDouble(ce -> cosineSimilarity(skillEmb, ce))
                        .max().orElse(0.0);

                if (maxSim >= SKILL_MATCH_THRESHOLD) {
                    matched.add(skill);
                } else {
                    missing.add(skill);
                }
            }

            double coverage = requiredSkills.isEmpty() ? 0.0 :
                    (double) matched.size() / requiredSkills.size() * 100.0;

            log.info("[SkillGapAnalysisTool] matched={} missing={} coverage={}%",
                    matched.size(), missing.size(), String.format("%.1f", coverage));

            return new ToolDtos.SkillGapReport(
                    rId, candidateName, requiredSkills, matched, missing,
                    Math.round(coverage * 10.0) / 10.0
            );

        } catch (Exception e) {
            log.error("[SkillGapAnalysisTool] Analysis failed: {}", e.getMessage());
            return new ToolDtos.SkillGapReport(
                    safeUUID(resumeId), "Unknown",
                    List.of(), List.of(), List.of(), 0.0);
        }
    }

    private double cosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) return 0.0;
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            na  += a[i] * a[i];
            nb  += b[i] * b[i];
        }
        return (na == 0 || nb == 0) ? 0.0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    private UUID safeUUID(String s) {
        try { return UUID.fromString(s.trim()); }
        catch (Exception e) { return UUID.randomUUID(); }
    }
}