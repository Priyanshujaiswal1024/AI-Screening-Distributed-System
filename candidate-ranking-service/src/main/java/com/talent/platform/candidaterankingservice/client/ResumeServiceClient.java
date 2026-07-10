package com.talent.platform.candidaterankingservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.UUID;

/**
 * FIX — Bug #5 (Critical):
 *
 * Previously this pointed to "resume-management-service" for /resumes/{id}/chunks,
 * but ResumeInternalController.getResumeChunks() always returns List.of() with a warning log.
 * This caused RankingService to throw IllegalStateException("No resume chunks found") on EVERY
 * auto-ranking attempt triggered by the resume-parsed Kafka event.
 *
 * FIX: Get chunks from ai-screening-service's InternalChunksController which reads from
 * ResumeChunkRepository (populated during the AI parse pipeline).
 * Get candidate name/email from resume-management-service (still correct for those).
 */
@FeignClient(name = "ai-screening-service", path = "/internal", contextId = "chunkClient")
public interface ResumeServiceClient {

    /**
     * Returns the plain-text content strings for each chunk of the resume.
     * Served by ai-screening-service InternalChunksController.
     * Path: GET /internal/chunks/{resumeId} → List<ChunkDto{chunkIndex, content}>
     *
     * We decode as List<String> here — Feign decodes the JSON array by reading the "content" field.
     * NOTE: since the response is List<ChunkDto> not List<String>, we need the metadata client below.
     */
    @GetMapping("/chunks/{resumeId}/text")
    List<String> getResumeChunks(@PathVariable("resumeId") UUID resumeId);
}