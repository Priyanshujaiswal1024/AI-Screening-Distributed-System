package com.talent.platform.chat.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

import java.util.UUID;

/**
 * FIX: resume_chunks is owned by ai-screening-service.
 * HybridRetrievalService keyword fallback must call THIS, not ResumeServiceClient.
 * ai-screening-service exposes GET /internal/chunks/{resumeId}.
 */
@FeignClient(
    name = "ai-screening-service", 
    path = "/internal", 
    fallbackFactory = AiScreeningServiceClientFallbackFactory.class
)
public interface AiScreeningServiceClient {

    @GetMapping("/chunks/{resumeId}")
    List<ChunkDto> getResumeChunks(@PathVariable("resumeId") String resumeId);

    @GetMapping("/chunks/all")
    List<ChunkDto> getAllChunks();

    record ChunkDto(UUID resumeId, int chunkIndex, String content) {}
}