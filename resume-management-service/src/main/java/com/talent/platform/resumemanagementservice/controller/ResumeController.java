package com.talent.platform.resumemanagementservice.controller;

import com.talent.platform.resumemanagementservice.model.CandidateResume;
import com.talent.platform.resumemanagementservice.repository.ResumeRepository;
import com.talent.platform.resumemanagementservice.messaging.KafkaEventPublisher;
import com.talent.platform.resumemanagementservice.service.StorageService;
import com.talent.platform.resumemanagementservice.service.SagaOrchestrator;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@RestController
@RequestMapping("/api/v1/resumes")
@RequiredArgsConstructor
@Slf4j
public class ResumeController {

    private final ResumeRepository resumeRepository;
    private final KafkaEventPublisher eventPublisher;
    private final StorageService storageService;
    private final SagaOrchestrator sagaOrchestrator;
    private final MeterRegistry meterRegistry;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    // Keep the old single-file endpoint working (frontend already calls this) ─
    @PostMapping("/upload")
    @Transactional
    public ResponseEntity<?> uploadResume(
            @RequestParam("file") MultipartFile file,
            @RequestParam("recruiterId") UUID recruiterId,
            @RequestParam(value = "jobId", required = false) UUID jobId,
            @RequestParam(value = "candidateName",  required = false) String candidateName,
            @RequestParam(value = "candidateEmail", required = false) String candidateEmail) {

        Map<String, Object> result = processSingleFile(file, recruiterId, jobId, candidateName, candidateEmail);
        if (result.containsKey("error")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", result.get("error")));
        }
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(result);
    }

    // NEW: bulk upload — accepts multiple files in one multipart request ─────
    @PostMapping("/upload-bulk")
    @Transactional
    public ResponseEntity<?> uploadResumesBulk(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam("recruiterId") UUID recruiterId,
            @RequestParam(value = "jobId", required = false) UUID jobId) {

        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No files provided."));
        }

        List<Map<String, Object>> successResults = new ArrayList<>();
        List<Map<String, Object>> failedResults = new ArrayList<>();

        for (MultipartFile file : files) {
            Map<String, Object> result = processSingleFile(file, recruiterId, jobId, null, null);
            if (result.containsKey("error")) {
                failedResults.add(Map.of(
                        "fileName", file.getOriginalFilename(),
                        "message", result.get("error")));
            } else {
                successResults.add(result);
            }
        }

