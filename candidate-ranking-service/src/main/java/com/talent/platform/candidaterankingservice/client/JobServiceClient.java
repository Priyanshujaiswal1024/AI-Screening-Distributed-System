package com.talent.platform.candidaterankingservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "job-description-service", path = "/internal")
public interface JobServiceClient {

    @GetMapping("/jobs/{jobId}/text")
    String getJobText(@PathVariable("jobId") UUID jobId);

    @GetMapping("/jobs/{jobId}/skills")
    List<String> getJobSkills(@PathVariable("jobId") UUID jobId);

    // FIX: this endpoint must exist in job-description-service
    // → GET /internal/recruiters/{recruiterId}/jobs
    @GetMapping("/recruiters/{recruiterId}/jobs")
    List<UUID> getJobIdsByRecruiter(@PathVariable("recruiterId") UUID recruiterId);
}