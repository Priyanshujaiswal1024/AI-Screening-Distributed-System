package com.talent.platform.aiscreening.controller;

import com.talent.platform.aiscreening.repository.ResumeChunkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Internal endpoint for serving resume chunks to other services.
 *
 * candidate-ranking-service calls GET /internal/chunks/{resumeId}/text to
 * retrieve a flat List<String> of chunk content for embedding and scoring.
 *
 * recruiter-chat-service calls GET /internal/chunks/{resumeId} for full ChunkDto.
 */
@RestController
@RequestMapping("/internal/chunks")
@RequiredArgsConstructor
@Slf4j
public class InternalChunksController {

    private final ResumeChunkRepository chunkRepository;

    /** Full ChunkDto list — used by recruiter-chat-service */
    @GetMapping("/{resumeId}")
    public ResponseEntity<List<ChunkDto>> getChunks(@PathVariable UUID resumeId) {
        List<ChunkDto> chunks = chunkRepository.findByResumeId(resumeId)
                .stream()
                .map(c -> new ChunkDto(c.getResumeId(), c.getChunkIndex(), c.getContent()))
                .toList();

        log.info("[InternalChunks] Returning {} chunks for resume={}", chunks.size(), resumeId);
        return ResponseEntity.ok(chunks);
    }

    @GetMapping("/all")
    public ResponseEntity<List<ChunkDto>> getAllChunks() {
        List<ChunkDto> chunks = chunkRepository.findAll()
                .stream()
                .map(c -> new ChunkDto(c.getResumeId(), c.getChunkIndex(), c.getContent()))
                .toList();

        log.info("[InternalChunks] Returning all {} chunks", chunks.size());
        return ResponseEntity.ok(chunks);
    }

    /**
     * Flat text list — used by candidate-ranking-service ResumeServiceClient.
     * Returns just the content string from each chunk (no index metadata).
     * FIX: candidate-ranking-service previously called resume-management-service
     *      which always returned [] — this endpoint returns real data.
     *
     * Note: this flat text endpoint does not need to include resumeId since it's just a flat list of String.
     */
    @GetMapping("/{resumeId}/text")
    public ResponseEntity<List<String>> getChunkTexts(@PathVariable UUID resumeId) {
        List<String> texts = chunkRepository.findByResumeId(resumeId)
                .stream()
                .map(c -> c.getContent())
                .toList();

        log.info("[InternalChunks] Returning {} chunk texts for resume={}", texts.size(), resumeId);
        return ResponseEntity.ok(texts);
    }

    public record ChunkDto(UUID resumeId, int chunkIndex, String content) {}
}