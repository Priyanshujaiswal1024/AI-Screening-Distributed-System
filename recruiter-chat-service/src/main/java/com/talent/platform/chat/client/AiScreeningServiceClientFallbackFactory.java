package com.talent.platform.chat.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
@Slf4j
public class AiScreeningServiceClientFallbackFactory implements FallbackFactory<AiScreeningServiceClient> {

    @Override
    public AiScreeningServiceClient create(Throwable cause) {
        return new AiScreeningServiceClient() {
            @Override
            public List<ChunkDto> getResumeChunks(String resumeId) {
                log.warn("[Fallback] Failed to retrieve chunks for resume={}: {}. Executing local fallback (returning empty chunk list).", 
                        resumeId, cause.getMessage());
                // Fallback returns empty list so the RAG pipeline continues with empty context instead of failing
                return new ArrayList<>();
            }

            @Override
            public List<ChunkDto> getAllChunks() {
                log.warn("[Fallback] Failed to retrieve all chunks: {}. Executing local fallback.", cause.getMessage());
                return new ArrayList<>();
            }
        };
    }
}
