package com.talent.platform.candidaterankingservice.controller;

import com.talent.platform.candidaterankingservice.dto.InternalScreeningDtos.RankedCandidateDto;
import com.talent.platform.candidaterankingservice.dto.InternalScreeningDtos.ScreeningReportDto;
import com.talent.platform.candidaterankingservice.service.InternalScreeningReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * FIX: DTOs moved to InternalScreeningDtos.java — no longer inner records here.
 *      This breaks the circular import: service → controller.
 */
@RestController
@RequestMapping("/internal/screening-reports")
@RequiredArgsConstructor
public class InternalScreeningReportController {

    private final InternalScreeningReportService service;

    @GetMapping("/ranked")
    public ResponseEntity<List<RankedCandidateDto>> getRankedCandidates(
            @RequestParam UUID   jobDescriptionId,
            @RequestParam double minScore,
            @RequestParam int    topN) {
        return ResponseEntity.ok(service.getRankedCandidates(jobDescriptionId, minScore, topN));
    }

    @GetMapping("/score")
    public ResponseEntity<RankedCandidateDto> getCandidateScore(
            @RequestParam UUID resumeId,
            @RequestParam UUID jobDescriptionId) {
        return ResponseEntity.ok(service.getCandidateScore(resumeId, jobDescriptionId));
    }

    @GetMapping("/{resumeId}")
    public ResponseEntity<ScreeningReportDto> getScreeningReport(
            @PathVariable UUID resumeId,
            @RequestParam UUID jobDescriptionId) {
        return ResponseEntity.ok(service.getScreeningReport(resumeId, jobDescriptionId));
    }
}