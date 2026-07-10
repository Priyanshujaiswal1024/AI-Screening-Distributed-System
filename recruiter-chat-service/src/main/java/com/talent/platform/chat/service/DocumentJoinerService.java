package com.talent.platform.chat.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * PHASE 2 — DocumentJoiner
 *
 * When MultiQueryExpander produces N queries, each query retrieves its own
 * list of documents. This joiner:
 *   1. Merges all lists
 *   2. Deduplicates by document ID
 *   3. Boosts score for documents appearing in multiple query results (reciprocal rank fusion)
 *   4. Returns ranked merged list
 */
@Service
@Slf4j
public class DocumentJoinerService {

    public List<Document> join(List<List<Document>> retrievalResults) {
        log.info("[DocumentJoiner] Joining {} retrieval result sets", retrievalResults.size());

        // Reciprocal Rank Fusion (RRF) scoring
        Map<String, Double> rrfScores  = new LinkedHashMap<>();
        Map<String, Document> docById  = new LinkedHashMap<>();

        int k = 60; // RRF constant — standard value

        for (List<Document> results : retrievalResults) {
            for (int rank = 0; rank < results.size(); rank++) {
                Document doc = results.get(rank);
                String docId = getDocId(doc);
                docById.put(docId, doc);
                double rrfScore = 1.0 / (k + rank + 1);
                rrfScores.merge(docId, rrfScore, Double::sum);
            }
        }

        // Sort by RRF score descending
        List<Map.Entry<String, Double>> sorted = new ArrayList<>(rrfScores.entrySet());
        sorted.sort(Map.Entry.<String, Double>comparingByValue().reversed());

        List<Document> joined = new ArrayList<>();
        for (Map.Entry<String, Double> entry : sorted) {
            Document doc = docById.get(entry.getKey());
            doc.getMetadata().put("rrfScore", entry.getValue());
            joined.add(doc);
            log.debug("[DocumentJoiner] docId={} rrfScore={:.4f} preview='{}'",
                    entry.getKey(),
                    entry.getValue(),
                    preview(doc.getText()));
        }

        log.info("[DocumentJoiner] Merged {} unique documents from {} result sets",
                joined.size(), retrievalResults.size());
        return joined;
    }

    private String getDocId(Document doc) {
        // Use document ID if set, otherwise use content hash
        if (doc.getId() != null && !doc.getId().isBlank()) return doc.getId();
        return String.valueOf(doc.getText().hashCode());
    }

    private String preview(String text) {
        return text.substring(0, Math.min(80, text.length())).replace("\n", " ");
    }
}