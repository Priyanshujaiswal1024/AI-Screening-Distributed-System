package com.talent.platform.chat.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * PHASE 2+3 — Complete RAG Pipeline
 *
 * Architecture:
 *   Query
 *     → QueryRouter (route decision)
 *     → RewriteQueryTransformer (single improved query)
 *     → MultiQueryExpander (N query variants)
 *     → HybridRetrievalService × N (pgvector + keyword fallback per query)
 *     → DocumentJoiner (RRF merge + dedup)
 *     → RerankingService (cosine rerank, top-5)
 *     → Context assembly (inject into prompt)
 *     → ChatClient with MemoryAdvisor + system prompt
 *     → LLM answer
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RagPipelineService {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;
    private final EmbeddingModel embeddingModel;
    private final HybridRetrievalService hybridRetrievalService;
    private final DocumentJoinerService documentJoinerService;
    private final RerankingService rerankingService;
    private final RecruiterAssistantTools recruiterAssistantTools;

    // ── PHASE 4: Detailed logging constants ──────────────────────────────────
    private static final String LOG_PREFIX = "[RAG Pipeline]";

    /**
     * Execute full RAG pipeline for resume-specific queries.
     * FIX G7: advisors correctly chained — memory + context in one call.
     */
    public String executeRag(String originalQuery, String resumeId,
                             String conversationId) {

        // ── PHASE 4 Log: original query ──────────────────────────────────────
        log.info("{} ── START ───────────────────────────────────────", LOG_PREFIX);
        log.info("{} Original query    : '{}'", LOG_PREFIX, originalQuery);
        log.info("{} ResumeId          : '{}'", LOG_PREFIX, resumeId);
        log.info("{} ConversationId    : '{}'", LOG_PREFIX, conversationId);

        // ── Step 1: Rewrite query ────────────────────────────────────────────
        String rewrittenQuery = rewriteQuery(originalQuery);
        log.info("{} Rewritten query   : '{}'", LOG_PREFIX, rewrittenQuery);

        // ── Step 2: Expand into multiple queries ─────────────────────────────
        List<String> expandedQueries = expandQuery(rewrittenQuery, originalQuery);
        log.info("{} Expanded queries  : {}", LOG_PREFIX, expandedQueries);

        // ── Step 3: Retrieve for each expanded query (hybrid) ────────────────
        List<List<Document>> allResults = new ArrayList<>();
        for (String query : expandedQueries) {
            log.info("{} Retrieving for    : '{}'", LOG_PREFIX, query);
            List<Document> docs = hybridRetrievalService.retrieve(query, resumeId);
            log.info("{} Retrieved {} docs for query '{}'",
                    LOG_PREFIX, docs.size(), query);
            logChunkPreviews(docs, "Retrieved");
            allResults.add(docs);
        }

        // ── Step 4: Join all retrieval results ───────────────────────────────
        List<Document> joinedDocs = documentJoinerService.join(allResults);
        log.info("{} After join        : {} unique documents", LOG_PREFIX, joinedDocs.size());

        // ── Step 5: Rerank ───────────────────────────────────────────────────
        org.springframework.ai.rag.Query ragQuery =
                new org.springframework.ai.rag.Query(rewrittenQuery);

        List<Document> rerankedDocs = rerankingService.rank(ragQuery, joinedDocs);
        log.info("{} After rerank        : {} documents", LOG_PREFIX, rerankedDocs.size());
        logChunkPreviews(rerankedDocs, "Reranked");
        // ── Step 6: Build context string ─────────────────────────────────────
        String context = buildContext(rerankedDocs);
        log.info("{} Context length    : {} chars", LOG_PREFIX, context.length());
        log.info("{} Final context preview:\n---\n{}\n---",
                LOG_PREFIX, context.substring(0, Math.min(500, context.length())));

        // ── Step 7: Call LLM with memory + context ───────────────────────────
        // FIX G7: single .advisors() call with memory — no double-call override
        String userPrompt = buildUserPrompt(originalQuery, context);
        log.info("{} Invoking LLM...", LOG_PREFIX);

        String answer = chatClient.prompt()
                .messages(new UserMessage(userPrompt))
                .advisors(new MessageChatMemoryAdvisor(chatMemory)) // FIX G7: single chain
                .advisors(a -> a.param("chat_memory_conversation_id", conversationId))
                .call()
                .content();

        log.info("{} LLM answer        : '{}'",
                LOG_PREFIX, answer.substring(0, Math.min(200, answer.length())));
        log.info("{} ── END ─────────────────────────────────────────", LOG_PREFIX);

        return answer;
    }

    /**
     * Execute tool-based query — no vector retrieval, use recruiter tools.
     */
    public String executeWithTools(String query, String conversationId) {
        log.info("{} Route=TOOL_CALL query='{}'", LOG_PREFIX, query);

        return chatClient.prompt()
                .messages(new UserMessage(query))
                .tools(recruiterAssistantTools)  // inject tools
                .advisors(new MessageChatMemoryAdvisor(chatMemory))
                .advisors(a -> a.param("chat_memory_conversation_id", conversationId))
                .call()
                .content();
    }

    /**
     * Execute plain conversational query — no retrieval, no tools.
     */
    public String executeConversational(String query, String conversationId) {
        log.info("{} Route=CONVERSATIONAL query='{}'", LOG_PREFIX, query);

        return chatClient.prompt()
                .messages(new UserMessage(query))
                .advisors(new MessageChatMemoryAdvisor(chatMemory))
                .advisors(a -> a.param("chat_memory_conversation_id", conversationId))
                .call()
                .content();
    }

    // ── Query rewriting using LLM ─────────────────────────────────────────────
    private String rewriteQuery(String originalQuery) {
        try {
            String prompt = """
                    Rewrite the following question to be more specific and effective
                    for searching a resume document. Keep it concise (1 sentence max).
                    Return ONLY the rewritten question, nothing else.

                    Original question: %s
                    """.formatted(originalQuery);

            String rewritten = chatClient.prompt()
                    .messages(new UserMessage(prompt))
                    .call()
                    .content();

            return (rewritten != null && !rewritten.isBlank()) ? rewritten.trim() : originalQuery;
        } catch (Exception e) {
            log.warn("{} RewriteQueryTransformer failed, using original: {}", LOG_PREFIX, e.getMessage());
            return originalQuery;
        }
    }

    // ── Query expansion using LLM ─────────────────────────────────────────────
    private List<String> expandQuery(String rewrittenQuery, String originalQuery) {
        try {
            String prompt = """
                    Generate 3 alternative phrasings of the following question
                    to help search a resume document more effectively.
                    Return ONLY a JSON array of strings. No explanation.
                    Example: ["question 1", "question 2", "question 3"]

                    Question: %s
                    """.formatted(rewrittenQuery);

            String response = chatClient.prompt()
                    .messages(new UserMessage(prompt))
                    .call()
                    .content();

            // Parse JSON array
            List<String> expanded = parseJsonArray(response);
            // Always include original + rewritten
            expanded.add(0, originalQuery);
            if (!rewrittenQuery.equals(originalQuery)) expanded.add(1, rewrittenQuery);

            log.info("{} MultiQueryExpander produced {} queries", LOG_PREFIX, expanded.size());
            return expanded;
        } catch (Exception e) {
            log.warn("{} MultiQueryExpander failed, using original: {}", LOG_PREFIX, e.getMessage());
            return List.of(originalQuery, rewrittenQuery);
        }
    }

    // ── Context assembly ──────────────────────────────────────────────────────
    private String buildContext(List<Document> docs) {
        if (docs.isEmpty()) return "No relevant resume context found.";

        StringBuilder sb = new StringBuilder();
        sb.append("=== RESUME CONTEXT (").append(docs.size()).append(" chunks) ===\n\n");
        for (int i = 0; i < docs.size(); i++) {
            Document doc = docs.get(i);
            sb.append("--- Chunk ").append(i + 1);
            if (doc.getMetadata().containsKey("chunkIndex")) {
                sb.append(" (index=").append(doc.getMetadata().get("chunkIndex")).append(")");
            }
            if (doc.getScore() != null) {
                sb.append(" [score=").append(String.format("%.3f", doc.getScore())).append("]");
            }
            sb.append(" ---\n");
            sb.append(doc.getText()).append("\n\n");
        }
        return sb.toString();
    }

    private String buildUserPrompt(String query, String context) {
        return """
                %s

                Based ONLY on the resume context above, answer this question:
                %s

                If the specific information is not in the context, say so explicitly.
                """.formatted(context, query);
    }

    // ── PHASE 4: logging helpers ──────────────────────────────────────────────
    private void logChunkPreviews(List<Document> docs, String stage) {
        for (int i = 0; i < docs.size(); i++) {
            Document doc = docs.get(i);
            String preview = doc.getText()
                    .substring(0, Math.min(100, doc.getText().length()))
                    .replace("\n", " ");
            log.info("{} [{}] Chunk[{}] score={} preview='{}'",
                    LOG_PREFIX, stage, i,
                    doc.getScore() != null ? String.format("%.3f", doc.getScore()) : "n/a",
                    preview);
        }
    }

    // Parse simple JSON string array from LLM response
    private List<String> parseJsonArray(String json) {
        List<String> result = new ArrayList<>();
        if (json == null) return result;
        // Remove markdown code blocks if present
        String cleaned = json.replaceAll("```json|```", "").trim();
        // Extract strings between quotes
        java.util.regex.Matcher m =
                java.util.regex.Pattern.compile("\"([^\"]+)\"").matcher(cleaned);
        while (m.find()) result.add(m.group(1));
        return result;
    }
}