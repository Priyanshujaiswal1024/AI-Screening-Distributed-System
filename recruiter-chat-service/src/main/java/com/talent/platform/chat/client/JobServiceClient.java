package com.talent.platform.chat.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "job-description-service", path = "/internal")
public interface JobServiceClient {

    @GetMapping("/jobs/{jobId}")
    String getJobDetails(@PathVariable("jobId") String jobId);

    @GetMapping("/jobs/{jobId}/text")
    String getJobText(@PathVariable("jobId") String jobId);

    @GetMapping("/jobs")
    String getAllJobs();
}