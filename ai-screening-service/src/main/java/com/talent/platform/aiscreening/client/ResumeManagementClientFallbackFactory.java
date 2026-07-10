package com.talent.platform.aiscreening.client;

import com.talent.platform.aiscreening.dto.ResumeMetadataDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ResumeManagementClientFallbackFactory implements FallbackFactory<ResumeManagementClient> {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    public ResumeManagementClient create(Throwable cause) {
        return new ResumeManagementClient() {
            @Override
            public ResumeMetadataDto getResumeMetadata(UUID resumeId) {
                log.warn("[Fallback] Feign getResumeMetadata failed for resume={}: {}", resumeId, cause.getMessage());
                return new ResumeMetadataDto("Unknown", "unknown@email.com");
            }

            @Override
            public void updateResumeStatus(UUID resumeId, String status) {
                log.warn("[Fallback] Feign updateStatus failed for resume={}: {}. Publishing fallback status event to Kafka.", 
                        resumeId, cause.getMessage());
                try {
                    Map<String, Object> event = new HashMap<>();
                    event.put("resumeId", resumeId.toString());
                    event.put("status", status);
                    kafkaTemplate.send("resume-status-updated", resumeId.toString(), event);
                    log.info("[Fallback] Successfully published status={} event to Kafka for resume={}", status, resumeId);
                } catch (Exception ex) {
                    log.error("[Fallback] Failed to publish status event to Kafka: {}", ex.getMessage());
                }
            }

            @Override
            public List<CandidateSearchDto> searchCandidates(String skillKeyword, String candidateName, String status, int limit) {
                log.warn("[Fallback] Feign searchCandidates failed: {}", cause.getMessage());
                return new ArrayList<>();
            }

            @Override
            public CandidateInfoDto getCandidateInfo(UUID resumeId) {
                log.warn("[Fallback] Feign getCandidateInfo failed for resume={}: {}", resumeId, cause.getMessage());
                return new CandidateInfoDto(resumeId, "Unknown", "unknown@email.com");
            }
        };
    }
}
