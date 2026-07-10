package com.talent.platform.chat.retriever;

import com.talent.platform.chat.service.RerankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.document.Document;
import org.springframework.ai.rag.Query;
import org.springframework.ai.rag.retrieval.search.DocumentRetriever;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class RerankingDocumentRetriever implements DocumentRetriever {

    private final HybridDocumentRetriever hybridDocumentRetriever;
    private final RerankingService rerankingService;

    @Override
    public List<Document> retrieve(Query query) {
        List<Document> retrieved = hybridDocumentRetriever.retrieve(query);
        return rerankingService.rank(query, retrieved);
    }
}