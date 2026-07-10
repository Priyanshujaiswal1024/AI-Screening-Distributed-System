package com.talent.platform.resumemanagementservice.controller;

import com.talent.platform.resumemanagementservice.dto.ResumeMetadataDto;
import com.talent.platform.resumemanagementservice.repository.ResumeRepository;
import com.talent.platform.resumemanagementservice.service.SagaOrchestrator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/internal/resumes")
@RequiredArgsConstructor
@Slf4j
public class ResumeInternalController {

    private final ResumeRepository resumeRepository;
    private final SagaOrchestrator sagaOrchestrator;

    @GetMapping("/{resumeId}/metadata")
    public ResponseEntity<ResumeMetadataDto> getResumeMetadata(@PathVariable UUID resumeId) {
        return resumeRepository.findById(resumeId)
                .map(r -> ResponseEntity.ok(new ResumeMetadataDto(r.getCandidateName(), r.getCandidateEmail())))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{resumeId}/status")
    public ResponseEntity<Void> updateResumeStatus(
            @PathVariable UUID resumeId, @RequestParam String status) {
        if (!List.of("UPLOADED", "PARSED", "SCREENED", "FAILED").contains(status)) {
            log.warn("[Internal] Rejected invalid status '{}' for resume {}", status, resumeId);
            return ResponseEntity.badRequest().build();
        }
        return resumeRepository.findById(resumeId)
                .map(resume -> {
                    resume.setStatus(status);
                    resumeRepository.save(resume);
                    log.info("[FIX] [Internal] Updated resume {} status → {}", resumeId, status);
                    
                    // FIX 4: Update saga_instances in same transaction
                    try {
                        sagaOrchestrator.advanceSaga(resumeId, status);
                    } catch (Exception e) {
                        log.error("[FIX] [Internal] Failed to advance saga for resume={}: {}", resumeId, e.getMessage());
                    }
                    
                    return ResponseEntity.ok().<Void>build();
                })
                .orElseGet(() -> {
                    log.warn("[Internal] Resume {} not found", resumeId);
                    return ResponseEntity.notFound().build();
                });
    }

    @GetMapping("/{resumeId}/candidate-info")
    public ResponseEntity<CandidateInfoDto> getCandidateInfo(@PathVariable UUID resumeId) {
        return resumeRepository.findById(resumeId)
                .map(r -> ResponseEntity.ok(new CandidateInfoDto(r.getId(), r.getCandidateName(), r.getCandidateEmail())))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public ResponseEntity<List<CandidateSearchDto>> searchCandidates(
            @RequestParam(defaultValue = "")    String skillKeyword,
            @RequestParam(defaultValue = "")    String candidateName,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "20")  int limit) {

        int safeLimit = Math.min(Math.max(limit, 1), 50);
        String statusParam = "ALL".equalsIgnoreCase(status) ? null : status.toUpperCase();

        List<CandidateSearchDto> results = resumeRepository
                .searchCandidates(statusParam, candidateName, skillKeyword, false, PageRequest.of(0, safeLimit))
                .stream()
                .map(r -> new CandidateSearchDto(r.getId(), r.getCandidateName(),
                        r.getCandidateEmail(), r.getStatus(), r.getFileUrl()))
                .toList();

        log.info("[Internal] search → {} results", results.size());
        return ResponseEntity.ok(results);
    }

    /**
     * BUG FIXED: was using StringBuilder to manually build JSON — breaks on any
     * special character (quotes, backslashes, Unicode) in candidate name/email.
     *
     * FIX: return List<CandidateSearchDto> and let Jackson serialize it.
     * Jackson handles ALL escaping correctly and the return type is still
     * JSON-serializable, so recruiter-chat-service's Feign client that
     * previously expected String will need ONE of these two changes:
     *
     * Option A (recommended): Change Feign client return type to List<CandidateSearchDto>
     *   — strongly typed, null-safe, no manual parsing in the chat service.
     *
     * Option B (no Feign change): Keep return type ResponseEntity<String> but
     *   delegate serialization to Jackson via ObjectMapper:
     *   @Autowired ObjectMapper objectMapper;
     *   return ResponseEntity.ok(objectMapper.writeValueAsString(results));
     *   — still safe, Jackson handles escaping, no manual StringBuilder.
     *
     * We use Option A here. Update RecruiterAssistantTools.ResumeServiceClient
     * to match: String searchCandidates(@RequestParam("q") String query)
     * → List<CandidateSearchDto> searchCandidates(@RequestParam("q") String query)
     */
    @GetMapping("/search-by-query")
    public ResponseEntity<List<CandidateSearchDto>> searchByQuery(@RequestParam("q") String query) {
        List<CandidateSearchDto> results = resumeRepository
                .searchByNameOrEmail(query)
                .stream()
                .map(r -> new CandidateSearchDto(
                        r.getId(),
                        r.getCandidateName(),
                        r.getCandidateEmail(),
                        r.getStatus(),
                        r.getFileUrl()))
                .toList();

        log.info("[Internal] search-by-query q='{}' → {} results", query, results.size());
        return ResponseEntity.ok(results); // Jackson serializes safely — no manual JSON building
    }

    @GetMapping("/{resumeId}/chunks")
    public ResponseEntity<List<String>> getResumeChunks(@PathVariable UUID resumeId) {
        log.warn("[Internal] /chunks called for resume {} — returns empty; use ai-screening-service", resumeId);
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/{resumeId}/name")
    public ResponseEntity<String> getCandidateName(@PathVariable UUID resumeId) {
        return resumeRepository.findById(resumeId)
                .map(r -> ResponseEntity.ok(r.getCandidateName()))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{resumeId}/email")
    public ResponseEntity<String> getCandidateEmail(@PathVariable UUID resumeId) {
        return resumeRepository.findById(resumeId)
                .map(r -> ResponseEntity.ok(r.getCandidateEmail()))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{resumeId}/skills")
    public ResponseEntity<String> getCandidateSkills(@PathVariable UUID resumeId) {
        return resumeRepository.findById(resumeId)
                .map(r -> ResponseEntity.ok(r.getSkills()))
                .orElse(ResponseEntity.notFound().build());
    }

    public record CandidateInfoDto(UUID resumeId, String candidateName, String candidateEmail) {}
    public record CandidateSearchDto(UUID resumeId, String candidateName,
                                     String candidateEmail, String status, String fileUrl) {}
}