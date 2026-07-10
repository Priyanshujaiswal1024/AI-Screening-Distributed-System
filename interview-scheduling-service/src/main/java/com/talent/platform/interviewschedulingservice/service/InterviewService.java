package com.talent.platform.interviewschedulingservice.service;

import com.talent.platform.interviewschedulingservice.dto.InterviewResponse;
import com.talent.platform.interviewschedulingservice.dto.ScheduleInterviewRequest;
import com.talent.platform.interviewschedulingservice.model.Interview;
import com.talent.platform.interviewschedulingservice.repository.InterviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("hh:mm a");

    /**
     * Schedule an interview for a single candidate.
     * Saves to DB, then publishes a Kafka event that notification-service consumes to send the email.
     */
    public InterviewResponse scheduleInterview(ScheduleInterviewRequest req, String recruiterEmail, String recruiterName) {
        Interview interview = Interview.builder()
                .candidateEmail(req.getCandidateEmail())
                .candidateName(req.getCandidateName())
                .jobTitle(req.getJobTitle())
                .companyName(req.getCompanyName() != null ? req.getCompanyName() : "Talent Intelligence Platform")
                .recruiterEmail(recruiterEmail)
                .recruiterName(recruiterName != null ? recruiterName : recruiterEmail)
                .resumeId(req.getResumeId())
                .jobId(req.getJobId())
                .interviewDate(req.getInterviewDate())
                .interviewTime(req.getInterviewTime())
                .interviewMode(req.getInterviewMode() != null ? req.getInterviewMode() : Interview.InterviewMode.ONLINE)
                .meetingLink(req.getMeetingLink())
                .notes(req.getNotes())
                .status(Interview.InterviewStatus.PENDING)
                .build();

        Interview saved = interviewRepository.save(interview);
        log.info("[InterviewService] Interview scheduled: id={} candidate={} date={}",
                saved.getId(), saved.getCandidateEmail(), saved.getInterviewDate());

        publishInterviewScheduledEvent(saved);

        return InterviewResponse.from(saved);
    }

    /**
     * Bulk schedule: schedule interviews for multiple candidates at once.
     */
    public List<InterviewResponse> scheduleBulk(List<ScheduleInterviewRequest> requests, String recruiterEmail, String recruiterName) {
        List<InterviewResponse> responses = new ArrayList<>();
        for (ScheduleInterviewRequest req : requests) {
            try {
                responses.add(scheduleInterview(req, recruiterEmail, recruiterName));
            } catch (Exception e) {
                log.error("[InterviewService] Failed to schedule for candidate={}: {}", req.getCandidateEmail(), e.getMessage());
            }
        }
        return responses;
    }

    /**
     * Get all interviews scheduled by a recruiter.
     */
    public List<InterviewResponse> getInterviewsByRecruiter(String recruiterEmail) {
        return interviewRepository.findByRecruiterEmailOrderByCreatedAtDesc(recruiterEmail)
                .stream()
                .map(InterviewResponse::from)
                .toList();
    }

    /**
     * Get all interviews for a job.
     */
    public List<InterviewResponse> getInterviewsByJob(UUID jobId) {
        return interviewRepository.findByJobIdOrderByCreatedAtDesc(jobId)
                .stream()
                .map(InterviewResponse::from)
                .toList();
    }

    /**
     * Candidate confirms their interview.
     */
    public InterviewResponse confirmInterview(UUID interviewId) {
        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new NoSuchElementException("Interview not found: " + interviewId));
        interview.setStatus(Interview.InterviewStatus.CONFIRMED);
        Interview saved = interviewRepository.save(interview);
        log.info("[InterviewService] Interview confirmed: id={} candidate={}", saved.getId(), saved.getCandidateEmail());

        // Notify recruiter that candidate confirmed
        publishStatusUpdateEvent(saved, "CONFIRMED");

        return InterviewResponse.from(saved);
    }

    /**
     * Candidate requests reschedule.
     */
    public InterviewResponse requestReschedule(UUID interviewId, String reason) {
        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new NoSuchElementException("Interview not found: " + interviewId));
        interview.setStatus(Interview.InterviewStatus.RESCHEDULE_REQUESTED);
        if (reason != null && !reason.isBlank()) {
            interview.setNotes((interview.getNotes() != null ? interview.getNotes() + "\n" : "") + "Reschedule reason: " + reason);
        }
        Interview saved = interviewRepository.save(interview);
        log.info("[InterviewService] Reschedule requested: id={} candidate={}", saved.getId(), saved.getCandidateEmail());

        publishStatusUpdateEvent(saved, "RESCHEDULE_REQUESTED");

        return InterviewResponse.from(saved);
    }

    /**
     * Cancel an interview.
     */
    public InterviewResponse cancelInterview(UUID interviewId) {
        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new NoSuchElementException("Interview not found: " + interviewId));
        interview.setStatus(Interview.InterviewStatus.CANCELLED);
        Interview saved = interviewRepository.save(interview);
        log.info("[InterviewService] Interview cancelled: id={}", saved.getId());
        
        publishStatusUpdateEvent(saved, "CANCELLED");
        
        return InterviewResponse.from(saved);
    }

    // ───────────────────────────── Private helpers ─────────────────────────────

    private void publishInterviewScheduledEvent(Interview interview) {
        try {
            Map<String, Object> event = new LinkedHashMap<>();
            event.put("eventType", "INTERVIEW_SCHEDULED");
            event.put("interviewId", interview.getId().toString());
            event.put("candidateEmail", interview.getCandidateEmail());
            event.put("candidateName", interview.getCandidateName());
            event.put("jobTitle", interview.getJobTitle());
            event.put("companyName", interview.getCompanyName());
            event.put("recruiterName", interview.getRecruiterName());
            event.put("recruiterEmail", interview.getRecruiterEmail());
            event.put("interviewDate", interview.getInterviewDate().format(DATE_FMT));
            event.put("interviewTime", interview.getInterviewTime().format(TIME_FMT));
            event.put("interviewMode", interview.getInterviewMode().name());
            event.put("meetingLink", interview.getMeetingLink());
            event.put("notes", interview.getNotes());

            kafkaTemplate.send("interview-scheduled", interview.getId().toString(), event);
            log.info("[InterviewService] Published interview-scheduled event for candidate={}", interview.getCandidateEmail());
        } catch (Exception e) {
            log.error("[InterviewService] Failed to publish Kafka event: {}", e.getMessage());
        }
    }

    private void publishStatusUpdateEvent(Interview interview, String newStatus) {
        try {
            Map<String, Object> event = new LinkedHashMap<>();
            event.put("eventType", "INTERVIEW_STATUS_UPDATED");
            event.put("interviewId", interview.getId().toString());
            event.put("candidateEmail", interview.getCandidateEmail());
            event.put("candidateName", interview.getCandidateName());
            event.put("recruiterEmail", interview.getRecruiterEmail());
            event.put("newStatus", newStatus);
            event.put("jobTitle", interview.getJobTitle());

            kafkaTemplate.send("interview-status-updated", interview.getId().toString(), event);
        } catch (Exception e) {
            log.error("[InterviewService] Failed to publish status update event: {}", e.getMessage());
        }
    }
}
