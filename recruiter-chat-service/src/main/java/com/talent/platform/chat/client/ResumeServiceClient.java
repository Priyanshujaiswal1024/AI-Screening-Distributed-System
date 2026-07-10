package com.talent.platform.chat.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * FIX: searchCandidates now calls /resumes/search-by-query?q=
 *      which resume-management-service handles and returns JSON String.
 *      The original /resumes/search?q= did not match any param name in the controller.
 */
@FeignClient(name = "resume-management-service", path = "/internal")
public interface ResumeServiceClient {

    @GetMapping("/resumes/search-by-query")
    String searchCandidates(@RequestParam("q") String query);

    @GetMapping("/resumes/{resumeId}/name")
    String getCandidateName(@PathVariable("resumeId") String resumeId);

    @GetMapping("/resumes/{resumeId}/email")
    String getCandidateEmail(@PathVariable("resumeId") String resumeId);
}