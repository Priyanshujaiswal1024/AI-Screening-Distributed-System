package com.talent.platform.candidaterankingservice.controller;

import com.talent.platform.candidaterankingservice.model.ScreeningReport;
import com.talent.platform.candidaterankingservice.service.RankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RankingController {

    private final RankingService rankingService;

    @PostMapping("/screening/screen")
    public ResponseEntity<ScreeningReport> triggerScreening(@RequestBody Map<String, String> request) {
        UUID jobId = UUID.fromString(request.get("jobId"));
        UUID resumeId = UUID.fromString(request.get("resumeId"));
        
        ScreeningReport report = rankingService.calculateAndStoreScore(jobId, resumeId);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/ranking/{jobId}")
    public ResponseEntity<List<ScreeningReport>> getRankings(@PathVariable UUID jobId) {
        return ResponseEntity.ok(rankingService.getRankedCandidates(jobId));
    }

    @GetMapping("/ranking/raw/{jobId}")
    public ResponseEntity<List<ScreeningReport>> getRankedCandidates(@PathVariable UUID jobId) {
        return ResponseEntity.ok(rankingService.getRankedCandidates(jobId));
    }

    @GetMapping("/ranking/report/{resumeId}")
    public ResponseEntity<ScreeningReport> getScreeningReport(
            @PathVariable UUID resumeId,
            @RequestParam UUID jobId) {
        ScreeningReport report = rankingService.getScreeningReport(resumeId, jobId);
        if (report == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(report);
    }

    @GetMapping("/ranking/reports/resume/{resumeId}")
    public ResponseEntity<List<ScreeningReport>> getReportsByResume(@PathVariable UUID resumeId) {
        return ResponseEntity.ok(rankingService.getReportsByResume(resumeId));
    }
}
