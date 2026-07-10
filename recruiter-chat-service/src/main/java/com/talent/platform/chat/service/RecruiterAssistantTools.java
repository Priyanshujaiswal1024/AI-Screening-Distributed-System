package com.talent.platform.chat.service;

import com.talent.platform.chat.client.JobServiceClient;
import com.talent.platform.chat.client.ResumeServiceClient;
import com.talent.platform.chat.client.ScreeningServiceClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

/**
 * UPGRADED RecruiterAssistantTools
 *
 * ANTI-HALLUCINATION DESIGN:
 * - Every tool fetches REAL data from backend services
 * - Tool responses are structured so the LLM cannot inject fake data
 * - No nested LLM calls inside tools (eliminates drift)
 * - All formatting is deterministic — LLM only adds context/narrative around real facts
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RecruiterAssistantTools {

    private final ResumeServiceClient resumeServiceClient;
    private final ScreeningServiceClient screeningServiceClient;
    private final JobServiceClient jobServiceClient;

    private static final ObjectMapper mapper = new ObjectMapper();

    // ─────────────────────────────────────────────────────────────
    // Helper: parameter validation
    // ─────────────────────────────────────────────────────────────

    private boolean isInvalidParam(String value) {
        return value == null || value.isBlank()
                || value.equalsIgnoreCase("null")
                || value.equalsIgnoreCase("undefined")
                || value.equalsIgnoreCase("unknown");
    }

    // ─────────────────────────────────────────────────────────────
    // Helper: resolve jobId from title or UUID string
    // ─────────────────────────────────────────────────────────────

    private String resolveJobId(String jobIdOrTitle) {
        if (isInvalidParam(jobIdOrTitle)) {
            java.util.UUID activeJobId = ChatContextHolder.getJobId();
            if (activeJobId != null) return activeJobId.toString();
            // Fallback: use the first available job
            try {
                String jobsJson = jobServiceClient.getAllJobs();
                JsonNode root = mapper.readTree(jobsJson);
                if (root.isArray() && root.size() > 0) {
                    return root.get(0).path("id").asText();
                }
            } catch (Exception ex) {
                log.error("Failed to fallback-resolve jobId", ex);
            }
            return null;
        }
        // Try UUID first
        try {
            java.util.UUID.fromString(jobIdOrTitle);
            return jobIdOrTitle;
        } catch (IllegalArgumentException ignored) { }
        // Try fuzzy title match
        try {
            String jobsJson = jobServiceClient.getAllJobs();
            JsonNode root = mapper.readTree(jobsJson);
            if (root.isArray()) {
                String cleanTitle = jobIdOrTitle.replace("_", " ").replace("-", " ").toLowerCase().trim();
                for (JsonNode node : root) {
                    String title = node.path("title").asText().toLowerCase().trim();
                    if (title.contains(cleanTitle) || cleanTitle.contains(title)) {
                        return node.path("id").asText();
                    }
                }
                // Still not found — return first job's id
                if (root.size() > 0) {
                    log.warn("[Tools] Could not resolve jobId from title '{}', using first available job", jobIdOrTitle);
                    return root.get(0).path("id").asText();
                }
            }
        } catch (Exception ex) {
            log.error("Failed to resolve jobId from title: {}", jobIdOrTitle, ex);
        }
        return jobIdOrTitle;
    }

    // ─────────────────────────────────────────────────────────────
    // Helper: resolve resumeId from name or UUID string
    // ─────────────────────────────────────────────────────────────

    private String resolveResumeId(String resumeIdOrName) {
        if (isInvalidParam(resumeIdOrName)) {
            java.util.UUID activeResumeId = ChatContextHolder.getResumeId();
            return activeResumeId != null ? activeResumeId.toString() : null;
        }
        try {
            java.util.UUID.fromString(resumeIdOrName);
            return resumeIdOrName;
        } catch (IllegalArgumentException ignored) { }
        try {
            String result = resumeServiceClient.searchCandidates(resumeIdOrName);
            JsonNode root = mapper.readTree(result);
            if (root.isArray() && root.size() > 0) {
                return root.get(0).path("resumeId").asText();
            }
        } catch (Exception ex) {
            log.error("Failed to resolve resumeId from name: {}", resumeIdOrName, ex);
        }
        return resumeIdOrName;
    }

    // ─────────────────────────────────────────────────────────────
    // Formatters — deterministic, no AI involvement
    // ─────────────────────────────────────────────────────────────

    private String formatCandidates(String json) {
        if (json == null || json.isBlank()) return "No candidates found in the system.";
        try {
            JsonNode root = mapper.readTree(json);
            if (!root.isArray() || root.size() == 0) return "No candidates found in the system.";
            StringBuilder sb = new StringBuilder();
            sb.append("=== CANDIDATES IN SYSTEM (").append(root.size()).append(" total) ===\n\n");
            int i = 1;
            for (JsonNode node : root) {
                String resumeId = node.path("resumeId").asText("?");
                String name     = node.path("candidateName").asText("Unknown");
                String email    = node.path("candidateEmail").asText("Unknown");
                String status   = node.path("status").asText("Unknown");
                sb.append(String.format("%d. **%s**\n", i++, name));
                sb.append(String.format("   - Email: %s\n", email));
                sb.append(String.format("   - Status: %s\n", status));
                sb.append(String.format("   - Resume ID: `%s`\n\n", resumeId));
            }
            return sb.toString().trim();
        } catch (Exception e) {
            log.error("Failed to format candidates JSON", e);
            return json;
        }
    }

    public String formatRankings(String json) {
        if (json == null || json.isBlank()) return "No candidate rankings found. Candidates may not have been screened yet.";
        try {
            JsonNode root = mapper.readTree(json);
            if (!root.isArray() || root.size() == 0)
                return "No candidate rankings found. Candidates may not have been screened yet.";
            StringBuilder sb = new StringBuilder();
            sb.append("=== CANDIDATE RANKINGS (").append(root.size()).append(" screened) ===\n\n");
            for (JsonNode node : root) {
                int rank          = node.path("rank").asInt();
                String resumeId   = node.path("resumeId").asText("?");
                String name       = node.path("candidateName").asText("Unknown");
                String email      = node.path("candidateEmail").asText("Unknown");
                double matchScore = node.path("matchScore").asDouble();
                double confScore  = node.path("confidenceScore").asDouble();
                String strengths  = node.path("strengths").asText("N/A");
                String skillGaps  = node.path("skillGaps").asText("N/A");
                String summary    = node.path("structuredSummary").asText("");

                sb.append(String.format("**Rank #%d — %s**\n", rank, name));
                sb.append(String.format("- Email: %s\n", email));
                sb.append(String.format("- Resume ID: `%s`\n", resumeId));
                sb.append(String.format("- Match Score: **%.1f%%**\n", matchScore));
                sb.append(String.format("- Confidence: %.0f%%\n", confScore * 100));
                sb.append(String.format("- Strengths: %s\n", strengths));
                sb.append(String.format("- Missing Skills: %s\n", skillGaps));

                // Embed checklist if available
                String checklistJson = node.path("requirementsChecklist").asText("");
                if (!checklistJson.isBlank() && !checklistJson.equals("[]")) {
                    try {
                        JsonNode cl = mapper.readTree(checklistJson);
                        if (cl.isArray() && cl.size() > 0) {
                            long matched = 0, missing = 0;
                            for (JsonNode item : cl) {
                                if ("Matched".equals(item.path("status").asText())) matched++;
                                else missing++;
                            }
                            sb.append(String.format("- Requirements: %d matched / %d missing\n", matched, missing));
                        }
                    } catch (Exception ignored) { }
                }

                if (!summary.isBlank() && summary.length() > 10) {
                    // Truncate very long summary for tool output readability
                    String brief = summary.length() > 300 ? summary.substring(0, 300) + "..." : summary;
                    sb.append(String.format("- Summary: %s\n", brief));
                }
                sb.append("\n");
            }
            sb.append("⚠️ IMPORTANT: The above rankings are based ONLY on real database records. Do not modify or invent any values.\n");
            return sb.toString().trim();
        } catch (Exception e) {
            log.error("Failed to format rankings JSON", e);
            return json;
        }
    }

    private String formatJobDetails(String json) {
        if (json == null || json.isBlank()) return "Job description not found.";
        try {
            JsonNode node = mapper.readTree(json);
            if (node.isMissingNode() || node.isNull()) return "Job description not found.";
            StringBuilder sb = new StringBuilder();
            sb.append(String.format("=== JOB: %s ===\n", node.path("title").asText("?")));
            sb.append(String.format("- Job ID: `%s`\n", node.path("id").asText("?")));
            sb.append(String.format("- Min Experience: %d years\n", node.path("minExperienceYears").asInt()));
            JsonNode skills = node.path("keySkills");
            if (skills.isArray() && skills.size() > 0) {
                java.util.List<String> skillList = new java.util.ArrayList<>();
                for (JsonNode s : skills) skillList.add(s.asText());
                sb.append(String.format("- Required Skills: %s\n", String.join(", ", skillList)));
            }
            String rawText = node.path("rawText").asText("");
            if (!rawText.isBlank()) {
                sb.append(String.format("- Full Job Description:\n%s\n", rawText));
            }
            return sb.toString();
        } catch (Exception e) {
            log.error("Failed to format job details JSON", e);
            return json;
        }
    }

    private String formatAllJobs(String json) {
        if (json == null || json.isBlank()) return "No job descriptions found in the system.";
        try {
            JsonNode root = mapper.readTree(json);
            if (!root.isArray() || root.size() == 0) return "No job descriptions found in the system.";
            StringBuilder sb = new StringBuilder();
            sb.append("=== AVAILABLE JOB POSITIONS (").append(root.size()).append(") ===\n\n");
            for (JsonNode node : root) {
                sb.append(String.format("- **%s** (ID: `%s`)\n",
                        node.path("title").asText("?"),
                        node.path("id").asText("?")));
            }
            return sb.toString().trim();
        } catch (Exception e) {
            log.error("Failed to format all jobs JSON", e);
            return json;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // TOOLS
    // ─────────────────────────────────────────────────────────────

    @Tool(description = """
            Retrieve the TOP ranked candidates for a job. Use this when recruiter asks:
            'Who are the top candidates?', 'Who should I hire?', 'Best candidates for this role?',
            'Show me rankings', 'Rank candidates', 'Top 5 candidates', etc.
            Provide job title or ID. If not specified, uses the active job context or the first available job.
            Returns REAL database rankings — do NOT modify or invent any values in the output.
            """)
    public String topCandidates(String jobIdOrTitle) {
        log.info("Tool: topCandidates jobIdOrTitle=[{}]", jobIdOrTitle);
        try {
            String resolvedId = resolveJobId(jobIdOrTitle);
            if (resolvedId == null) {
                return "No job found. Please create a job description first, then screen candidates against it.";
            }
            String rankingsJson = screeningServiceClient.getRankings(resolvedId, 0.0, 20);
            String formatted = formatRankings(rankingsJson);
            log.info("Tool: topCandidates returned {} chars of real data", formatted.length());
            return formatted;
        } catch (Exception e) {
            log.error("Tool topCandidates failed", e);
            return "Error fetching candidate rankings: " + e.getMessage() +
                   ". Make sure candidates have been uploaded and screened.";
        }
    }

    @Tool(description = """
            Compare two candidates side-by-side for a specific job role.
            Provide candidate names or resume IDs. Returns real match scores, strengths, and gaps
            from the database for both candidates. Do NOT invent scores or skill data.
            """)
    public String compareCandidate(String candidateOneNameOrId, String candidateTwoNameOrId, String jobIdOrTitle) {
        log.info("Tool: compareCandidate c1=[{}] c2=[{}] job=[{}]", candidateOneNameOrId, candidateTwoNameOrId, jobIdOrTitle);
        try {
            String resolvedJobId = resolveJobId(jobIdOrTitle);
            String resolvedId1   = resolveResumeId(candidateOneNameOrId);
            String resolvedId2   = resolveResumeId(candidateTwoNameOrId);

            if (resolvedId1 == null && resolvedId2 == null) {
                return "Could not find either candidate. Please provide their exact names or resume IDs.";
            }
            if (resolvedJobId == null) {
                return "No job context found. Please specify the job title or ID.";
            }

            StringBuilder sb = new StringBuilder();
            sb.append("=== CANDIDATE COMPARISON ===\n\n");

            if (resolvedId1 != null) {
                try {
                    String report1 = screeningServiceClient.getCandidateReport(resolvedId1, resolvedJobId);
                    sb.append("**CANDIDATE 1:**\n").append(report1).append("\n\n");
                } catch (Exception e) {
                    sb.append("**CANDIDATE 1:** Report not found (may not be screened yet)\n\n");
                }
            }
            if (resolvedId2 != null) {
                try {
                    String report2 = screeningServiceClient.getCandidateReport(resolvedId2, resolvedJobId);
                    sb.append("**CANDIDATE 2:**\n").append(report2).append("\n\n");
                } catch (Exception e) {
                    sb.append("**CANDIDATE 2:** Report not found (may not be screened yet)\n\n");
                }
            }
            sb.append("⚠️ Compare only based on the data above. Do not invent qualifications.\n");
            return sb.toString();
        } catch (Exception e) {
            log.error("Tool compareCandidate failed", e);
            return "Error comparing candidates: " + e.getMessage();
        }
    }

    @Tool(description = """
            Search for a candidate by name, email, or partial text. Returns their resume details
            including status, skills, and resume ID from the database.
            """)
    public String candidateLookup(String searchString) {
        log.info("Tool: candidateLookup query=[{}]", searchString);
        try {
            String query = isInvalidParam(searchString) ? "" : searchString;
            return formatCandidates(resumeServiceClient.searchCandidates(query));
        } catch (Exception e) {
            log.error("Tool candidateLookup failed", e);
            return "Error searching candidates: " + e.getMessage();
        }
    }

    @Tool(description = """
            Get the match score and screening report for a specific candidate against a job.
            Provide the candidate name or resume ID, and optionally the job title or ID.
            Returns REAL match score, matched skills, gaps, and AI summary — all from database.
            """)
    public String candidateRanking(String candidateNameOrId, String jobIdOrTitle) {
        log.info("Tool: candidateRanking candidate=[{}] job=[{}]", candidateNameOrId, jobIdOrTitle);
        try {
            String resolvedJobId    = resolveJobId(jobIdOrTitle);
            String resolvedResumeId = resolveResumeId(candidateNameOrId);

            if (resolvedResumeId != null && resolvedJobId != null) {
                // Single candidate report
                String report = screeningServiceClient.getCandidateReport(resolvedResumeId, resolvedJobId);
                return "=== SCREENING REPORT ===\n" + report;
            } else if (resolvedJobId != null) {
                // Full job rankings
                return formatRankings(screeningServiceClient.getRankings(resolvedJobId, 0.0, 20));
            } else {
                return "Please specify a job title or ID to retrieve rankings.";
            }
        } catch (Exception e) {
            log.error("Tool candidateRanking failed", e);
            return "Error fetching rankings: " + e.getMessage();
        }
    }

    @Tool(description = """
            Generate targeted technical interview questions for a candidate based on their
            REAL screening report and job requirements. The questions address actual strengths
            and gaps found in the database — no invented questions.
            """)
    public String interviewQuestion(String resumeIdOrName, String jobIdOrTitle) {
        log.info("Tool: interviewQuestion resume=[{}] job=[{}]", resumeIdOrName, jobIdOrTitle);
        try {
            String resolvedResumeId = resolveResumeId(resumeIdOrName);
            String resolvedJobId    = resolveJobId(jobIdOrTitle);

            if (resolvedResumeId == null) {
                return "Could not identify the candidate. Please provide their name or resume ID.";
            }
            if (resolvedJobId == null) {
                return "Could not identify the job. Please specify the job title or ID.";
            }

            String profileSummary = screeningServiceClient.getCandidateReport(resolvedResumeId, resolvedJobId);
            String jobDetails     = jobServiceClient.getJobDetails(resolvedJobId);

            // Return structured data — let the LLM generate questions ONLY from this real context
            return String.format("""
                    === DATA FOR INTERVIEW QUESTION GENERATION ===
                    
                    CANDIDATE SCREENING REPORT (verified from database):
                    %s
                    
                    JOB DESCRIPTION (verified from database):
                    %s
                    
                    INSTRUCTION: Generate 5-7 targeted technical interview questions based ONLY
                    on the above real candidate data and job requirements. For each question include:
                    1. The question text
                    2. Which specific skill/gap it targets
                    3. Ideal answer indicators for the interviewer
                    """, profileSummary, jobDetails);
        } catch (Exception e) {
            log.error("Tool interviewQuestion failed", e);
            return "Error preparing interview question data: " + e.getMessage();
        }
    }

    @Tool(description = "Lookup full details of a job description by its ID or title.")
    public String jobDescriptionLookup(String jobIdOrTitle) {
        log.info("Tool: jobDescriptionLookup jobIdOrTitle=[{}]", jobIdOrTitle);
        try {
            String resolvedId = resolveJobId(jobIdOrTitle);
            if (resolvedId == null) return "No active job context or title could be resolved.";
            return formatJobDetails(jobServiceClient.getJobDetails(resolvedId));
        } catch (Exception e) {
            log.error("Tool jobDescriptionLookup failed", e);
            return "Error looking up job description: " + e.getMessage();
        }
    }

    @Tool(description = "List all available job positions in the system with their IDs and titles.")
    public String listAllJobs() {
        log.info("Tool: listAllJobs");
        try {
            return formatAllJobs(jobServiceClient.getAllJobs());
        } catch (Exception e) {
            log.error("Tool listAllJobs failed", e);
            return "Error listing job positions: " + e.getMessage();
        }
    }

    @Tool(description = "List all candidates/resumes uploaded to the system with their current status.")
    public String listAllCandidates() {
        log.info("Tool: listAllCandidates");
        try {
            return formatCandidates(resumeServiceClient.searchCandidates(""));
        } catch (Exception e) {
            log.error("Tool listAllCandidates failed", e);
            return "Error listing candidates: " + e.getMessage();
        }
    }
}