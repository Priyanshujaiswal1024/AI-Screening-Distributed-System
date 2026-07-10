package com.talent.platform.chat.service;

import com.talent.platform.chat.client.AiScreeningServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * FIX: Removed JdbcTemplate — resume_chunks is owned by ai-screening-service's DB.
 * Keyword fallback now calls ai-screening-service via Feign: GET /internal/chunks/{resumeId}
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HybridRetrievalService {

    private final VectorStore vectorStore;
    private final AiScreeningServiceClient aiScreeningServiceClient;
    // FIX: JdbcTemplate REMOVED — resume_chunks is not this service's table

    private static final int TOP_K = 10;
    private static final int MIN_VECTOR_RESULTS = 2;

    public List<Document> retrieve(String query, String resumeId) {
        log.info("[HybridRetrieval] resumeId={} query='{}'", resumeId, query);

        List<Document> vectorResults = vectorSearch(query, resumeId);
        log.info("[HybridRetrieval] pgvector returned {} docs", vectorResults.size());

        if (vectorResults.size() >= MIN_VECTOR_RESULTS) {
            log.info("[HybridRetrieval] pgvector sufficient — skipping fallback");
            return vectorResults;
        }

        log.warn("[HybridRetrieval] pgvector insufficient ({}) — keyword fallback", vectorResults.size());
        List<Document> keywordResults = keywordSearch(query, resumeId);
        log.info("[HybridRetrieval] Keyword fallback returned {} docs", keywordResults.size());

        return merge(vectorResults, keywordResults);
    }

    private List<Document> vectorSearch(String query, String resumeId) {
        try {
            int targetTopK = (resumeId != null && !resumeId.isBlank()) ? 5 : TOP_K;
            var builder = SearchRequest.builder().query(query).topK(targetTopK);
            if (resumeId != null && !resumeId.isBlank()) {
                var filter = new FilterExpressionBuilder().eq("resumeId", resumeId).build();
                builder.filterExpression(filter);
            }
            return vectorStore.similaritySearch(builder.build());
        } catch (Exception e) {
            log.error("[HybridRetrieval] pgvector failed: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<Document> keywordSearch(String query, String resumeId) {
        try {
            // FIX: Feign call to ai-screening-service which OWNS resume_chunks
            List<AiScreeningServiceClient.ChunkDto> chunks;
            if (resumeId == null || resumeId.isBlank()) {
                chunks = aiScreeningServiceClient.getAllChunks();
            } else {
                chunks = aiScreeningServiceClient.getResumeChunks(resumeId);
            }

            if (chunks == null || chunks.isEmpty()) return new ArrayList<>();

            String[] words = query.toLowerCase().replaceAll("[^a-z0-9 ]", "").split("\\s+");
            List<String> keywords = Arrays.stream(words).filter(w -> w.length() > 3).toList();
            if (keywords.isEmpty()) return new ArrayList<>();

            List<Document> results = new ArrayList<>();
            for (AiScreeningServiceClient.ChunkDto chunk : chunks) {
                String lower = chunk.content().toLowerCase();
                if (keywords.stream().anyMatch(lower::contains)) {
                    Map<String, Object> meta = new HashMap<>();
                    meta.put("resumeId",   chunk.resumeId() != null ? chunk.resumeId().toString() : resumeId);
                    meta.put("source",     "keyword-fallback");
                    meta.put("chunkIndex", chunk.chunkIndex());
                    results.add(new Document(chunk.content(), meta));
                    if (results.size() >= TOP_K) break;
                }
            }
            log.info("[HybridRetrieval] Keyword matched {} chunks", results.size());
            return results;
        } catch (Exception e) {
            log.error("[HybridRetrieval] Keyword fallback failed: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<Document> merge(List<Document> primary, List<Document> fallback) {
        List<Document> merged = new ArrayList<>(primary);
        Set<String> seen = new HashSet<>();
        primary.forEach(d -> seen.add(d.getText().substring(0, Math.min(50, d.getText().length()))));
        for (Document d : fallback) {
            String key = d.getText().substring(0, Math.min(50, d.getText().length()));
            if (!seen.contains(key)) { merged.add(d); seen.add(key); }
        }
        return merged;
    }

    private String preview(String text) {
        return text.substring(0, Math.min(80, text.length())).replace("\n", " ");
    }
}