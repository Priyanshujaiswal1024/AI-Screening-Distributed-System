package com.talent.platform.interviewschedulingservice.controller;

import com.talent.platform.interviewschedulingservice.dto.InterviewResponse;
import com.talent.platform.interviewschedulingservice.dto.ScheduleInterviewRequest;
import com.talent.platform.interviewschedulingservice.service.InterviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/interviews")
@RequiredArgsConstructor
@Slf4j
public class InterviewController {

    private final InterviewService interviewService;

    /**
     * Schedule a single interview.
     * Recruiter's email & name are injected from gateway headers.
     */
    @PostMapping
    public ResponseEntity<InterviewResponse> scheduleInterview(
            @RequestBody ScheduleInterviewRequest request,
            @RequestHeader(value = "X-User-Email", required = false) String recruiterEmail,
            @RequestHeader(value = "X-User-Name", required = false) String recruiterName) {

        log.info("[InterviewController] Schedule interview: candidate={} job={} recruiter={}",
                request.getCandidateEmail(), request.getJobTitle(), recruiterEmail);

        InterviewResponse response = interviewService.scheduleInterview(request, recruiterEmail, recruiterName);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Schedule multiple interviews at once (bulk).
     */
    @PostMapping("/bulk")
    public ResponseEntity<List<InterviewResponse>> scheduleBulk(
            @RequestBody List<ScheduleInterviewRequest> requests,
            @RequestHeader(value = "X-User-Email", required = false) String recruiterEmail,
            @RequestHeader(value = "X-User-Name", required = false) String recruiterName) {

        log.info("[InterviewController] Bulk schedule: {} candidates by recruiter={}", requests.size(), recruiterEmail);

        List<InterviewResponse> responses = interviewService.scheduleBulk(requests, recruiterEmail, recruiterName);
        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    /**
     * Get all interviews scheduled by the logged-in recruiter.
     */
    @GetMapping
    public ResponseEntity<List<InterviewResponse>> getMyInterviews(
            @RequestHeader(value = "X-User-Email", required = false) String recruiterEmail) {

        return ResponseEntity.ok(interviewService.getInterviewsByRecruiter(recruiterEmail));
    }

    /**
     * Get all interviews for a specific job.
     */
    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<InterviewResponse>> getInterviewsByJob(@PathVariable UUID jobId) {
        return ResponseEntity.ok(interviewService.getInterviewsByJob(jobId));
    }



    /**
     * Recruiter cancels an interview.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<InterviewResponse> cancelInterview(@PathVariable UUID id) {
        return ResponseEntity.ok(interviewService.cancelInterview(id));
    }
}
