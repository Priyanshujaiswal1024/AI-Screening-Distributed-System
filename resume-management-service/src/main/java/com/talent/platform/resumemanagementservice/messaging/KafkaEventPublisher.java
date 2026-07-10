package com.talent.platform.resumemanagementservice.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.platform.resumemanagementservice.model.OutboxEvent;
import com.talent.platform.resumemanagementservice.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaEventPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    private static final String TOPIC_RESUME_UPLOADED = "resume-uploaded";
    private static final String TOPIC_RESUME_DELETED  = "resume-deleted";

    @Transactional(propagation = Propagation.MANDATORY)
    public void publishResumeUploaded(UUID resumeId, String fileUrl, UUID recruiterId, UUID jobId) {
        Map<String, Object> event = new HashMap<>();
        event.put("resumeId",    resumeId.toString());
        event.put("fileUrl",     fileUrl);
        event.put("recruiterId", recruiterId.toString());
        if (jobId != null) {
            event.put("jobId", jobId.toString());
        }

        saveToOutbox(TOPIC_RESUME_UPLOADED, resumeId.toString(), event);
        log.info("[KafkaEventPublisher] Saved resume-uploaded to outbox: resumeId={} recruiterId={} jobId={}",
                resumeId, recruiterId, jobId);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void publishResumeDeleted(UUID resumeId) {
        Map<String, Object> event = new HashMap<>();
        event.put("resumeId", resumeId.toString());

        saveToOutbox(TOPIC_RESUME_DELETED, resumeId.toString(), event);
        log.info("[KafkaEventPublisher] Saved resume-deleted to outbox: resumeId={}", resumeId);
    }

    private void saveToOutbox(String topic, String key, Map<String, Object> payload) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(payload);
            OutboxEvent outboxEvent = new OutboxEvent(topic, key, jsonPayload);
            outboxEventRepository.save(outboxEvent);
        } catch (Exception e) {
            log.error("[KafkaEventPublisher] Failed to serialize and save outbox event: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to save outbox event", e);
        }
    }
}