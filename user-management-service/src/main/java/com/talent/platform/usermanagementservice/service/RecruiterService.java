package com.talent.platform.usermanagementservice.service;

import com.talent.platform.usermanagementservice.dto.CreateRecruiterRequest;
import com.talent.platform.usermanagementservice.model.Recruiter;
import com.talent.platform.usermanagementservice.repository.RecruiterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecruiterService {

    private final RecruiterRepository recruiterRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional
    public Recruiter createProfile(CreateRecruiterRequest request) {
        // FIX W1: business logic in service, not controller
        if (recruiterRepository.existsByEmail(request.getEmail())) {
            throw new IllegalStateException("Recruiter already exists: " + request.getEmail());
        }

        Recruiter recruiter = Recruiter.builder()
                .email(request.getEmail())
                .companyName(request.getCompanyName())
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .build();

        Recruiter saved = recruiterRepository.save(recruiter);

        // FIX W2: publish Kafka event so notification-service can send welcome email
        publishEvent("RECRUITER_PROFILE_CREATED", saved.getEmail(), Map.of(
                "recruiterId", saved.getId().toString(),
                "companyName", saved.getCompanyName(),
                "fullName",    saved.getFullName() != null ? saved.getFullName() : ""
        ));

        log.info("Recruiter profile created: id={} email={}", saved.getId(), saved.getEmail());
        return saved;
    }

    public Recruiter getByEmail(String email) {
        return recruiterRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Recruiter not found: " + email));
    }

    public Recruiter getById(UUID id) {
        return recruiterRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recruiter not found: " + id));
    }

    @Transactional
    public Recruiter updateProfile(UUID id, CreateRecruiterRequest request) {
        Recruiter existing = getById(id);
        existing.setCompanyName(request.getCompanyName());
        existing.setFullName(request.getFullName());
        existing.setPhone(request.getPhone());
        Recruiter updated = recruiterRepository.save(existing);
        log.info("Recruiter profile updated: id={}", id);
        return updated;
    }

    private void publishEvent(String type, String email, Map<String, Object> extra) {
        try {
            java.util.HashMap<String, Object> event = new java.util.HashMap<>(extra);
            event.put("eventType", type);
            event.put("email", email);
            kafkaTemplate.send("user-events", email, event);
        } catch (Exception e) {
            log.warn("Failed to publish Kafka event {}: {}", type, e.getMessage());
        }
    }
}