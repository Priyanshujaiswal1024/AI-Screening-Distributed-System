package com.talent.platform.notificationservice.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

import java.util.Map;

import org.springframework.messaging.handler.annotation.Header;

@Component
@Slf4j
@RequiredArgsConstructor
public class NotificationConsumer {

    private final EmailService emailService;
    private final InterviewEmailService interviewEmailService;

    // FIX C3: RetryableTopic gives 3 attempts with backoff + DLQ
    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 2000, multiplier = 2.0),
            dltTopicSuffix = "-dlt"
    )
    @IdempotentConsumer(topic = "resume-uploaded")
    @KafkaListener(topics = "resume-uploaded", groupId = "notification-group")
    public void onResumeUploaded(Map<String, Object> event, @Header(value = "event-id", required = false) String eventId) {
        log.info("Resume uploaded: resumeId={}", event.get("resumeId"));
        // Could notify recruiter that upload is being processed
    }

    @RetryableTopic(attempts = "3", backoff = @Backoff(delay = 2000, multiplier = 2.0), dltTopicSuffix = "-dlt")
    @IdempotentConsumer(topic = "resume-parsed")
    @KafkaListener(topics = "resume-parsed", groupId = "notification-group")
    public void onResumeParsed(Map<String, Object> event, @Header(value = "event-id", required = false) String eventId) {
        log.info("Resume parsed: resumeId={}", event.get("resumeId"));
    }

    @RetryableTopic(attempts = "3", backoff = @Backoff(delay = 2000, multiplier = 2.0), dltTopicSuffix = "-dlt")
    @IdempotentConsumer(topic = "resume-screened")
    @KafkaListener(topics = "resume-screened", groupId = "notification-group")
    public void onResumeScreened(Map<String, Object> event, @Header(value = "event-id", required = false) String eventId) {
        String resumeId  = String.valueOf(event.get("resumeId"));
        String score     = String.valueOf(event.get("matchScore"));
        String recruiterEmail = (String) event.get("recruiterEmail");
        log.info("Resume screened: resumeId={} score={}", resumeId, score);

        if (recruiterEmail != null) {
            emailService.send(
                    recruiterEmail,
                    "Screening Complete — Resume " + resumeId,
                    "Screening is complete. Match score: " + score + "%."
            );
        }
    }

    @RetryableTopic(attempts = "3", backoff = @Backoff(delay = 2000, multiplier = 2.0), dltTopicSuffix = "-dlt")
    @IdempotentConsumer(topic = "auth-events")
    @KafkaListener(topics = "auth-events", groupId = "notification-group")
    public void onAuthEvent(Map<String, Object> event, @Header(value = "event-id", required = false) String eventId) {
        String type  = (String) event.get("eventType");
        String email = (String) event.get("email");
        log.info("Auth event received: type={} email={}", type, email);

        switch (type != null ? type : "") {
            case "SIGNUP_OTP" -> emailService.send(email,
                    "Verify your email — Talent Intelligence",
                    "Your verification OTP is: " + event.get("otp")
                            + "\n\nThis code expires in 10 minutes.");

            case "FORGOT_PASSWORD" -> emailService.send(email,
                    "Password Reset OTP — Talent Intelligence",
                    "Your password reset OTP is: " + event.get("otp")
                            + "\n\nThis code expires in 10 minutes."
                            + "\n\nIf you did not request this, please ignore this email.");

            case "PASSWORD_CHANGED" -> emailService.send(email,
                    "Password Changed — Talent Intelligence",
                    "Your password was changed successfully."
                            + "\n\nIf you did not make this change, contact support immediately.");

            default -> log.warn("Unknown auth event type: {}", type);
        }
    }

    // FIX W1: was missing — listens to user-events for welcome email
    @RetryableTopic(attempts = "3", backoff = @Backoff(delay = 2000, multiplier = 2.0), dltTopicSuffix = "-dlt")
    @IdempotentConsumer(topic = "user-events")
    @KafkaListener(topics = "user-events", groupId = "notification-group")
    public void onUserEvent(Map<String, Object> event, @Header(value = "event-id", required = false) String eventId) {
        String type  = (String) event.get("eventType");
        String email = (String) event.get("email");
        log.info("User event: type={} email={}", type, email);

        if ("RECRUITER_PROFILE_CREATED".equals(type)) {
            String company = (String) event.getOrDefault("companyName", "your company");
            emailService.send(email,
                    "Welcome to Talent Intelligence Platform!",
                    "Hello,\n\nYour recruiter profile for " + company
                            + " has been created successfully.\n\n"
                            + "You can now upload resumes and create job descriptions to start screening candidates.");
        }
    }

    // ─────────────── Interview Scheduling Notifications ───────────────

    /**
     * Triggered when a recruiter schedules an interview.
     * Sends a beautiful HTML interview invitation email to the candidate.
     */
    @RetryableTopic(attempts = "3", backoff = @Backoff(delay = 2000, multiplier = 2.0), dltTopicSuffix = "-dlt")
    @KafkaListener(topics = "interview-scheduled", groupId = "notification-group")
    public void onInterviewScheduled(Map<String, Object> event,
                                     @Header(value = "event-id", required = false) String eventId) {

        String candidateEmail = (String) event.get("candidateEmail");
        String candidateName  = (String) event.get("candidateName");
        String jobTitle       = (String) event.get("jobTitle");
        String companyName    = (String) event.getOrDefault("companyName", "Talent Intelligence Platform");
        String recruiterName  = (String) event.getOrDefault("recruiterName", "Hiring Team");
        String recruiterEmail = (String) event.getOrDefault("recruiterEmail", "");
        String interviewDate  = (String) event.get("interviewDate");
        String interviewTime  = (String) event.get("interviewTime");
        String interviewMode  = (String) event.getOrDefault("interviewMode", "ONLINE");
        String meetingLink    = (String) event.get("meetingLink");
        String notes          = (String) event.get("notes");
        String interviewId    = (String) event.get("interviewId");

        log.info("[NotificationConsumer] Interview scheduled event: candidate={} job='{}' date={}",
                candidateEmail, jobTitle, interviewDate);

        if (candidateEmail != null && !candidateEmail.isBlank()) {
            interviewEmailService.sendInterviewInvite(
                    candidateEmail, candidateName, jobTitle, companyName,
                    recruiterName, recruiterEmail, interviewDate, interviewTime,
                    interviewMode, meetingLink, notes, interviewId);
        } else {
            log.warn("[NotificationConsumer] No candidate email in interview-scheduled event — skipping");
        }
    }

    /**
     * Triggered when a candidate confirms or requests reschedule.
     * Notifies the recruiter with a status update email.
     */
    @RetryableTopic(attempts = "3", backoff = @Backoff(delay = 2000, multiplier = 2.0), dltTopicSuffix = "-dlt")
    @KafkaListener(topics = "interview-status-updated", groupId = "notification-group")
    public void onInterviewStatusUpdated(Map<String, Object> event,
                                         @Header(value = "event-id", required = false) String eventId) {

        String recruiterEmail = (String) event.get("recruiterEmail");
        String candidateName  = (String) event.getOrDefault("candidateName", "The candidate");
        String candidateEmail = (String) event.get("candidateEmail");
        String jobTitle       = (String) event.getOrDefault("jobTitle", "the position");
        String companyName    = (String) event.getOrDefault("companyName", "Talent Intelligence Platform");
        String newStatus      = (String) event.getOrDefault("newStatus", "CONFIRMED");

        log.info("[NotificationConsumer] Interview status update: candidate={} status={} recruiter={}",
                candidateName, newStatus, recruiterEmail);

        if ("CANCELLED".equals(newStatus)) {
            if (candidateEmail != null && !candidateEmail.isBlank()) {
                interviewEmailService.sendCancellationEmail(candidateEmail, candidateName, jobTitle, companyName);
            }
        } else {
            if (recruiterEmail != null && !recruiterEmail.isBlank()) {
                interviewEmailService.sendStatusUpdateToRecruiter(
                        recruiterEmail, candidateName, jobTitle, newStatus);
            }
        }
    }
}