package com.talent.platform.candidaterankingservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

/**
 * Feign client for candidate name/email — still served by resume-management-service.
 * Chunks are now fetched from ai-screening-service via ResumeServiceClient.
 */
@FeignClient(name = "resume-management-service", path = "/internal", contextId = "candidateInfoClient")
public interface CandidateInfoClient {

    @GetMapping("/resumes/{resumeId}/name")
    String getCandidateName(@PathVariable("resumeId") UUID resumeId);

    @GetMapping("/resumes/{resumeId}/email")
    String getCandidateEmail(@PathVariable("resumeId") UUID resumeId);

    @GetMapping("/resumes/{resumeId}/skills")
    String getCandidateSkills(@PathVariable("resumeId") UUID resumeId);
}
