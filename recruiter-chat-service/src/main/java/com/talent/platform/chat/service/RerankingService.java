package com.talent.platform.chat.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.rag.Query;
import org.springframework.ai.rag.postretrieval.ranking.DocumentRanker; // M6 package
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class RerankingService implements DocumentRanker {

    private static final int TOP_K = 5;
    private final EmbeddingModel embeddingModel;

    @Override
    public List<Document> rank(Query query, List<Document> documents) {
        if (documents == null || documents.isEmpty()) return new ArrayList<>();

        log.info("[Reranker] Reranking {} docs for query='{}'",
                documents.size(), query.text());

        float[] queryEmb = embeddingModel.embed(query.text());

        record Scored(Document doc, double score) {}

        List<Scored> scored = new ArrayList<>();
        for (Document doc : documents) {
            double score = doc.getScore() != null
                    ? doc.getScore()
                    : cosine(queryEmb, embeddingModel.embed(doc.getText()));
            scored.add(new Scored(doc, score));
            log.info("[Reranker] score={} preview='{}'",
                    String.format("%.4f", score),
                    doc.getText().substring(0, Math.min(80, doc.getText().length()))
                            .replace("\n", " "));
        }

        scored.sort(Comparator.comparingDouble(Scored::score).reversed());

        List<Document> result = scored.stream()
                .limit(TOP_K)
                .peek(s -> s.doc().getMetadata()
                        .put("rerankScore", String.format("%.4f", s.score())))
                .map(Scored::doc)
                .toList();

        log.info("[Reranker] Selected top {} docs", result.size());
        return result;
    }

    private double cosine(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) return 0.0;
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            na  += a[i] * a[i];
            nb  += b[i] * b[i];
        }
        return (na == 0 || nb == 0) ? 0.0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
    }
}