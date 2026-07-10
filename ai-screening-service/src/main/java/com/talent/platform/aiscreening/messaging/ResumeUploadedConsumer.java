package com.talent.platform.aiscreening.messaging;

import com.talent.platform.aiscreening.service.AIScreeningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.TopicSuffixingStrategy;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * BUG FIXED (Bug A):
 *
 * BEFORE: consume(ResumeUploadedEvent event)
 *   — typed record consumer. resume-management-service now publishes as Map (our fix).
 *   — Jackson sees plain JSON {"resumeId":"...","fileUrl":"...","recruiterId":"..."}
 *     but tries to construct ResumeUploadedEvent record → MismatchedInputException
 *     → 3 retries → DLT → resume NEVER parsed → NEVER screened.
 *
 * AFTER: consume(Map<String, Object> event)
 *   — Works with Map-based publishers regardless of which service sends the event.
 *   — Defensive null checks added: a missing key won't cause NPE downstream.
 *   — UUID parsed from String explicitly (Map values always come as String from JSON).
 *
 * The canonical ResumeUploadedEvent.java record class is no longer needed as a
 * consumer parameter — it can be deleted or kept only if used elsewhere.
 */
import org.springframework.messaging.handler.annotation.Header;

@Component
@RequiredArgsConstructor
@Slf4j
public class ResumeUploadedConsumer {

    private final AIScreeningService aiScreeningService;

    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 2000, multiplier = 2.0),
            topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
            dltTopicSuffix = "-dlt"
    )
    @IdempotentConsumer(topic = "resume-uploaded")
    @KafkaListener(topics = "resume-uploaded", groupId = "ai-screening-group")
    public void consume(Map<String, Object> event, @Header(value = "event-id", required = false) String eventId) {

        // Defensive extraction — Map values from JSON are always String
        Object resumeIdObj    = event.get("resumeId");
        Object fileUrlObj     = event.get("fileUrl");
        Object recruiterIdObj = event.get("recruiterId");

        if (resumeIdObj == null || fileUrlObj == null) {
            log.warn("[AIScreeningConsumer] Malformed event — missing resumeId or fileUrl: {}", event);
            return; // Don't retry — will never succeed
        }

        String resumeIdStr    = resumeIdObj.toString();
        String fileUrl        = fileUrlObj.toString();
        String recruiterIdStr = recruiterIdObj != null ? recruiterIdObj.toString() : null;
        Object jobIdObj       = event.get("jobId");
        String jobIdStr       = jobIdObj != null ? jobIdObj.toString() : null;

        try {
            UUID resumeId    = UUID.fromString(resumeIdStr);
            UUID recruiterId = (recruiterIdStr != null && !recruiterIdStr.isBlank())
                    ? UUID.fromString(recruiterIdStr)
                    : null;
            UUID jobId       = (jobIdStr != null && !jobIdStr.isBlank())
                    ? UUID.fromString(jobIdStr)
                    : null;

            log.info("[AIScreeningConsumer] resume-uploaded: resumeId={} recruiter={} jobId={}", resumeId, recruiterId, jobId);

            aiScreeningService.processAndIndexResume(resumeId, fileUrl, recruiterId, jobId);

        } catch (IllegalArgumentException e) {
            log.error("[AIScreeningConsumer] Invalid UUID in event: resumeId='{}' recruiterId='{}' jobId='{}': {}",
                    resumeIdStr, recruiterIdStr, jobIdStr, e.getMessage());
            // Don't rethrow — bad UUID will never succeed on retry
        }
    }
}