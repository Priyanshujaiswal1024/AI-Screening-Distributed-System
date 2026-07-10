package com.talent.platform.aiscreening.messaging;

import com.talent.platform.aiscreening.service.AIScreeningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ResumeDeletedConsumer {

    private final AIScreeningService aiScreeningService;

    @KafkaListener(topics = "resume-deleted", groupId = "ai-screening-delete-group")
    public void onResumeDeleted(Map<String, Object> event) {
        String resumeIdStr = String.valueOf(event.get("resumeId"));
        log.info("[AIScreeningConsumer] Received resume-deleted event: resumeId={}", resumeIdStr);

        try {
            UUID resumeId = UUID.fromString(resumeIdStr);
            aiScreeningService.deleteVectorsAndChunks(resumeId);
            log.info("[AIScreeningConsumer] Cleaned up vectors and chunks for resumeId={}", resumeId);
        } catch (Exception e) {
            log.error("[AIScreeningConsumer] Error handling resume-deleted for resumeId={}: {}", resumeIdStr, e.getMessage());
        }
    }
}
