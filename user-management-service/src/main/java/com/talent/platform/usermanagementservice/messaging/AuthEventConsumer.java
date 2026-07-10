package com.talent.platform.usermanagementservice.messaging;

import com.talent.platform.usermanagementservice.dto.CreateRecruiterRequest;
import com.talent.platform.usermanagementservice.repository.RecruiterRepository;
import com.talent.platform.usermanagementservice.service.RecruiterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuthEventConsumer {

    private final RecruiterService recruiterService;
    private final RecruiterRepository recruiterRepository;

    /**
     * When auth-service publishes USER_REGISTERED event,
     * automatically create the recruiter profile here.
     * This keeps auth-service and user-service decoupled.
     */
    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 2000, multiplier = 2.0),
            dltTopicSuffix = "-dlt"
    )
    @IdempotentConsumer(topic = "auth-events")
    @KafkaListener(topics = "auth-events", groupId = "user-management-group")
    public void handleAuthEvent(Map<String, Object> event, @org.springframework.messaging.handler.annotation.Header(value = "event-id", required = false) String eventId) {
        String eventType = (String) event.get("eventType");
        String email     = (String) event.get("email");

        log.info("Received auth event: type={} email={}", eventType, email);

        if ("USER_REGISTERED".equals(eventType)) {
            // Only create if profile doesn't already exist
            if (recruiterRepository.existsByEmail(email)) {
                log.info("Recruiter profile already exists for: {}", email);
                return;
            }
            try {
                String companyName = (String) event.getOrDefault("companyName", "");
                // companyName is NOT NULL in DB — ensure we never persist null
                if (companyName == null || companyName.isBlank()) {
                    companyName = "Unknown Company";
                }
                recruiterService.createProfile(CreateRecruiterRequest.builder()
                        .email(email)
                        .companyName(companyName)
                        .fullName((String) event.getOrDefault("fullName", ""))
                        .build());
                log.info("Auto-created recruiter profile for: {}", email);
            } catch (Exception e) {
                log.error("Failed to create recruiter profile for {}: {}", email, e.getMessage());
                throw e; // allow RetryableTopic to retry
            }
        }
    }
}