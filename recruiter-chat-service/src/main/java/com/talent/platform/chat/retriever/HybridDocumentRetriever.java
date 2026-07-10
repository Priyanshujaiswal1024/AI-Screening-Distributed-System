package com.talent.platform.chat.retriever;

import com.talent.platform.chat.service.HybridRetrievalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.rag.Query;
import org.springframework.ai.rag.retrieval.search.DocumentRetriever;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Adapts HybridRetrievalService (which needs an explicit resumeId)
 * to Spring AI's DocumentRetriever contract (which only gives us a Query).
 *
 * resumeId MUST be placed into the Query context before this is invoked, e.g.:
 *
 *   Query query = Query.builder()
 *       .text(userText)
 *       .context(Map.of("resumeId", resumeId))
 *       .build();
 *
 * and passed via the ChatClient advisor param / RAG entrypoint that builds the Query.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class HybridDocumentRetriever implements DocumentRetriever {

    public static final String RESUME_ID_CONTEXT_KEY = "resumeId";

    private final HybridRetrievalService hybridRetrievalService;

    @Override
    public List<Document> retrieve(Query query) {
        Object resumeIdObj = query.context() != null
                ? query.context().get(RESUME_ID_CONTEXT_KEY)
                : null;

        if (resumeIdObj == null) {
            log.error("[HybridDocumentRetriever] Missing '{}' in Query context — cannot scope retrieval",
                    RESUME_ID_CONTEXT_KEY);
            throw new IllegalStateException(
                    "resumeId must be present in Query context for HybridDocumentRetriever");
        }

        String resumeId = resumeIdObj.toString();
        return hybridRetrievalService.retrieve(query.text(), resumeId);
    }
}