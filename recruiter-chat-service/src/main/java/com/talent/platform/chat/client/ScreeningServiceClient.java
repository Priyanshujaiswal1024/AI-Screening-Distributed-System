package com.talent.platform.chat.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * FIX: Corrected endpoint paths to match InternalScreeningReportController:
 *
 * BROKEN: /screening/rankings/{jobId}
 * FIXED:  /screening-reports/ranked?jobDescriptionId={jobId}&minScore=0&topN=10
 *
 * BROKEN: /screening/report?email=&jobId=
 * FIXED:  /screening-reports/{resumeId}?jobDescriptionId={jobId}
 *
 * The old paths did not exist — every call was returning 404.
 */
@FeignClient(name = "candidate-ranking-service", path = "/internal")
public interface ScreeningServiceClient {

    // FIX: was /screening/rankings/{jobId} — endpoint does not exist
    @GetMapping("/screening-reports/ranked")
    String getRankings(
            @RequestParam("jobDescriptionId") String jobId,
            @RequestParam("minScore") double minScore,
            @RequestParam("topN") int topN
    );

    // FIX: was /screening/report?email=&jobId= — endpoint does not exist
    // candidate-ranking-service identifies by resumeId, not email
    @GetMapping("/screening-reports/{resumeId}")
    String getCandidateReport(
            @PathVariable("resumeId") String resumeId,
            @RequestParam("jobDescriptionId") String jobId
    );
}