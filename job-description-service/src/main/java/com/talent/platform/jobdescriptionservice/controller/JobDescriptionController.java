package com.talent.platform.jobdescriptionservice.controller;

import com.talent.platform.jobdescriptionservice.dto.CreateJobRequest;
import com.talent.platform.jobdescriptionservice.dto.JobDetailsDto;
import com.talent.platform.jobdescriptionservice.model.JobDescription;
import com.talent.platform.jobdescriptionservice.service.InternalJobService;
import com.talent.platform.jobdescriptionservice.service.JobDescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class JobDescriptionController {

    private final JobDescriptionService jobService;
    private final InternalJobService internalJobService;

    // ── Public API ────────────────────────────────────────────────────────────

    @PostMapping("/api/v1/jobs")
    public ResponseEntity<?> createJob(@Valid @RequestBody CreateJobRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(jobService.createJob(request));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/api/v1/jobs/{id}")
    public ResponseEntity<JobDescription> getJob(@PathVariable UUID id) {
        try { return ResponseEntity.ok(jobService.getById(id)); }
        catch (IllegalArgumentException e) { return ResponseEntity.notFound().build(); }
    }

    @GetMapping("/api/v1/jobs/recruiter/{recruiterId}")
    public ResponseEntity<List<JobDescription>> getByRecruiter(@PathVariable UUID recruiterId) {
        return ResponseEntity.ok(jobService.getByRecruiter(recruiterId));
    }

    @PutMapping("/api/v1/jobs/{id}")
    public ResponseEntity<?> updateJob(@PathVariable UUID id,
                                       @Valid @RequestBody CreateJobRequest request) {
        try { return ResponseEntity.ok(jobService.updateJob(id, request)); }
        catch (IllegalArgumentException e) { return ResponseEntity.notFound().build(); }
    }

    @DeleteMapping("/api/v1/jobs/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable UUID id) {
        jobService.deleteJob(id);
        return ResponseEntity.noContent().build();
    }

    // ── Internal API ──────────────────────────────────────────────────────────

    @GetMapping("/internal/jobs/{id}/text")
    public ResponseEntity<String> getJobText(@PathVariable UUID id) {
        try { return ResponseEntity.ok(jobService.getById(id).getRawText()); }
        catch (IllegalArgumentException e) { return ResponseEntity.notFound().build(); }
    }

    @GetMapping("/internal/jobs/{id}/skills")
    public ResponseEntity<List<String>> getJobSkills(@PathVariable UUID id) {
        try { return ResponseEntity.ok(jobService.getById(id).getKeySkills()); }
        catch (IllegalArgumentException e) { return ResponseEntity.notFound().build(); }
    }

    @GetMapping("/internal/jobs/{id}")
    public ResponseEntity<JobDescription> getJobInternal(@PathVariable UUID id) {
        try { return ResponseEntity.ok(jobService.getById(id)); }
        catch (IllegalArgumentException e) { return ResponseEntity.notFound().build(); }
    }

    @GetMapping("/internal/jobs/{id}/details")
    public ResponseEntity<JobDetailsDto> getJobDetails(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(internalJobService.getJobDetails(id));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/internal/jobs")
    public ResponseEntity<List<JobDescription>> getAllJobsInternal() {
        return ResponseEntity.ok(jobService.getAllJobs());
    }

    /**
     * FIX: candidate-ranking-service ResumeParsedConsumer calls this endpoint
     * to find all jobs for a recruiter so it can auto-screen an uploaded resume
     * against every job the recruiter has posted.
     *
     * Called by: JobServiceClient.getJobIdsByRecruiter()
     */
    @GetMapping("/internal/recruiters/{recruiterId}/jobs")
    public ResponseEntity<List<UUID>> getJobIdsByRecruiter(@PathVariable UUID recruiterId) {
        List<UUID> ids = jobService.getByRecruiter(recruiterId)
                .stream()
                .map(JobDescription::getId)
                .collect(Collectors.toList());
//        log.info("[Internal] recruiter={} has {} jobs", recruiterId, ids.size());
        return ResponseEntity.ok(ids);
    }
}