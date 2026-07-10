package com.talent.platform.aiscreening.tools;

import com.talent.platform.aiscreening.client.ResumeManagementClient;
import com.talent.platform.aiscreening.tools.dto.ToolDtos;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Tool: ResumeSearchTool
 *
 * FIXED: Was doing JdbcTemplate SQL directly on candidate_resumes
 * and resume_chunks across service boundaries.
 *
 * NOW:
 * - candidate_resumes search → Feign → resume-management-service
 *   GET /internal/resumes/search?skillKeyword=&candidateName=&status=&limit=
 *
 * resume_chunks keyword filter is handled server-side by resume-management-service,
 * which can join its own data with chunk content it delegates to ai-screening-service
 * via its own internal search — OR ai-screening-service exposes a chunk-search
 * endpoint that resume-management-service can optionally call back. For simplicity,
 * resume-management-service's search endpoint accepts skillKeyword and delegates
 * chunk lookup to ai-screening-service internally (see resume-management-service impl).
 *
 * This class no longer has ANY JdbcTemplate dependency.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ResumeSearchTool {

    private final ResumeManagementClient resumeManagementClient;
    // JdbcTemplate REMOVED — candidate_resumes is not our table

    @Tool(description = """
            Search for candidate resumes in the database.
            Use this tool when the recruiter asks to find, search, or list candidates.
            Can filter by skill keywords, candidate name, email, or status (UPLOADED/PARSED/SCREENED/FAILED).
            Returns a list of matching candidates with their resume IDs.
            """)
    public List<ToolDtos.CandidateSearchResult> searchResumes(
            @ToolParam(description = "Skill keyword to search for (e.g., 'Java', 'Spring Boot', 'Kafka'). Pass empty string to search all.") String skillKeyword,
            @ToolParam(description = "Candidate name or partial name to filter by. Pass empty string to skip.") String candidateName,
            @ToolParam(description = "Filter by status: UPLOADED, PARSED, SCREENED, FAILED, or ALL") String status,
            @ToolParam(description = "Maximum number of results to return (1-50)") int limit
    ) {
        log.info("[ResumeSearchTool] skillKeyword='{}' name='{}' status='{}' limit={}",
                skillKeyword, candidateName, status, limit);

        int safeLimit = Math.min(Math.max(limit, 1), 50);

        try {
            // Feign call → resume-management-service owns candidate_resumes
            List<ResumeManagementClient.CandidateSearchDto> raw =
                    resumeManagementClient.searchCandidates(
                            skillKeyword, candidateName, status, safeLimit);

            List<ToolDtos.CandidateSearchResult> results = raw.stream()
                    .map(dto -> new ToolDtos.CandidateSearchResult(
                            dto.resumeId(),
                            dto.candidateName(),
                            dto.candidateEmail(),
                            dto.status(),
                            dto.fileUrl()
                    ))
                    .toList();

            log.info("[ResumeSearchTool] Found {} candidates", results.size());
            return results;

        } catch (Exception e) {
            log.error("[ResumeSearchTool] Search failed: {}", e.getMessage());
            return List.of();
        }
    }
}