        log.info("[BulkUpload] recruiterId={} total={} success={} failed={}",
                recruiterId, files.size(), successResults.size(), failedResults.size());

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                "totalReceived", files.size(),
                "accepted", successResults.size(),
                "rejected", failedResults.size(),
                "results", successResults,
                "errors", failedResults
        ));
    }

    private Map<String, Object> processSingleFile(
            MultipartFile file, UUID recruiterId, UUID jobId, String candidateName, String candidateEmail) {

        if (file == null || file.isEmpty()) {
            meterRegistry.counter("resumes.uploaded.total", "status", "empty").increment();
            return Map.of("error", "File is empty.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            meterRegistry.counter("resumes.uploaded.total", "status", "invalid_type").increment();
            return Map.of("error", "Only PDF and DOCX files are accepted: " + file.getOriginalFilename());
        }

        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            // FIX 7: Duplicate detection by email + jobId
            if (candidateEmail != null && !candidateEmail.isBlank() && !candidateEmail.equals("unknown@email.com") && jobId != null) {
                List<CandidateResume> existing = resumeRepository.findByCandidateEmailAndJobIdAndStatus(candidateEmail, jobId, "SCREENED");
                if (existing != null && !existing.isEmpty()) {
                    log.warn("[ResumeService] Duplicate detected email={} jobId={}", candidateEmail, jobId);
                    return Map.of("error", "Duplicate detected: A screened resume with email=" + candidateEmail + " already exists for jobId=" + jobId);
                }
            }

            String fileUrl = storageService.upload(file);

            CandidateResume resume = CandidateResume.builder()
                    .recruiterId(recruiterId)
                    .jobId(jobId)
                    .candidateName(candidateName != null ? candidateName : "Unknown")
                    .candidateEmail(candidateEmail != null ? candidateEmail : "unknown@email.com")
                    .fileUrl(fileUrl)
                    .status("UPLOADED")
                    .build();

            CandidateResume saved = resumeRepository.save(resume);
            sagaOrchestrator.startSaga(saved.getId(), saved.getFileUrl());
            eventPublisher.publishResumeUploaded(saved.getId(), saved.getFileUrl(), saved.getRecruiterId(), saved.getJobId());

            sample.stop(meterRegistry.timer("resumes.upload.duration", "status", "success"));
            meterRegistry.counter("resumes.uploaded.total", "status", "success").increment();

            return new HashMap<>(Map.of(
                    "resumeId", saved.getId(),
                    "fileName", file.getOriginalFilename(),
                    "status", "UPLOADED"
            ));
        } catch (Exception e) {
            sample.stop(meterRegistry.timer("resumes.upload.duration", "status", "failed"));
            meterRegistry.counter("resumes.uploaded.total", "status", "failed").increment();
            log.error("[BulkUpload] Failed for file={}: {}", file.getOriginalFilename(), e.getMessage());
            return Map.of("error", "Upload failed: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<CandidateResume> getResume(@PathVariable UUID id) {
        return resumeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/recruiter/{recruiterId}")
    public ResponseEntity<List<CandidateResume>> getByRecruiter(
            @PathVariable UUID recruiterId,
            @RequestParam(value = "archived", defaultValue = "false") boolean archived) {
        return ResponseEntity.ok(resumeRepository.findByRecruiterIdAndArchived(recruiterId, archived));
    }

    @PutMapping("/{id}/archive")
    public ResponseEntity<?> archiveResume(
            @PathVariable UUID id,
            @RequestParam(value = "archive", defaultValue = "true") boolean archive) {
        return resumeRepository.findById(id)
                .map(resume -> {
                    resume.setArchived(archive);
                    resumeRepository.save(resume);
                    log.info("[ResumeController] Resume {} archive status updated to {}", id, archive);
                    return ResponseEntity.ok(Map.of(
                            "message", "Resume archive status updated to " + archive,
                            "resumeId", id,
                            "archived", archive
                    ));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteResume(@PathVariable UUID id) {
        return resumeRepository.findById(id)
                .map(resume -> {
                    try {
                        // 1. Delete S3 file
                        storageService.delete(resume.getFileUrl());
                        log.info("[ResumeController] Deleted S3 file for resume {}", id);

                        // 2. Publish resume-deleted Kafka event
                        eventPublisher.publishResumeDeleted(id);
                        log.info("[ResumeController] Published resume-deleted event for resume {}", id);

                        // 3. Delete database record
                        resumeRepository.delete(resume);
                        log.info("[ResumeController] Deleted CandidateResume record {} from database", id);

                        return ResponseEntity.ok(Map.of("message", "Resume deleted successfully."));
                    } catch (Exception e) {
                        log.error("[ResumeController] Hard delete failed for resume {}: {}", id, e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(Map.of("message", "Hard delete failed: " + e.getMessage()));
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> getResumeFile(@PathVariable UUID id) {
        return resumeRepository.findById(id)
                .map(resume -> {
                    try {
                        var s3is = storageService.download(resume.getFileUrl());
                        String filename = resume.getFileUrl().substring(resume.getFileUrl().lastIndexOf("_") + 1);
                        String contentType = s3is.response().contentType();
                        if (contentType == null) {
                            contentType = "application/octet-stream";
                        }
                        return ResponseEntity.ok()
                                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                                .contentType(MediaType.parseMediaType(contentType))
                                .body(new org.springframework.core.io.InputStreamResource(s3is));
                    } catch (Exception e) {
                        log.error("Failed to stream file for resume={}: {}", id, e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).<org.springframework.core.io.InputStreamResource>build();
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }
}