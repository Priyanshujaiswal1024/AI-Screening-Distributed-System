package com.talent.platform.authenticationservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.platform.authenticationservice.model.OutboxEvent;
import com.talent.platform.authenticationservice.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxEventPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    /**
     * Serializes event and persists it to outbox table.
     * Runs in existing transaction to guarantee atomic persistence with business logic.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void publish(String topic, String key, Map<String, Object> payload) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(payload);
            OutboxEvent outboxEvent = new OutboxEvent(topic, key, jsonPayload);
            outboxEventRepository.save(outboxEvent);
            log.info("[OutboxPublisher] Saved outbox event topic={} key={} id={}", topic, key, outboxEvent.getId());
        } catch (Exception e) {
            log.error("[OutboxPublisher] Failed to serialize and save outbox event: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to save outbox event", e);
        }
    }
}
