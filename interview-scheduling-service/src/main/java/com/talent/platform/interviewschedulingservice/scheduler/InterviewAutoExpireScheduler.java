package com.talent.platform.interviewschedulingservice.scheduler;

import com.talent.platform.interviewschedulingservice.model.Interview;
import com.talent.platform.interviewschedulingservice.repository.InterviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Auto-Cancel Scheduler
 *
 * Rule: If a candidate does NOT confirm/reschedule within 5 days of invite,
 *       status → NO_RESPONSE and recruiter gets a Kafka notification email.
 *
 * Runs every 12 hours (can be tuned via cron).
 *
 * Day 0 → Invite sent   (PENDING)
 * Day 3 → Reminder email sent to candidate  (still PENDING)
 * Day 5 → No reply → status = NO_RESPONSE  → recruiter notified
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class InterviewAutoExpireScheduler {

    private final InterviewRepository interviewRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // Days after which PENDING → NO_RESPONSE
    private static final int AUTO_EXPIRE_DAYS = 5;

    // Days after which a reminder email is sent (before expiry)
    private static final int REMINDER_DAYS = 3;

    /**
     * Runs every 12 hours.
     * Checks all PENDING interviews:
     *   - Older than 3 days → send reminder email to candidate
     *   - Older than 5 days → mark NO_RESPONSE + notify recruiter
     */
    @Scheduled(fixedDelay = 43_200_000) // every 12 hours
    public void checkPendingInterviews() {
        LocalDateTime now = LocalDateTime.now();

        // ── 1. Auto-expire: PENDING > 5 days → NO_RESPONSE ───────────────────
        LocalDateTime expiryCutoff = now.minusDays(AUTO_EXPIRE_DAYS);
        List<Interview> expired = interviewRepository
                .findByStatusAndCreatedAtBefore(Interview.InterviewStatus.PENDING, expiryCutoff);

        for (Interview interview : expired) {
            try {
                interview.setStatus(Interview.InterviewStatus.NO_RESPONSE);
                interviewRepository.save(interview);

                log.info("[AutoExpire] Interview id={} candidate={} marked NO_RESPONSE after {} days",
                        interview.getId(), interview.getCandidateEmail(), AUTO_EXPIRE_DAYS);

                // Notify recruiter via Kafka → notification-service sends email
                publishNoResponseEvent(interview);

            } catch (Exception e) {
                log.error("[AutoExpire] Failed to expire interview id={}: {}", interview.getId(), e.getMessage());
            }
        }

        // ── 2. Reminder: PENDING between 3-5 days → remind candidate ─────────
        LocalDateTime reminderCutoff = now.minusDays(REMINDER_DAYS);
        List<Interview> needReminder = interviewRepository
                .findByStatusAndCreatedAtBefore(Interview.InterviewStatus.PENDING, reminderCutoff)
                .stream()
                // Exclude those already past 5 days (already expired above)
                .filter(i -> i.getCreatedAt().isAfter(expiryCutoff))
                .toList();

        for (Interview interview : needReminder) {
            try {
                log.info("[AutoReminder] Sending reminder to candidate={} for interview id={}",
                        interview.getCandidateEmail(), interview.getId());
                publishReminderEvent(interview);
            } catch (Exception e) {
                log.error("[AutoReminder] Failed to send reminder for interview id={}: {}", interview.getId(), e.getMessage());
            }
        }

        if (!expired.isEmpty() || !needReminder.isEmpty()) {
            log.info("[InterviewScheduler] Cycle done: {} expired, {} reminders sent", expired.size(), needReminder.size());
        }
    }

    // ── Kafka: Recruiter ko notify karo — candidate ne reply nahi kiya ────────
    private void publishNoResponseEvent(Interview interview) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("eventType",       "INTERVIEW_NO_RESPONSE");
        event.put("interviewId",     interview.getId().toString());
        event.put("candidateName",   interview.getCandidateName());
        event.put("candidateEmail",  interview.getCandidateEmail());
        event.put("recruiterEmail",  interview.getRecruiterEmail());
        event.put("recruiterName",   interview.getRecruiterName());
        event.put("jobTitle",        interview.getJobTitle());
        event.put("interviewDate",   interview.getInterviewDate().toString());
        event.put("daysWaited",      AUTO_EXPIRE_DAYS);
        kafkaTemplate.send("interview-status-updated", interview.getId().toString(), event);
    }

    // ── Kafka: Candidate ko reminder bhejo ───────────────────────────────────
    private void publishReminderEvent(Interview interview) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("eventType",       "INTERVIEW_REMINDER");
        event.put("interviewId",     interview.getId().toString());
        event.put("candidateName",   interview.getCandidateName());
        event.put("candidateEmail",  interview.getCandidateEmail());
        event.put("recruiterEmail",  interview.getRecruiterEmail());
        event.put("jobTitle",        interview.getJobTitle());
        event.put("interviewDate",   interview.getInterviewDate().toString());
        event.put("interviewTime",   interview.getInterviewTime().toString());
        event.put("interviewMode",   interview.getInterviewMode().name());
        event.put("meetingLink",     interview.getMeetingLink());
        kafkaTemplate.send("interview-status-updated", interview.getId().toString(), event);
    }
}
