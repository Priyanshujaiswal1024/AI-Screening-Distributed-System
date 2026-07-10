package com.talent.platform.chat.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * UPGRADED QueryRouter — Routes queries to the correct execution path.
 *
 * TOOL_CALL      → recruiter tools (rankings, JD lookup, comparisons, interview Q)
 * VECTOR_SEARCH  → pgvector resume chunk RAG retrieval
 * CONVERSATIONAL → greetings/small-talk only
 *
 * ANTI-HALLUCINATION RULES:
 * - ANY query about candidates, rankings, scores, comparison → TOOL_CALL
 * - When resumeId present + query is about data → still TOOL_CALL (not CONVERSATIONAL)
 * - CONVERSATIONAL is reserved strictly for social/greeting messages
 */
@Service
@Slf4j
public class QueryRouterService {

    public enum QueryRoute {
        VECTOR_SEARCH,   // retrieve resume chunks + RAG
        TOOL_CALL,       // use recruiter tools (always preferred for data queries)
        CONVERSATIONAL   // plain chat — ONLY for greetings
    }

    // Keywords indicating live data is needed → TOOL_CALL
    private static final java.util.List<String> TOOL_KEYWORDS = java.util.List.of(
            // Rankings & scoring
            "rank", "ranking", "ranked", "score", "match score", "match",
            "top candidate", "top candidates", "best candidate", "best candidates",
            "who is the best", "who are the top", "who are the best",
            "top 5", "top 10", "top 3", "top n",
            // Comparison
            "compare", "comparison", "versus", " vs ", "vs.", "side by side",
            "better", "which candidate", "who is better",
            // Recommendations
            "recommend", "should i hire", "should we hire", "shortlist",
            "who should", "suggest", "suitable",
            // Interview
            "interview question", "interview questions", "generate question",
            "ask candidate", "assess candidate", "technical question",
            // Job context
            "job description", "job requirement", "job details",
            // General data lookups
            "list all candidates", "all candidates", "list candidates",
            "all resumes", "list resumes", "how many candidates",
            "pipeline", "screened candidate"
    );

    // Keywords indicating resume-specific fact retrieval → VECTOR_SEARCH
    private static final java.util.List<String> RESUME_FACT_KEYWORDS = java.util.List.of(
            "college", "university", "degree", "certification", "certified",
            "cgpa", "gpa", "grade", "project", "internship",
            "technology", "cloud", "language", "framework", "tool",
            "education", "qualification", "course", "achievement", "award",
            "publication", "location", "city", "address", "github", "linkedin",
            "worked", "built", "developed", "implemented", "designed",
            "experience", "skill", "background", "profile", "resume", "cv",
            "what did", "tell me about", "describe", "explain",
            "what technologies", "what skills", "what projects"
    );

    // Purely social/greeting phrases → CONVERSATIONAL
    private static final java.util.List<String> GREETING_PHRASES = java.util.List.of(
            "hello", "hi", "hey", "greetings", "good morning", "good afternoon",
            "good evening", "good night", "how are you", "who are you",
            "what are you", "what can you do", "thank you", "thanks",
            "bye", "goodbye", "see you", "nice to meet"
    );

    private boolean isStrictGreeting(String query) {
        String lower = query.toLowerCase().trim().replaceAll("[?.!,]", "").strip();
        // Must be a SHORT message (< 5 words) and match a greeting phrase exactly
        if (lower.split("\\s+").length > 6) return false;
        for (String p : GREETING_PHRASES) {
            if (lower.equals(p) || lower.startsWith(p)) {
                return true;
            }
        }
        return false;
    }

    public QueryRoute route(String query, boolean hasResumeId) {
        if (query == null || query.isBlank()) return QueryRoute.CONVERSATIONAL;

        String lower = query.toLowerCase();

        // TOOL_CALL takes highest priority — always check first
        boolean isToolQuery = TOOL_KEYWORDS.stream().anyMatch(lower::contains);
        if (isToolQuery) {
            log.info("[QueryRouter] Route=TOOL_CALL (tool keyword matched in: '{}')", query.substring(0, Math.min(60, query.length())));
            return QueryRoute.TOOL_CALL;
        }

        // Pure social greeting → CONVERSATIONAL (even with resumeId)
        if (isStrictGreeting(query)) {
            log.info("[QueryRouter] Route=CONVERSATIONAL (greeting matched)");
            return QueryRoute.CONVERSATIONAL;
        }

        // With resumeId: try to answer from resume text via RAG
        if (hasResumeId) {
            boolean isResumeFact = RESUME_FACT_KEYWORDS.stream().anyMatch(lower::contains);
            if (isResumeFact) {
                log.info("[QueryRouter] Route=VECTOR_SEARCH (resumeId present + resume fact keyword)");
                return QueryRoute.VECTOR_SEARCH;
            }
            // Generic question about the candidate → CONVERSATIONAL (full text already in system prompt)
            log.info("[QueryRouter] Route=CONVERSATIONAL (resumeId present, generic question, full text in system prompt)");
            return QueryRoute.CONVERSATIONAL;
        }

        // No resumeId: check for resume facts across all resumes
        boolean isResumeFact = RESUME_FACT_KEYWORDS.stream().anyMatch(lower::contains);
        if (isResumeFact) {
            log.info("[QueryRouter] Route=TOOL_CALL (no resumeId, resume fact — use candidateLookup tool)");
            return QueryRoute.TOOL_CALL; // Must use tools to search across all candidates
        }

        // Default for universal chat: use tools (never hallucinate)
        log.info("[QueryRouter] Route=TOOL_CALL (universal fallback — always use tools when no resumeId)");
        return QueryRoute.TOOL_CALL;
    }
}