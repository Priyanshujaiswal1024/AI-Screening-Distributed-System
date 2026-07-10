package com.talent.platform.resumemanagementservice.messaging;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.platform.resumemanagementservice.model.OutboxEvent;
import com.talent.platform.resumemanagementservice.repository.OutboxEventRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxPoller {

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void pollAndPublish() {
        // Query pending events, skip locked rows to allow parallel processing
        List<OutboxEvent> pendingEvents = outboxEventRepository.findPendingEventsForUpdate("PENDING", 3, 10);
        
        if (pendingEvents.isEmpty()) {
            return;
        }

        log.info("[OutboxPoller] Found {} pending outbox events to publish", pendingEvents.size());

        for (OutboxEvent event : pendingEvents) {
            try {
                // Deserialize payload JSON string back to Map
                Map<String, Object> payloadMap = objectMapper.readValue(
                        event.getPayload(),
                        new TypeReference<Map<String, Object>>() {}
                );

                // Build Kafka ProducerRecord
                ProducerRecord<String, Object> record = new ProducerRecord<>(
                        event.getTopic(),
                        event.getKey(),
                        payloadMap
                );

                // Inject event-id header for downstream idempotency matching
                record.headers().add("event-id", event.getId().toString().getBytes(StandardCharsets.UTF_8));

                // Send synchronously to ensure it reaches Kafka before updating DB status
                kafkaTemplate.send(record).get();

                event.setStatus("SENT");
                event.setProcessedAt(LocalDateTime.now());
                outboxEventRepository.save(event);

                meterRegistry.counter("outbox.published.total", "status", "success", "topic", event.getTopic()).increment();
                log.info("[OutboxPoller] Successfully published outbox event id={} to topic={}", event.getId(), event.getTopic());

            } catch (Exception e) {
                log.error("[OutboxPoller] Failed to publish outbox event id={}: {}", event.getId(), e.getMessage());
                
                int retries = event.getRetryCount() + 1;
                event.setRetryCount(retries);
                event.setErrorMessage(e.getMessage());

                if (retries >= 3) {
                    event.setStatus("FAILED");
                    log.error("[OutboxPoller] Outbox event id={} has failed after max retries.", event.getId());
                }

                outboxEventRepository.save(event);
                meterRegistry.counter("outbox.published.total", "status", "failed", "topic", event.getTopic()).increment();
            }
        }
    }
}
