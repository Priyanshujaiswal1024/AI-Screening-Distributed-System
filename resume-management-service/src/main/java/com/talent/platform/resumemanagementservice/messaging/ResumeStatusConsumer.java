package com.talent.platform.resumemanagementservice.messaging;

import com.talent.platform.resumemanagementservice.repository.ResumeRepository;
import com.talent.platform.resumemanagementservice.service.SagaOrchestrator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Consumes "resume-status-updated" events published by ai-screening-service.
 *
 * BUG FIXED:
 * Previously this worked fine in isolation, but ai-screening-service was publishing
 * a typed ResumeStatusUpdatedEvent with Jackson type headers. This consumer, expecting
 * Map<String,Object>, received the type header and Jackson threw:
 *   "Could not resolve type id 'com.talent.platform.aiscreening...ResumeStatusUpdatedEvent'"
 * → 3 retries → message dropped to DLT → resume status NEVER updated to SCREENED.
 *
 * FIX:
 * 1. This consumer correctly uses Map<String,Object> — no change needed here.
 * 2. ai-screening-service must also publish as Map (not typed class).
 *    See ai-screening-service's KafkaEventPublisher — it must use Map.of(...) the same way.
 * 3. Ensure application.yml has:
 *      spring.kafka.consumer.properties.spring.json.trusted.packages: "*"
 *      spring.kafka.consumer.value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
 *      spring.kafka.consumer.properties.spring.json.use.type.headers: false   ← KEY FIX
 *    The last property tells Jackson deserializer to IGNORE type headers and just
 *    deserialize to the target type (Map). Without this, a type header from the
 *    producer causes deserialization failure even when the consumer uses Map.
 *
 * Added: defensive null checks so a missing "status" field doesn't throw NPE.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ResumeStatusConsumer {

    private final ResumeRepository resumeRepository;
    private final SagaOrchestrator sagaOrchestrator;

    private static final List<String> ALLOWED_STATUSES =
            List.of("UPLOADED", "PARSED", "SCREENED", "FAILED");

    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 2000, multiplier = 2.0),
            dltTopicSuffix = "-dlt"
    )
    @KafkaListener(topics = "resume-status-updated", groupId = "resume-management-group")
    public void onResumeStatusUpdated(Map<String, Object> event) {

        // Defensive extraction — never assume keys exist
        Object resumeIdObj = event.get("resumeId");
        Object statusObj   = event.get("status");

        if (resumeIdObj == null || statusObj == null) {
            log.warn("[ResumeStatusConsumer] Received malformed event (missing resumeId or status): {}", event);
            return; // Don't retry malformed messages — they'll never succeed
        }

        String resumeIdStr = resumeIdObj.toString();
        String status      = statusObj.toString().toUpperCase();

        log.info("[ResumeStatusConsumer] Received: resumeId={} status={}", resumeIdStr, status);

        if (!ALLOWED_STATUSES.contains(status)) {
            log.warn("[ResumeStatusConsumer] Rejected unknown status '{}' for resume {}", status, resumeIdStr);
            return;
        }

        try {
            UUID resumeId = UUID.fromString(resumeIdStr);
            resumeRepository.findById(resumeId).ifPresentOrElse(
                    resume -> {
                        if (status.equals(resume.getStatus())) {
                            log.info("[ResumeStatusConsumer] Status already '{}' — skipping (idempotent)", status);
                            return;
                        }
                        resume.setStatus(status);
                        resumeRepository.save(resume);
                        log.info("[ResumeStatusConsumer] Updated resume {} → {}", resumeId, status);
                        
                        // Advance Saga State
                        sagaOrchestrator.advanceSaga(resumeId, status);
                    },
                    () -> log.warn("[ResumeStatusConsumer] Resume {} not found in DB", resumeId)
            );
        } catch (IllegalArgumentException e) {
            log.error("[ResumeStatusConsumer] Invalid UUID '{}': {}", resumeIdStr, e.getMessage());
            // Don't rethrow — invalid UUID will never succeed on retry, no point going to DLT via retries
        }
    }
}